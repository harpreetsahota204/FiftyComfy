"""Graph topological sort and execution engine for FiftyComfy."""

import logging
from collections import deque

logger = logging.getLogger(__name__)

PLUGIN_NAMESPACE = "@harpreetsahota/FiftyComfy"


class GraphExecutor:
    """Execute a LiteGraph-serialized graph topologically."""

    def __init__(self, node_registry):
        self.registry = node_registry

    def execute(self, ctx, graph_data):
        """
        Execute a serialized LiteGraph graph.

        Args:
            ctx: FiftyOne panel execution context
            graph_data: Serialized LiteGraph JSON with `nodes` and `links`

        Returns:
            dict with execution status and any results
        """
        nodes = {n["id"]: n for n in graph_data.get("nodes", [])}
        links = graph_data.get("links", [])

        if not nodes:
            return {"status": "error", "error": "Graph has no nodes"}

        # ----- Build adjacency -----
        children = {nid: [] for nid in nodes}
        parents = {nid: [] for nid in nodes}

        # LiteGraph link format: [link_id, origin_id, origin_slot, target_id, target_slot, type]
        link_map = {}  # link_id -> (origin_id, origin_slot)
        for link in links:
            link_id, origin_id, origin_slot, target_id, target_slot, link_type = link
            link_map[link_id] = (origin_id, origin_slot)
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
            return {"status": "error", "error": "Graph contains a cycle"}

        # ----- Execute nodes in topological order -----
        results = {}  # node_id -> output value
        failed_nodes = set()  # nodes that failed or were skipped
        execution_results = {}  # node_id -> result summary

        for node_id in execution_order:
            node = nodes[node_id]
            node_type = node.get("type", "")
            properties = node.get("properties", {})

            # Also extract widget values if present
            if "widgets_values" in node:
                properties = self._merge_widget_values(node, properties)

            # Check if any parent failed — skip this node
            parent_failed = any(p in failed_nodes for p in parents[node_id])
            if parent_failed:
                failed_nodes.add(node_id)
                self._send_status(ctx, node_id, "skipped")
                continue

            # Send "running" status
            self._send_status(ctx, node_id, "running")

            try:
                # Resolve input: pick the first connected parent's output
                input_view = None
                if parents[node_id]:
                    # Use the first parent that has a result
                    for parent_id in parents[node_id]:
                        if parent_id in results and results[parent_id] is not None:
                            input_view = results[parent_id]
                            break

                # Look up handler and execute
                handler = self.registry.get_handler(node_type)
                if handler is None:
                    raise ValueError(f"No handler registered for node type: {node_type}")

                output = handler.execute(input_view, properties, ctx)
                results[node_id] = output

                # For aggregation/display nodes, send result back
                display_result = None
                if handler.category == "aggregations":
                    display_result = output

                self._send_status(ctx, node_id, "complete", result=display_result)
                execution_results[node_id] = {
                    "status": "complete",
                    "type": node_type,
                }

            except Exception as e:
                logger.exception(f"Node {node_id} ({node_type}) failed: {e}")
                failed_nodes.add(node_id)
                self._send_status(ctx, node_id, "error", error=str(e))
                execution_results[node_id] = {
                    "status": "error",
                    "type": node_type,
                    "error": str(e),
                }
                # Continue executing independent branches — don't break

        # Send final execution summary
        ctx.trigger(
            f"{PLUGIN_NAMESPACE}/execution_complete",
            {
                "status": "complete",
                "total_nodes": len(nodes),
                "completed": sum(
                    1
                    for r in execution_results.values()
                    if r["status"] == "complete"
                ),
                "failed": len(failed_nodes),
            },
        )

        return {
            "status": "complete",
            "results": execution_results,
        }

    def _send_status(self, ctx, node_id, status, result=None, error=None):
        """Send a per-node status update to the frontend."""
        payload = {"node_id": node_id, "status": status}
        if result is not None:
            payload["result"] = result
        if error is not None:
            payload["error"] = error

        try:
            ctx.trigger(f"{PLUGIN_NAMESPACE}/node_status_update", payload)
        except Exception:
            logger.debug(f"Could not send status for node {node_id}")

    def _merge_widget_values(self, node, properties):
        """
        LiteGraph stores widget values in `widgets_values` array.
        Merge them into properties based on widget order.
        We keep existing properties and overlay widget values.
        """
        # Properties from the serialized graph take priority;
        # widgets_values is a fallback for values not in properties
        merged = dict(properties)
        # We don't know widget names from just the array, so properties wins
        return merged
