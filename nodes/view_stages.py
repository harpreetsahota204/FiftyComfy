"""View stage nodes — receive a view and return a transformed view."""

from . import (
    NodeHandler,
    register_node,
    safe_eval_expression,
    validate_expression,
    get_field_names,
    get_label_fields,
)


@register_node
class MatchNode(NodeHandler):
    node_type = "view_stage/match"
    label = "Match"
    category = "view_stage"
    description = "Filter samples by a ViewExpression"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "expression": {
            "type": "string",
            "label": "Expression",
            "default": "",
            "required": True,
            "placeholder": 'F("confidence") > 0.9',
            "description": "A FiftyOne ViewExpression, e.g. F('confidence') > 0.9",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = super().validate(params)
        expr = params.get("expression", "")
        if expr:
            err = validate_expression(expr)
            if err:
                errors.append(err)
        return errors

    def execute(self, input_view, params: dict, ctx):
        expr = safe_eval_expression(params["expression"])
        return input_view.match(expr)


@register_node
class MatchTagsNode(NodeHandler):
    node_type = "view_stage/match_tags"
    label = "Match Tags"
    category = "view_stage"
    description = "Filter samples that have specific tags"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "tags": {
            "type": "list",
            "item_type": "string",
            "label": "Tags",
            "default": [],
            "required": True,
            "description": "Tags to match",
        },
        "all": {
            "type": "bool",
            "label": "Require All Tags",
            "default": False,
            "required": False,
            "description": "Require all tags (True) or any tag (False)",
        },
        "bool": {
            "type": "bool",
            "label": "Include Matching",
            "default": True,
            "required": False,
            "description": "Include (True) or exclude (False) matching samples",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        tags = params.get("tags", [])
        if not tags:
            errors.append("'Tags' is required — provide at least one tag")
        return errors

    def execute(self, input_view, params: dict, ctx):
        tags = params["tags"]
        match_all = params.get("all", False)
        include = params.get("bool", True)
        return input_view.match_tags(tags, all=match_all, bool=include)


@register_node
class FilterLabelsNode(NodeHandler):
    node_type = "view_stage/filter_labels"
    label = "Filter Labels"
    category = "view_stage"
    description = "Filter detections/classifications within a label field"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "field": {
            "type": "enum",
            "label": "Label Field",
            "values": [],
            "default": None,
            "required": True,
            "dynamic": True,
            "description": "Label field to filter",
        },
        "expression": {
            "type": "string",
            "label": "Expression",
            "default": "",
            "required": True,
            "placeholder": 'F("confidence") > 0.5',
            "description": "Filter expression for labels",
        },
        "only_matches": {
            "type": "bool",
            "label": "Only Matches",
            "default": True,
            "required": False,
            "description": "Only keep samples with at least one matching label",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("field"):
            errors.append("'Label Field' is required")
        expr = params.get("expression", "")
        if not expr:
            errors.append("'Expression' is required")
        elif expr:
            err = validate_expression(expr)
            if err:
                errors.append(err)
        return errors

    def execute(self, input_view, params: dict, ctx):
        field_name = params["field"]
        expr = safe_eval_expression(params["expression"])
        only_matches = params.get("only_matches", True)
        return input_view.filter_labels(field_name, expr, only_matches=only_matches)

    def get_dynamic_options(self, param_name: str, ctx):
        if param_name == "field":
            return get_label_fields(ctx)
        return None


@register_node
class SortByNode(NodeHandler):
    node_type = "view_stage/sort_by"
    label = "Sort By"
    category = "view_stage"
    description = "Sort samples by a field"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "field": {
            "type": "enum",
            "label": "Field",
            "values": [],
            "default": None,
            "required": True,
            "dynamic": True,
            "description": "Field to sort by",
        },
        "reverse": {
            "type": "bool",
            "label": "Descending",
            "default": False,
            "required": False,
            "description": "Sort in descending order",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("field"):
            errors.append("'Field' is required")
        return errors

    def execute(self, input_view, params: dict, ctx):
        return input_view.sort_by(params["field"], reverse=params.get("reverse", False))

    def get_dynamic_options(self, param_name: str, ctx):
        if param_name == "field":
            return get_field_names(ctx)
        return None


@register_node
class LimitNode(NodeHandler):
    node_type = "view_stage/limit"
    label = "Limit"
    category = "view_stage"
    description = "Limit the number of samples"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "count": {
            "type": "int",
            "label": "Count",
            "default": 100,
            "required": True,
            "min": 1,
            "description": "Maximum number of samples",
        },
    }

    def execute(self, input_view, params: dict, ctx):
        return input_view.limit(int(params["count"]))


@register_node
class ExistsNode(NodeHandler):
    node_type = "view_stage/exists"
    label = "Exists"
    category = "view_stage"
    description = "Filter to samples where a field exists (or doesn't)"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "field": {
            "type": "enum",
            "label": "Field",
            "values": [],
            "default": None,
            "required": True,
            "dynamic": True,
            "description": "Field to check",
        },
        "bool": {
            "type": "bool",
            "label": "Exists",
            "default": True,
            "required": False,
            "description": "Exists (True) or doesn't exist (False)",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("field"):
            errors.append("'Field' is required")
        return errors

    def execute(self, input_view, params: dict, ctx):
        return input_view.exists(params["field"], bool=params.get("bool", True))

    def get_dynamic_options(self, param_name: str, ctx):
        if param_name == "field":
            return get_field_names(ctx)
        return None


@register_node
class TakeNode(NodeHandler):
    node_type = "view_stage/take"
    label = "Random Sample"
    category = "view_stage"
    description = "Randomly sample N items from the view"
    color = "#10B981"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "count": {
            "type": "int",
            "label": "Count",
            "default": 100,
            "required": True,
            "min": 1,
            "description": "Number of samples to take",
        },
        "seed": {
            "type": "int",
            "label": "Random Seed",
            "default": None,
            "required": False,
            "description": "Random seed for reproducibility",
        },
    }

    def execute(self, input_view, params: dict, ctx):
        count = int(params["count"])
        seed = params.get("seed")
        if seed is not None:
            seed = int(seed)
        return input_view.take(count, seed=seed)
