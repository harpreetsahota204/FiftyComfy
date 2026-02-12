"""
Node registry and base handler class for FiftyComfy.

Each node handler maps a LiteGraph node type string to a Python
execution function.
"""

import logging

logger = logging.getLogger(__name__)


class NodeHandler:
    """Base class for all FiftyComfy node handlers."""

    node_type: str = ""
    category: str = ""

    def execute(self, input_view, params: dict, ctx):
        """
        Execute the node.

        Args:
            input_view: The FiftyOne DatasetView coming from the upstream node,
                        or None for source nodes.
            params: Dict of node properties/widget values from LiteGraph.
            ctx: FiftyOne execution context (provides dataset, ops, trigger, etc.)

        Returns:
            A FiftyOne DatasetView for pipeline nodes, or a scalar/dict for
            aggregation/display nodes.
        """
        raise NotImplementedError(
            f"Handler for {self.node_type} has not implemented execute()"
        )


class NodeRegistry:
    """Registry that maps LiteGraph node type strings to Python handlers."""

    def __init__(self):
        self._handlers: dict[str, NodeHandler] = {}

    def register(self, handler: NodeHandler):
        """Register a node handler instance."""
        self._handlers[handler.node_type] = handler

    def get_handler(self, node_type: str) -> NodeHandler | None:
        """Look up a handler by LiteGraph node type string."""
        return self._handlers.get(node_type)

    def list_types(self) -> list[str]:
        """Return all registered node type strings."""
        return list(self._handlers.keys())


# ---------------------------------------------------------------------------
# Singleton registry — built on first access
# ---------------------------------------------------------------------------

_registry: NodeRegistry | None = None


def get_node_registry() -> NodeRegistry:
    """Return the singleton node registry, auto-registering all handlers."""
    global _registry
    if _registry is not None:
        return _registry

    _registry = NodeRegistry()

    # Import and register all handler modules
    from .source import HANDLERS as source_handlers
    from .view_stages import HANDLERS as view_stage_handlers
    from .brain import HANDLERS as brain_handlers
    from .model import HANDLERS as model_handlers
    from .evaluation import HANDLERS as evaluation_handlers
    from .aggregations import HANDLERS as aggregation_handlers
    from .output import HANDLERS as output_handlers

    all_handlers = (
        source_handlers
        + view_stage_handlers
        + brain_handlers
        + model_handlers
        + evaluation_handlers
        + aggregation_handlers
        + output_handlers
    )

    for handler in all_handlers:
        _registry.register(handler)
        logger.debug(f"Registered node handler: {handler.node_type}")

    logger.info(
        f"FiftyComfy: Registered {len(all_handlers)} node handlers"
    )

    return _registry
