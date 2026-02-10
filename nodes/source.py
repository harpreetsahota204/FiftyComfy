"""Source nodes — produce the initial view that flows through the graph."""

from . import NodeHandler, register_node


@register_node
class DatasetSource(NodeHandler):
    node_type = "source/dataset"
    label = "Current Dataset"
    category = "source"
    description = "Uses the dataset currently loaded in the App"
    color = "#3B82F6"
    inputs = []
    outputs = ["view"]
    params_schema = {}

    def validate(self, params: dict) -> list[str]:
        return []

    def execute(self, input_view, params: dict, ctx):
        return ctx.dataset.view()


@register_node
class SavedViewSource(NodeHandler):
    node_type = "source/saved_view"
    label = "Load Saved View"
    category = "source"
    description = "Loads a previously saved view from the dataset"
    color = "#3B82F6"
    inputs = []
    outputs = ["view"]
    params_schema = {
        "view_name": {
            "type": "enum",
            "label": "Saved View",
            "values": [],  # populated dynamically
            "default": None,
            "required": True,
            "dynamic": True,
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("view_name"):
            errors.append("'Saved View' is required")
        return errors

    def execute(self, input_view, params: dict, ctx):
        view_name = params["view_name"]
        return ctx.dataset.load_saved_view(view_name)

    def get_dynamic_options(self, param_name: str, ctx):
        if param_name == "view_name":
            if ctx.dataset:
                return ctx.dataset.list_saved_views()
        return None
