"""FiftyComfy Panel — Python backend for the visual workflow editor."""

import uuid
import json
import time
import logging

import fiftyone.operators as foo
import fiftyone.operators.types as types
from fiftyone.operators.panel import Panel, PanelConfig

from .executor import GraphExecutor
from .nodes import get_node_registry

logger = logging.getLogger(__name__)


class FiftyComfyPanel(Panel):
    """Main panel for the FiftyComfy visual workflow editor."""

    version = "v1"

    @property
    def config(self):
        return PanelConfig(
            name="fiftycomfy_panel",
            label="FiftyComfy",
            icon="account_tree",
            surfaces="grid",
            help_markdown=(
                "Visual node-based workflow editor for FiftyOne. "
                "Build dataset curation and analysis pipelines by "
                "connecting nodes on a canvas — ComfyUI style."
            ),
        )

    def _get_store_key(self, ctx):
        """Generate unique store key for this panel instance."""
        dataset_id = str(ctx.dataset._doc.id) if ctx.dataset else "none"
        return f"fiftycomfy_{dataset_id}_{self.version}"

    def on_load(self, ctx):
        """Initialize panel state when opened."""
        ctx.panel.set_state("status", "idle")
        ctx.panel.set_state("executing", False)

    def render(self, ctx):
        """Render the panel with a custom JS component."""
        return types.Property(
            types.Object(),
            view=types.View(
                component="FiftyComfyView",
                composite_view=True,
                execute_graph=self.execute_graph,
                save_graph=self.save_graph,
                load_graphs=self.load_graphs,
                load_graph=self.load_graph,
                delete_graph=self.delete_graph,
                get_dataset_info=self.get_dataset_info,
            ),
        )

    # ------------------------------------------------------------------
    # Graph Execution
    # ------------------------------------------------------------------

    def execute_graph(self, ctx):
        """Receive serialized LiteGraph JSON and execute the graph."""
        graph_data = ctx.params.get("graph")
        if not graph_data:
            return {"status": "error", "error": "No graph data provided"}

        ctx.panel.set_state("executing", True)
        ctx.panel.set_state("status", "running")

        try:
            registry = get_node_registry()
            executor = GraphExecutor(registry)
            result = executor.execute(ctx, graph_data)
        except Exception as e:
            logger.exception("Graph execution failed")
            result = {"status": "error", "error": str(e)}

        ctx.panel.set_state("executing", False)
        ctx.panel.set_state("status", result.get("status", "complete"))

        return result

    # ------------------------------------------------------------------
    # Graph Persistence
    # ------------------------------------------------------------------

    def save_graph(self, ctx):
        """Persist a graph to the execution store."""
        store = ctx.store(self._get_store_key(ctx))
        graph_data = ctx.params.get("graph")
        name = ctx.params.get("name", "Untitled")
        graph_id = str(uuid.uuid4())

        entry = {
            "id": graph_id,
            "name": name,
            "graph": graph_data,
            "saved_at": time.time(),
        }

        # Validate JSON-serializability
        try:
            json.dumps(entry)
        except (TypeError, ValueError) as e:
            return {"status": "error", "error": f"Cannot serialize graph: {e}"}

        store.set(f"graph_{graph_id}", entry)

        # Update index
        index = store.get("graph_index") or []
        index.append({"id": graph_id, "name": name, "saved_at": entry["saved_at"]})
        store.set("graph_index", index)

        return {"status": "ok", "graph_id": graph_id}

    def load_graphs(self, ctx):
        """List all saved graphs for the current dataset."""
        store = ctx.store(self._get_store_key(ctx))
        index = store.get("graph_index") or []
        return {"graphs": index}

    def load_graph(self, ctx):
        """Load a specific saved graph by ID."""
        store = ctx.store(self._get_store_key(ctx))
        graph_id = ctx.params.get("graph_id")
        if not graph_id:
            return {"status": "error", "error": "No graph_id provided"}

        entry = store.get(f"graph_{graph_id}")
        if not entry:
            return {"status": "error", "error": f"Graph {graph_id} not found"}

        return {"status": "ok", "data": entry}

    def delete_graph(self, ctx):
        """Remove a saved graph."""
        store = ctx.store(self._get_store_key(ctx))
        graph_id = ctx.params.get("graph_id")
        if not graph_id:
            return {"status": "error", "error": "No graph_id provided"}

        store.delete(f"graph_{graph_id}")

        # Update index
        index = store.get("graph_index") or []
        index = [g for g in index if g["id"] != graph_id]
        store.set("graph_index", index)

        return {"status": "ok"}

    # ------------------------------------------------------------------
    # Dataset Info (for dynamic widget population)
    # ------------------------------------------------------------------

    def get_dataset_info(self, ctx):
        """Return schema info for populating dynamic widgets on the frontend."""
        if not ctx.dataset:
            return {"fields": [], "label_fields": [], "saved_views": [], "tags": []}

        schema = ctx.dataset.get_field_schema()
        fields = list(schema.keys())

        label_fields = []
        for k, v in schema.items():
            if hasattr(v, "document_type"):
                label_fields.append(k)

        try:
            saved_views = ctx.dataset.list_saved_views()
        except Exception:
            saved_views = []

        try:
            tags = ctx.dataset.distinct("tags")
        except Exception:
            tags = []

        return {
            "fields": fields,
            "label_fields": label_fields,
            "saved_views": saved_views,
            "tags": tags,
        }
