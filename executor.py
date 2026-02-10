"""
Graph execution engine for FiftyComfy.

Validates the graph, computes topological execution order,
and runs each node with progress reporting back to the frontend.
"""

import time
import traceback
from collections import deque
from typing import Any, Optional

from .graph_models import Graph, GraphNode, ValidationError
from .nodes import get_handler


PLUGIN_URI = "@harpreetsahota/FiftyComfy"


class GraphExecutor:
    """Validates and executes a FiftyComfy workflow graph."""

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, graph: Graph) -> list[ValidationError]:
        """Run all validation checks. Returns list of errors (empty = valid)."""
        errors = []
        errors.extend(self._validate_has_nodes(graph))
        errors.extend(self._validate_source_nodes(graph))
        errors.extend(self._validate_connectivity(graph))
        errors.extend(self._validate_acyclicity(graph))
        errors.extend(self._validate_type_compatibility(graph))
        errors.extend(self._validate_params(graph))
        return errors

    def _validate_has_nodes(self, graph: Graph) -> list[ValidationError]:
        if not graph.nodes:
            return [ValidationError(node_id=None, message="Graph has no nodes")]
        return []

    def _validate_source_nodes(self, graph: Graph) -> list[ValidationError]:
        """Exactly one source node must exist."""
        sources = [n for n in graph.nodes if n.type.startswith("source/")]
        if len(sources) == 0:
            return [
                ValidationError(
                    node_id=None,
                    message="Graph must have at least one source node (Dataset or Saved View)",
                )
            ]
        if len(sources) > 1:
            return [
                ValidationError(
                    node_id=sources[1].id,
                    message="Graph must have exactly one source node — found multiple",
                )
            ]
        return []

    def _validate_connectivity(self, graph: Graph) -> list[ValidationError]:
        """Every non-source node must have at least one incoming edge."""
        errors = []
        node_ids = {n.id for n in graph.nodes}
        target_ids = {e.target for e in graph.edges}

        for node in graph.nodes:
            if node.type.startswith("source/"):
                continue
            if node.id not in target_ids:
                errors.append(
                    ValidationError(
                        node_id=node.id,
                        message=f"Node '{node.id}' has no incoming connection",
                    )
                )
        return errors

    def _validate_acyclicity(self, graph: Graph) -> list[ValidationError]:
        """Check for cycles using Kahn's algorithm."""
        # Build adjacency & in-degree
        in_degree = {n.id: 0 for n in graph.nodes}
        adjacency: dict[str, list[str]] = {n.id: [] for n in graph.nodes}

        for edge in graph.edges:
            if edge.source in adjacency and edge.target in in_degree:
                adjacency[edge.source].append(edge.target)
                in_degree[edge.target] += 1

        queue = deque(nid for nid, deg in in_degree.items() if deg == 0)
        visited = 0

        while queue:
            nid = queue.popleft()
            visited += 1
            for child in adjacency.get(nid, []):
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

        if visited != len(graph.nodes):
            return [
                ValidationError(
                    node_id=None,
                    message="Graph contains a cycle — workflows must be acyclic (DAG)",
                )
            ]
        return []

    def _validate_type_compatibility(self, graph: Graph) -> list[ValidationError]:
        """Check that connected nodes have compatible handle types."""
        errors = []
        for edge in graph.edges:
            source_node = graph.get_node(edge.source)
            target_node = graph.get_node(edge.target)
            if not source_node or not target_node:
                continue

            try:
                source_handler = get_handler(source_node.type)
                target_handler = get_handler(target_node.type)
            except ValueError:
                continue  # Unknown node types caught elsewhere

            # Check that source produces something the target can consume
            if source_handler.outputs and target_handler.inputs:
                source_outputs = set(source_handler.outputs)
                target_inputs = set(target_handler.inputs)
                if not source_outputs.intersection(target_inputs):
                    errors.append(
                        ValidationError(
                            node_id=target_node.id,
                            message=(
                                f"Incompatible connection: '{source_handler.label}' "
                                f"outputs {source_handler.outputs} but "
                                f"'{target_handler.label}' expects {target_handler.inputs}"
                            ),
                        )
                    )

            # Aggregation/output nodes shouldn't receive from nodes with no outputs
            if not source_handler.outputs and target_handler.inputs:
                errors.append(
                    ValidationError(
                        node_id=target_node.id,
                        message=(
                            f"'{source_handler.label}' is a terminal node and cannot "
                            f"feed into '{target_handler.label}'"
                        ),
                    )
                )

        return errors

    def _validate_params(self, graph: Graph) -> list[ValidationError]:
        """Validate that each node's required params are filled and valid."""
        errors = []
        for node in graph.nodes:
            try:
                handler = get_handler(node.type)
            except ValueError:
                errors.append(
                    ValidationError(
                        node_id=node.id,
                        message=f"Unknown node type: '{node.type}'",
                    )
                )
                continue

            node_errors = handler.validate(node.params)
            for err_msg in node_errors:
                errors.append(
                    ValidationError(node_id=node.id, message=err_msg)
                )

        return errors

    # ------------------------------------------------------------------
    # Topological Sort
    # ------------------------------------------------------------------

    def topological_sort(self, graph: Graph) -> list[GraphNode]:
        """Return nodes in topological execution order (Kahn's algorithm)."""
        in_degree = {n.id: 0 for n in graph.nodes}
        adjacency: dict[str, list[str]] = {n.id: [] for n in graph.nodes}

        for edge in graph.edges:
            if edge.source in adjacency and edge.target in in_degree:
                adjacency[edge.source].append(edge.target)
                in_degree[edge.target] += 1

        queue = deque(nid for nid, deg in in_degree.items() if deg == 0)
        order: list[str] = []

        while queue:
            nid = queue.popleft()
            order.append(nid)
            for child in adjacency.get(nid, []):
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

        # Map back to node objects
        node_map = {n.id: n for n in graph.nodes}
        return [node_map[nid] for nid in order if nid in node_map]

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def execute(self, ctx, graph: Graph) -> dict:
        """
        Execute the full graph.

        Returns a dict with:
          - status: "complete" | "validation_error" | "execution_error"
          - errors: list of error dicts (if validation_error)
          - results: dict of node_id -> result (if complete)
        """
        # 1. Validate
        errors = self.validate(graph)
        if errors:
            return {
                "status": "validation_error",
                "errors": [e.to_dict() for e in errors],
            }

        # 2. Topological sort
        execution_order = self.topological_sort(graph)

        # 3. Mark all nodes as pending
        for node in execution_order:
            self._notify_status(ctx, node.id, "pending")

        # 4. Execute in order
        results: dict[str, Any] = {}
        node_outputs: dict[str, Any] = {}  # node_id -> view or result

        for node in execution_order:
            self._notify_status(ctx, node.id, "running")
            start_time = time.time()

            try:
                handler = get_handler(node.type)

                # Get input view from parent node(s)
                input_view = self._resolve_input(node, graph, node_outputs, ctx)

                # Execute
                output = handler.execute(input_view, node.params, ctx)

                duration_ms = int((time.time() - start_time) * 1000)
                node_outputs[node.id] = output

                # Determine what result to send to frontend
                result_payload = self._make_result_payload(output, handler)
                results[node.id] = result_payload

                self._notify_status(
                    ctx,
                    node.id,
                    "complete",
                    result=result_payload,
                    duration_ms=duration_ms,
                )

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                error_msg = str(e)
                tb = traceback.format_exc()
                print(f"[FiftyComfy] Error executing node {node.id}: {error_msg}")
                print(tb)

                self._notify_status(
                    ctx,
                    node.id,
                    "error",
                    error=error_msg,
                    duration_ms=duration_ms,
                )

                # Mark downstream nodes as skipped
                self._skip_downstream(ctx, node.id, graph, execution_order)
                # Continue to next independent branch (don't break entirely)
                continue

        # 5. Notify completion
        ctx.trigger(
            f"{PLUGIN_URI}/execution_complete",
            {"status": "complete", "node_count": len(execution_order)},
        )

        return {"status": "complete", "results": results}

    def _resolve_input(
        self,
        node: GraphNode,
        graph: Graph,
        node_outputs: dict[str, Any],
        ctx,
    ) -> Any:
        """Resolve the input view for a node from its parent's output."""
        if node.type.startswith("source/"):
            return None  # Source nodes don't have inputs

        parents = graph.get_parents(node.id)
        if not parents:
            return None

        # Use the first parent's output as the input view
        parent_id = parents[0]
        parent_output = node_outputs.get(parent_id)

        if parent_output is None:
            raise ValueError(
                f"Parent node '{parent_id}' has no output — "
                f"it may have failed or been skipped"
            )

        # If parent output is a dict (aggregation result), it's not a view
        # In that case, we need to look up the chain for the last view
        if isinstance(parent_output, dict):
            raise ValueError(
                f"Cannot use output of aggregation/terminal node as input — "
                f"aggregation nodes don't pass views forward"
            )

        return parent_output

    def _make_result_payload(self, output: Any, handler) -> Optional[dict]:
        """Create a serializable result payload for the frontend."""
        if isinstance(output, dict):
            # Already a result dict (aggregation, output nodes)
            return output

        # For view outputs, return sample count
        if hasattr(output, "count"):
            try:
                return {"type": "view", "count": output.count()}
            except Exception:
                return {"type": "view"}

        return None

    def _notify_status(
        self,
        ctx,
        node_id: str,
        status: str,
        result: Any = None,
        error: str = None,
        duration_ms: int = None,
        progress: float = None,
        message: str = None,
    ):
        """Send a node status update to the frontend via ctx.trigger."""
        payload = {
            "node_id": node_id,
            "status": status,
        }
        if result is not None:
            payload["result"] = result
        if error is not None:
            payload["error"] = error
        if duration_ms is not None:
            payload["duration_ms"] = duration_ms
        if progress is not None:
            payload["progress"] = progress
        if message is not None:
            payload["message"] = message

        ctx.trigger(f"{PLUGIN_URI}/node_status_update", payload)

    def _skip_downstream(
        self,
        ctx,
        failed_node_id: str,
        graph: Graph,
        execution_order: list[GraphNode],
    ):
        """Mark all downstream nodes of a failed node as skipped."""
        # BFS to find all reachable downstream nodes
        visited = set()
        queue = deque([failed_node_id])

        while queue:
            nid = queue.popleft()
            for child_id in graph.get_children(nid):
                if child_id not in visited:
                    visited.add(child_id)
                    queue.append(child_id)
                    self._notify_status(
                        ctx,
                        child_id,
                        "skipped",
                        message=f"Skipped due to error in upstream node",
                    )
