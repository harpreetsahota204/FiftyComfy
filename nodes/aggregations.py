"""Aggregation nodes — compute statistics and display results inline."""

from . import NodeHandler, register_node, get_field_names


@register_node
class CountNode(NodeHandler):
    node_type = "aggregation/count"
    label = "Count"
    category = "aggregation"
    description = "Count samples in the view"
    color = "#F59E0B"
    inputs = ["view"]
    outputs = []  # Terminal node — no outgoing view
    params_schema = {}

    def validate(self, params: dict) -> list[str]:
        return []

    def execute(self, input_view, params: dict, ctx):
        count = input_view.count()
        return {"type": "count", "value": count}


@register_node
class CountValuesNode(NodeHandler):
    node_type = "aggregation/count_values"
    label = "Count Values"
    category = "aggregation"
    description = "Count occurrences of each value in a field"
    color = "#F59E0B"
    inputs = ["view"]
    outputs = []  # Terminal node
    params_schema = {
        "field": {
            "type": "enum",
            "label": "Field",
            "values": [],
            "default": None,
            "required": True,
            "dynamic": True,
            "description": "Field to count values for",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("field"):
            errors.append("'Field' is required")
        return errors

    def execute(self, input_view, params: dict, ctx):
        field_name = params["field"]
        counts = input_view.count_values(field_name)
        # Convert OrderedDict to sorted list for frontend display
        items = [{"value": str(k), "count": v} for k, v in counts.items()]
        items.sort(key=lambda x: x["count"], reverse=True)
        return {
            "type": "count_values",
            "field": field_name,
            "total_unique": len(items),
            "items": items[:20],  # Top 20 for display
        }

    def get_dynamic_options(self, param_name: str, ctx):
        if param_name == "field":
            return get_field_names(ctx)
        return None
