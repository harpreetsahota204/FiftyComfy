"""Source node handlers — entry points for FiftyComfy graphs."""

from . import NodeHandler


class LoadDatasetHandler(NodeHandler):
    """Use the dataset currently loaded in the FiftyOne App."""

    node_type = "FiftyComfy/Source/Current Dataset"
    category = "source"

    def execute(self, input_view, params, ctx):
        return ctx.dataset.view()


class LoadSavedViewHandler(NodeHandler):
    """Load a named saved view from the dataset."""

    node_type = "FiftyComfy/Source/Load Saved View"
    category = "source"

    def execute(self, input_view, params, ctx):
        view_name = params.get("view_name", "")
        if not view_name:
            raise ValueError("No saved view name specified")
        return ctx.dataset.load_saved_view(view_name)


# All handlers in this module, for auto-registration
HANDLERS = [
    LoadDatasetHandler(),
    LoadSavedViewHandler(),
]
