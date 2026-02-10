"""
FiftyComfy Panel — Python backend for the hybrid panel.

Handles graph execution, validation, persistence (save/load),
and dynamic node schema resolution. The React frontend communicates
with this panel via usePanelEvent() and useOperatorExecutor().
"""

import uuid
from datetime import datetime

import fiftyone as fo
import fiftyone.operators as foo
from fiftyone.operators import types

from .graph_models import Graph
from .executor import GraphExecutor
from .nodes import get_node_catalog, get_handler


PLUGIN_URI = "@harpreetsahota/FiftyComfy"


# ======================================================================
# Panel
# ======================================================================


class FiftyComfyPanel(foo.Panel):
    """Main FiftyComfy panel — composite view backed by React."""

    version = "v1"

    @property
    def config(self):
        return foo.PanelConfig(
            name="fiftycomfy",
            label="FiftyComfy",
            surfaces="grid",
            allow_multiple=False,
            icon="/assets/icon.svg",
        )

    def _get_store_key(self, ctx):
        dataset_id = str(ctx.dataset._doc.id) if ctx.dataset else "global"
        return f"fiftycomfy_store_{dataset_id}_{self.version}"

    # ------------------------------------------------------------------
    # Panel lifecycle
    # ------------------------------------------------------------------

    def on_load(self, ctx):
        """Initialize panel state when it opens."""
        ctx.panel.state.set("executing", False)
        ctx.panel.state.set("node_catalog", get_node_catalog())

    def render(self, ctx):
        """
        Render a composite React component. The actual UI is fully
        handled by the JavaScript side — this just mounts it.
        """
        panel = types.Object()
        panel.view(
            "fiftycomfy_canvas",
            types.View(
                component="FiftyComfyView",
                composite_view=True,
            ),
        )
        return types.Property(panel)

    # ------------------------------------------------------------------
    # Frontend-callable methods (via usePanelEvent)
    # ------------------------------------------------------------------

    def on_execute_graph(self, ctx):
        """Execute a graph sent from the frontend."""
        graph_data = ctx.params.get("graph", {})
        graph = Graph.from_dict(graph_data)

        executor = GraphExecutor()
        result = executor.execute(ctx, graph)
        return result

    def on_validate_graph(self, ctx):
        """Validate a graph without executing it."""
        graph_data = ctx.params.get("graph", {})
        graph = Graph.from_dict(graph_data)

        executor = GraphExecutor()
        errors = executor.validate(graph)

        if errors:
            return {
                "valid": False,
                "errors": [e.to_dict() for e in errors],
            }
        return {"valid": True, "errors": []}

    def on_save_graph(self, ctx):
        """Save a graph to the execution store."""
        store = ctx.store(self._get_store_key(ctx))
        graph_data = ctx.params.get("graph", {})

        graph_id = graph_data.get("id") or str(uuid.uuid4())
        graph_data["id"] = graph_id
        graph_data["updated_at"] = datetime.utcnow().isoformat() + "Z"

        if not graph_data.get("created_at"):
            graph_data["created_at"] = graph_data["updated_at"]

        # Store the graph
        store.set(f"graph_{graph_id}", graph_data)

        # Update index
        index = store.get("graph_index") or []
        # Remove old entry for this id
        index = [g for g in index if g.get("id") != graph_id]
        index.append(
            {
                "id": graph_id,
                "name": graph_data.get("name", "Untitled"),
                "description": graph_data.get("description", ""),
                "updated_at": graph_data["updated_at"],
                "node_count": len(graph_data.get("nodes", [])),
            }
        )
        store.set("graph_index", index)

        return {"graph_id": graph_id, "saved": True}

    def on_load_graphs(self, ctx):
        """List all saved graphs for this dataset."""
        store = ctx.store(self._get_store_key(ctx))
        index = store.get("graph_index") or []
        return {"graphs": index}

    def on_load_graph(self, ctx):
        """Load a specific saved graph."""
        store = ctx.store(self._get_store_key(ctx))
        graph_id = ctx.params.get("graph_id")
        if not graph_id:
            return {"error": "graph_id is required"}

        graph_data = store.get(f"graph_{graph_id}")
        if not graph_data:
            return {"error": f"Graph '{graph_id}' not found"}

        return {"graph": graph_data}

    def on_delete_graph(self, ctx):
        """Delete a saved graph."""
        store = ctx.store(self._get_store_key(ctx))
        graph_id = ctx.params.get("graph_id")
        if not graph_id:
            return {"error": "graph_id is required"}

        store.delete(f"graph_{graph_id}")

        # Update index
        index = store.get("graph_index") or []
        index = [g for g in index if g.get("id") != graph_id]
        store.set("graph_index", index)

        return {"deleted": True}

    def on_get_node_defaults(self, ctx):
        """Get default params and dynamic options for a node type."""
        node_type = ctx.params.get("node_type")
        if not node_type:
            return {"error": "node_type is required"}

        try:
            handler = get_handler(node_type)
        except ValueError as e:
            return {"error": str(e)}

        metadata = handler.get_metadata()

        # Resolve dynamic options
        for param_name, param_schema in metadata["params_schema"].items():
            if param_schema.get("dynamic"):
                options = handler.get_dynamic_options(param_name, ctx)
                if options is not None:
                    param_schema["values"] = options

        return {"metadata": metadata}

    def on_get_node_catalog(self, ctx):
        """Return the full node catalog with dynamic options resolved."""
        catalog = get_node_catalog()

        # Resolve dynamic options for all nodes
        for node_meta in catalog:
            try:
                handler = get_handler(node_meta["type"])
                for param_name, param_schema in node_meta["params_schema"].items():
                    if param_schema.get("dynamic"):
                        options = handler.get_dynamic_options(param_name, ctx)
                        if options is not None:
                            param_schema["values"] = options
            except ValueError:
                pass

        return {"catalog": catalog}


# ======================================================================
# Operators (for frontend → backend calls that need operator semantics)
# ======================================================================


class ExecuteGraphOperator(foo.Operator):
    """Operator wrapper for graph execution (allows delegated execution)."""

    @property
    def config(self):
        return foo.OperatorConfig(
            name="execute_graph",
            label="Execute Graph",
            description="Execute a FiftyComfy workflow graph",
            dynamic=True,
            execute_as_generator=True,
            unlisted=True,
        )

    def resolve_input(self, ctx):
        inputs = types.Object()
        inputs.str("graph_json", label="Graph JSON", required=True)
        return types.Property(inputs)

    def execute(self, ctx):
        import json

        graph_json = ctx.params.get("graph_json", "{}")
        graph_data = json.loads(graph_json) if isinstance(graph_json, str) else graph_json
        graph = Graph.from_dict(graph_data)

        executor = GraphExecutor()
        result = executor.execute(ctx, graph)

        yield result


class ValidateGraphOperator(foo.Operator):
    """Operator for pre-flight graph validation."""

    @property
    def config(self):
        return foo.OperatorConfig(
            name="validate_graph",
            label="Validate Graph",
            description="Validate a FiftyComfy workflow graph",
            unlisted=True,
        )

    def resolve_input(self, ctx):
        inputs = types.Object()
        inputs.str("graph_json", label="Graph JSON", required=True)
        return types.Property(inputs)

    def execute(self, ctx):
        import json

        graph_json = ctx.params.get("graph_json", "{}")
        graph_data = json.loads(graph_json) if isinstance(graph_json, str) else graph_json
        graph = Graph.from_dict(graph_data)

        executor = GraphExecutor()
        errors = executor.validate(graph)

        if errors:
            return {"valid": False, "errors": [e.to_dict() for e in errors]}
        return {"valid": True, "errors": []}
