"""
FiftyComfy — Visual node-based workflow editor for FiftyOne.

A ComfyUI-style canvas for composing dataset curation and analysis
pipelines without writing code.
"""

import fiftyone.operators as foo

from .panel import FiftyComfyPanel
from .executor import GraphExecutor


class ExecuteGraphOperator(foo.Operator):
    """Operator to execute a FiftyComfy graph (triggered by the panel)."""

    @property
    def config(self):
        return foo.OperatorConfig(
            name="execute_graph",
            label="Execute FiftyComfy Graph",
            description="Execute a visual workflow graph",
            unlisted=True,
            execute_as_generator=True,
            allow_immediate_execution=True,
        )

    def execute(self, ctx):
        from .nodes import get_node_registry

        graph_data = ctx.params.get("graph")
        if not graph_data:
            yield {"status": "error", "error": "No graph data"}
            return

        registry = get_node_registry()
        executor = GraphExecutor(registry)
        result = executor.execute(ctx, graph_data)

        yield result


def register(p):
    """Register all FiftyComfy components with the FiftyOne plugin system."""
    p.register(FiftyComfyPanel)
    p.register(ExecuteGraphOperator)
