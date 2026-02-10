"""
Node registry and base class for FiftyComfy workflow nodes.

Each node type implements a handler that defines its metadata,
parameter schema, validation, and execution logic.
"""

from typing import Any, Optional
import fiftyone as fo


# ---------------------------------------------------------------------------
# Safe expression evaluation
# ---------------------------------------------------------------------------

SAFE_NAMESPACE = {
    "F": fo.ViewField,
    "ViewField": fo.ViewField,
    "True": True,
    "False": False,
    "None": None,
    "int": int,
    "float": float,
    "str": str,
    "list": list,
    "dict": dict,
    "len": len,
}


def safe_eval_expression(expr_str: str):
    """Evaluate a FiftyOne ViewExpression string safely."""
    if not expr_str or not expr_str.strip():
        raise ValueError("Expression cannot be empty")
    try:
        return eval(expr_str, {"__builtins__": {}}, SAFE_NAMESPACE)
    except Exception as e:
        raise ValueError(f"Invalid expression: {expr_str!r} — {e}")


def validate_expression(expr_str: str) -> Optional[str]:
    """Validate an expression string. Returns error message or None."""
    try:
        safe_eval_expression(expr_str)
        return None
    except ValueError as e:
        return str(e)


# ---------------------------------------------------------------------------
# Base node handler
# ---------------------------------------------------------------------------


class NodeHandler:
    """Base class for all node handlers."""

    node_type: str = ""
    label: str = ""
    category: str = ""
    description: str = ""
    color: str = "#6B7280"
    inputs: list[str] = []
    outputs: list[str] = []
    params_schema: dict[str, dict] = {}

    def get_metadata(self) -> dict:
        """Return the node type metadata for the frontend registry."""
        return {
            "type": self.node_type,
            "label": self.label,
            "category": self.category,
            "description": self.description,
            "color": self.color,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "params_schema": self.params_schema,
        }

    def validate(self, params: dict) -> list[str]:
        """Return list of validation errors, or empty list if valid."""
        errors = []
        for name, schema in self.params_schema.items():
            if schema.get("required", False) and not params.get(name):
                errors.append(f"'{schema.get('label', name)}' is required")
        return errors

    def execute(self, input_view, params: dict, ctx) -> Any:
        """Execute the node and return output (view, result, or None)."""
        raise NotImplementedError(
            f"Node handler {self.node_type} must implement execute()"
        )

    def get_dynamic_options(self, param_name: str, ctx) -> Optional[list]:
        """
        For dynamic enum fields, return available options based on current
        dataset schema. Returns None if the param is not dynamic.
        """
        return None


# ---------------------------------------------------------------------------
# Node registry
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, NodeHandler] = {}


def register_node(handler_class: type[NodeHandler]):
    """Register a node handler class."""
    handler = handler_class()
    _REGISTRY[handler.node_type] = handler
    return handler_class


def get_handler(node_type: str) -> NodeHandler:
    """Get a registered node handler by type."""
    if node_type not in _REGISTRY:
        raise ValueError(f"Unknown node type: {node_type}")
    return _REGISTRY[node_type]


def get_all_handlers() -> dict[str, NodeHandler]:
    """Get all registered node handlers."""
    return dict(_REGISTRY)


def get_node_catalog() -> list[dict]:
    """Get the full node catalog for the frontend."""
    return [handler.get_metadata() for handler in _REGISTRY.values()]


def get_field_names(ctx, field_types=None) -> list[str]:
    """Helper to get field names from the current dataset schema."""
    if not ctx.dataset:
        return []
    schema = ctx.dataset.get_field_schema(flat=True)
    if field_types:
        return [
            name
            for name, field in schema.items()
            if any(isinstance(field, ft) for ft in field_types)
        ]
    return list(schema.keys())


def get_label_fields(ctx) -> list[str]:
    """Get label field names from the dataset."""
    if not ctx.dataset:
        return []
    import fiftyone.core.labels as fol

    schema = ctx.dataset.get_field_schema(flat=True)
    return [
        name
        for name, field_obj in schema.items()
        if hasattr(field_obj, "document_type")
        and field_obj.document_type is not None
        and issubclass(field_obj.document_type, fol.Label)
    ]


def get_numeric_fields(ctx) -> list[str]:
    """Get numeric field names from the dataset."""
    if not ctx.dataset:
        return []
    import fiftyone.core.fields as fof

    schema = ctx.dataset.get_field_schema(flat=True)
    return [
        name
        for name, field_obj in schema.items()
        if isinstance(field_obj, (fof.IntField, fof.FloatField))
    ]


# ---------------------------------------------------------------------------
# Import all node modules to trigger registration
# ---------------------------------------------------------------------------

from . import source  # noqa: E402, F401
from . import view_stages  # noqa: E402, F401
from . import brain  # noqa: E402, F401
from . import aggregations  # noqa: E402, F401
from . import output  # noqa: E402, F401
