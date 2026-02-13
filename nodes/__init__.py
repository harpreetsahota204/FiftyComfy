"""
Node registry and base handler class for FiftyComfy.

Each node handler maps a LiteGraph node type string to a Python
execution function.
"""

import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared FQN constants — used by GetDatasetInfo AND handler validation
# ---------------------------------------------------------------------------

# Label types that support filter_labels / match_labels
LABEL_FQNS = {
    "fiftyone.core.labels.Classification",
    "fiftyone.core.labels.Classifications",
    "fiftyone.core.labels.Detections",
    "fiftyone.core.labels.Polylines",
    "fiftyone.core.labels.Keypoints",
}

# Subset that supports to_patches() and evaluate_detections()
PATCHES_FQNS = {
    "fiftyone.core.labels.Detections",
    "fiftyone.core.labels.Polylines",
    "fiftyone.core.labels.Keypoints",
}

# Detection-type fields (for evaluate_detections)
DETECTION_FQNS = {
    "fiftyone.core.labels.Detections",
    "fiftyone.core.labels.Polylines",
    "fiftyone.core.labels.Keypoints",
}

# Classification-type fields (for evaluate_classifications)
CLASSIFICATION_FQNS = {
    "fiftyone.core.labels.Classification",
    "fiftyone.core.labels.Classifications",
}

# Keypoint-type fields (for filter_keypoints)
KEYPOINT_FQNS = {
    "fiftyone.core.labels.Keypoints",
}

# Segmentation-type fields (for evaluate_segmentations)
SEGMENTATION_FQNS = {
    "fiftyone.core.labels.Segmentation",
}

# Regression-type fields (for evaluate_regressions)
REGRESSION_FQNS = {
    "fiftyone.core.labels.Regression",
}

# Map FQN -> sub-field path for distinct label queries
LABEL_PATH_MAP = {
    "fiftyone.core.labels.Detections": "detections.label",
    "fiftyone.core.labels.Polylines": "polylines.label",
    "fiftyone.core.labels.Keypoints": "keypoints.label",
    "fiftyone.core.labels.Classifications": "classifications.label",
    "fiftyone.core.labels.Classification": "label",
}


def get_field_fqn(field):
    """Get the fully qualified name of a field's document_type."""
    doc_type = getattr(field, "document_type", None)
    if doc_type is None:
        return None
    return f"{doc_type.__module__}.{doc_type.__name__}"


def require_field_type(ctx, field_name, allowed_fqns, node_title):
    """Verify a dataset field exists and is one of the allowed types.

    Raises ValueError with a clear message if the field is missing or
    has the wrong type.
    """
    if not field_name:
        raise ValueError(f"'{node_title}' — no field specified")

    schema = ctx.dataset.get_field_schema()
    if field_name not in schema:
        raise ValueError(
            f"'{node_title}' — field '{field_name}' does not exist on "
            f"this dataset"
        )

    fqn = get_field_fqn(schema[field_name])

    # For non-embedded fields (e.g., StringField, FloatField) fqn is None
    if fqn is None and allowed_fqns:
        allowed_names = [f.split(".")[-1] for f in allowed_fqns]
        raise ValueError(
            f"'{node_title}' — field '{field_name}' is not one of the "
            f"required types: {', '.join(allowed_names)}"
        )

    if fqn not in allowed_fqns:
        actual_name = fqn.split(".")[-1] if fqn else "unknown"
        allowed_names = [f.split(".")[-1] for f in allowed_fqns]
        raise ValueError(
            f"'{node_title}' — field '{field_name}' is {actual_name}, "
            f"but this node requires: {', '.join(allowed_names)}"
        )


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
