"""Output nodes — produce side effects (set App view, save view, etc.)."""

from . import NodeHandler, register_node


@register_node
class SetAppViewNode(NodeHandler):
    node_type = "output/set_app_view"
    label = "Set App View"
    category = "output"
    description = "Push the resulting view back into the FiftyOne App's grid"
    color = "#F43F5E"
    inputs = ["view"]
    outputs = []  # Terminal
    params_schema = {}

    def validate(self, params: dict) -> list[str]:
        return []

    def execute(self, input_view, params: dict, ctx):
        ctx.ops.set_view(input_view)
        return {"type": "set_app_view", "message": "View updated in App"}


@register_node
class SaveViewNode(NodeHandler):
    node_type = "output/save_view"
    label = "Save View"
    category = "output"
    description = "Save the view as a saved view on the dataset"
    color = "#F43F5E"
    inputs = ["view"]
    outputs = []  # Terminal
    params_schema = {
        "name": {
            "type": "string",
            "label": "View Name",
            "default": "",
            "required": True,
            "description": "Name for the saved view",
        },
        "description": {
            "type": "string",
            "label": "Description",
            "default": "",
            "required": False,
            "description": "Optional description for the saved view",
        },
        "overwrite": {
            "type": "bool",
            "label": "Overwrite",
            "default": False,
            "required": False,
            "description": "Overwrite if name exists",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("name"):
            errors.append("'View Name' is required")
        return errors

    def execute(self, input_view, params: dict, ctx):
        name = params["name"]
        description = params.get("description", "")
        overwrite = params.get("overwrite", False)

        ctx.dataset.save_view(
            name, input_view, description=description, overwrite=overwrite
        )
        return {"type": "save_view", "message": f"View saved as '{name}'"}
