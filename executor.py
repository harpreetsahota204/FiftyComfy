"""Graph topological sort and execution engine for FiftyComfy.

This is a generator — it yields ctx.ops/ctx.trigger calls that get
forwarded through the ExecuteGraph operator's execute() generator.
Only yielded calls actually take effect in the FiftyOne App.
"""

import logging
from collections import deque

logger = logging.getLogger(__name__)


def _validate_properties(properties, node_title):
    """Raise ValueError if any property contains a placeholder dropdown value.

    The JS combo widgets use strings like "(no label fields)" or
    "(no saved views)" when the dataset has no matching entries.
    These are real selectable values in LiteGraph, so they arrive
    here as property values and would produce cryptic errors
    downstream (e.g., "Field '(no label fields)' not found").
    Catch them early with a clear message.
    """
    for key, value in properties.items():
        if isinstance(value, str) and value.startswith("(no ") and value.endswith(")"):
            raise ValueError(
                f"'{node_title}' — '{key}' has no valid selection: {value}. "
                f"Please ensure your dataset has the required fields."
            )


class GraphExecutor:
    """Execute a LiteGraph-serialized graph topologically."""

    def __init__(self, node_registry):
        self.registry = node_registry

    def execute(self, ctx, graph_data):
        nodes = {n["id"]: n for n in graph_data.get("nodes", [])}
        links = graph_data.get("links", [])

        if not nodes:
            return

        # ----- Build adjacency -----
        children = {nid: [] for nid in nodes}
        parents = {nid: [] for nid in nodes}

        for link in links:
            link_id, origin_id, origin_slot, target_id, target_slot, link_type = link
            if origin_id in nodes and target_id in nodes:
                children[origin_id].append(target_id)
                parents[target_id].append(origin_id)

        # ----- Topological sort (Kahn's algorithm) -----
        in_degree = {nid: len(set(parents[nid])) for nid in nodes}
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        execution_order = []

        while queue:
            nid = queue.popleft()
            execution_order.append(nid)
            visited_children = set()
            for child in children[nid]:
                if child not in visited_children:
                    visited_children.add(child)
                    in_degree[child] -= 1
                    if in_degree[child] == 0:
                        queue.append(child)

        if len(execution_order) != len(nodes):
            yield ctx.ops.notify("Graph contains a cycle!", variant="error")
            return

        # ----- Execute each node -----
        results = {}
        failed_nodes = set()
        total = len(execution_order)
        final_view = None  # Track the last view for Set App View
        set_view_count = 0  # Track multiple Set App View nodes

        for idx, node_id in enumerate(execution_order):
            node = nodes[node_id]
            node_type = node.get("type", "")
            properties = node.get("properties", {})

            if "widgets_values" in node:
                properties = dict(properties)

            # Skip if parent failed
            if any(p in failed_nodes for p in parents[node_id]):
                failed_nodes.add(node_id)
                continue

            # Progress
            node_title = node_type.split("/")[-1] if "/" in node_type else node_type
            yield ctx.ops.set_progress(
                progress=(idx / total),
                label=f"Running: {node_title} ({idx + 1}/{total})",
            )

            try:
                # Get input view from parent
                input_view = None
                for parent_id in parents.get(node_id, []):
                    if parent_id in results and results[parent_id] is not None:
                        input_view = results[parent_id]
                        break

                handler = self.registry.get_handler(node_type)
                if handler is None:
                    raise ValueError(f"No handler for: {node_type}")

                # Guard: non-source nodes must have an input view
                if input_view is None and handler.category != "source":
                    raise ValueError(
                        f"No input connected — connect a Source node "
                        f"upstream of '{node_title}'"
                    )

                _validate_properties(properties, node_title)
                output = handler.execute(input_view, properties, ctx)
                results[node_id] = output

                # If this is a "Set App View" node, remember the view
                if node_type == "FiftyComfy/Output/Set App View" and output is not None:
                    if final_view is not None:
                        set_view_count += 1
                    final_view = output

                logger.info(f"Node {node_id} ({node_type}) complete")

            except Exception as e:
                logger.exception(f"Node {node_id} ({node_type}) failed: {e}")
                failed_nodes.add(node_id)
                yield ctx.ops.notify(
                    f"Node '{node_title}' failed: {e}",
                    variant="error",
                )

        # ----- Dismiss the progress bar -----
        yield ctx.ops.set_progress(progress=1, label="Complete")

        # ----- Apply the view to the App (this is the critical step!) -----
        if final_view is not None:
            yield ctx.ops.set_view(view=final_view)

        # Warn if multiple Set App View nodes were used
        if set_view_count > 0:
            yield ctx.ops.notify(
                f"Multiple 'Set App View' nodes detected — only the "
                f"last one in execution order was applied.",
                variant="warning",
            )

        # Summary notification
        completed = total - len(failed_nodes)
        if failed_nodes:
            yield ctx.ops.notify(
                f"Workflow done: {completed}/{total} nodes succeeded",
                variant="warning",
            )
        else:
            yield ctx.ops.notify(
                f"Workflow complete! {completed} nodes executed.",
                variant="success",
            )

        yield ctx.ops.reload_dataset()
