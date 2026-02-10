"""Output node handlers — push results back to the FiftyOne App."""

from . import NodeHandler


class SetAppViewHandler(NodeHandler):
    """Push the resulting view into the FiftyOne App grid."""

    node_type = "FiftyComfy/Output/Set App View"
    category = "output"

    def execute(self, input_view, params, ctx):
        if input_view is None:
            raise ValueError("No view connected to Set App View node")
        ctx.ops.set_view(input_view)
        return None


class SaveViewHandler(NodeHandler):
    """Save the view as a named saved view on the dataset."""

    node_type = "FiftyComfy/Output/Save View"
    category = "output"

    def execute(self, input_view, params, ctx):
        if input_view is None:
            raise ValueError("No view connected to Save View node")

        name = params.get("name", "my_view")
        description = params.get("description", "")
        overwrite = params.get("overwrite", False)

        ctx.dataset.save_view(
            name,
            input_view,
            description=description,
            overwrite=overwrite,
        )
        return None


# All handlers in this module
HANDLERS = [
    SetAppViewHandler(),
    SaveViewHandler(),
]
