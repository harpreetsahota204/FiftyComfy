"""Graph topological sort and execution engine for FiftyComfy."""

import logging
from collections import deque

logger = logging.getLogger(__name__)


class GraphExecutor:
    """Execute a LiteGraph-serialized graph topologically."""

    def __init__(self, node_registry):
        self.registry = node_registry

    def execute(self, ctx, graph_data):
        """
        Execute a serialized LiteGraph graph.

        This is a generator that yields ctx.ops/ctx.trigger calls
        for progress reporting and App updates.

        Args:
            ctx: FiftyOne operator execution context
            graph_data: Serialized LiteGraph JSON with `nodes` and `links`

        Yields:
            Progress updates and final result
        """
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

        # ----- Execute nodes in topological order -----
        results = {}
        failed_nodes = set()
        total = len(execution_order)

        for idx, node_id in enumerate(execution_order):
            node = nodes[node_id]
            node_type = node.get("type", "")
            properties = node.get("properties", {})

            # Merge widgets_values into properties
            if "widgets_values" in node:
                properties = self._merge_widget_values(node, properties)

            # Skip if parent failed
            parent_failed = any(p in failed_nodes for p in parents[node_id])
            if parent_failed:
                failed_nodes.add(node_id)
                continue

            # Report progress
            node_title = node_type.split("/")[-1] if "/" in node_type else node_type
            yield ctx.ops.set_progress(
                progress=(idx / total),
                label=f"Running: {node_title} ({idx + 1}/{total})",
            )

            try:
                # Resolve input from parent
                input_view = None
                if parents[node_id]:
                    for parent_id in parents[node_id]:
                        if parent_id in results and results[parent_id] is not None:
                            input_view = results[parent_id]
                            break

                # Look up handler
                handler = self.registry.get_handler(node_type)
                if handler is None:
                    raise ValueError(f"No handler for: {node_type}")

                output = handler.execute(input_view, properties, ctx)
                results[node_id] = output

                logger.info(f"Node {node_id} ({node_type}) complete")

            except Exception as e:
                logger.exception(f"Node {node_id} ({node_type}) failed: {e}")
                failed_nodes.add(node_id)
                yield ctx.ops.notify(
                    f"Node '{node_title}' failed: {e}",
                    variant="error",
                )

        # Final progress
        completed = total - len(failed_nodes)
        if failed_nodes:
            yield ctx.ops.notify(
                f"Workflow done: {completed}/{total} nodes succeeded, {len(failed_nodes)} failed",
                variant="warning",
            )
        else:
            yield ctx.ops.notify(
                f"Workflow complete! {completed} nodes executed.",
                variant="success",
            )

        # Reload dataset to reflect any changes
        yield ctx.ops.reload_dataset()

    def _merge_widget_values(self, node, properties):
        """Merge widget values into properties."""
        merged = dict(properties)
        return merged
