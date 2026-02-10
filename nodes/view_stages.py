"""View-stage node handlers — filter, sort, and transform FiftyOne views."""

import fiftyone as fo
from . import NodeHandler


# ---------------------------------------------------------------------------
# Safe expression evaluator
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
    "len": len,
    "list": list,
    "abs": abs,
}


def safe_eval(expr_str: str):
    """Evaluate a FiftyOne ViewExpression string in a restricted namespace."""
    try:
        return eval(expr_str, {"__builtins__": {}}, SAFE_NAMESPACE)
    except Exception as e:
        raise ValueError(f"Invalid expression: {expr_str!r} — {e}")


# ---------------------------------------------------------------------------
# Handler classes
# ---------------------------------------------------------------------------


class MatchHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Match"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        expr = safe_eval(params["expression"])
        return input_view.match(expr)


class FilterLabelsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Filter Labels"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        expr = safe_eval(params["expression"])
        return input_view.filter_labels(
            params["field"],
            expr,
            only_matches=params.get("only_matches", True),
        )


class SortByHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Sort By"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        return input_view.sort_by(
            params["field"],
            reverse=params.get("reverse", False),
        )


class LimitHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Limit"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        return input_view.limit(int(params["count"]))


class ExistsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Exists"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        return input_view.exists(
            params["field"],
            bool=params.get("bool", True),
        )


class MatchTagsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Match Tags"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        tags = params.get("tags", "")
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        return input_view.match_tags(tags)


class TakeHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Take"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        seed = params.get("seed")
        if seed is not None and seed != "":
            seed = int(seed)
        else:
            seed = None
        return input_view.take(int(params["count"]), seed=seed)


class ShuffleHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Shuffle"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        seed = params.get("seed")
        if seed is not None and seed != "":
            seed = int(seed)
        else:
            seed = None
        return input_view.shuffle(seed=seed)


class SelectFieldsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Select Fields"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        fields = params.get("fields", "")
        if isinstance(fields, str):
            fields = [f.strip() for f in fields.split(",") if f.strip()]
        return input_view.select_fields(fields)


class ExcludeFieldsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Exclude Fields"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        fields = params.get("fields", "")
        if isinstance(fields, str):
            fields = [f.strip() for f in fields.split(",") if f.strip()]
        return input_view.exclude_fields(fields)


# All handlers in this module
HANDLERS = [
    MatchHandler(),
    FilterLabelsHandler(),
    SortByHandler(),
    LimitHandler(),
    ExistsHandler(),
    MatchTagsHandler(),
    TakeHandler(),
    ShuffleHandler(),
    SelectFieldsHandler(),
    ExcludeFieldsHandler(),
]
