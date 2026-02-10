"""FiftyComfy Panel — Python panel that renders the JS LiteGraph canvas."""

import fiftyone.operators as foo
import fiftyone.operators.types as types


class FiftyComfyPanel(foo.Panel):
    @property
    def config(self):
        return foo.PanelConfig(
            name="fiftycomfy_panel",
            label="FiftyComfy",
            icon="account_tree",
            surfaces="grid",
            help_markdown=(
                "Visual node-based workflow editor for FiftyOne. "
                "Build dataset curation and analysis pipelines by "
                "connecting nodes on a canvas."
            ),
        )

    def render(self, ctx):
        """Render the panel using the JS FiftyComfyView component."""
        panel = types.Object()
        return types.Property(
            panel,
            view=types.View(component="FiftyComfyView"),
        )
