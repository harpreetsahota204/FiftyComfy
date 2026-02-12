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


class MatchLabelsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Match Labels"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        kwargs = {}
        field = params.get("field", "")
        if field:
            kwargs["fields"] = field
        filter_expr = params.get("filter", "")
        if filter_expr:
            kwargs["filter"] = safe_eval(filter_expr)
        kwargs["bool"] = params.get("bool", True)
        return input_view.match_labels(**kwargs)


class SortBySimilarityHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Sort By Similarity"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        brain_key = params.get("brain_key", "similarity")
        k = params.get("k")
        if k is not None and k != "" and k != 0:
            k = int(k)
        else:
            k = None
        reverse = params.get("reverse", False)
        return input_view.sort_by_similarity(
            brain_key,
            k=k,
            reverse=reverse,
        )


class ToPatchesHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/To Patches"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        field = params.get("field", "")
        if not field:
            raise ValueError("No label field specified for To Patches")
        return input_view.to_patches(field)


class MapLabelsHandler(NodeHandler):
    node_type = "FiftyComfy/View Stages/Map Labels"
    category = "view_stage"

    def execute(self, input_view, params, ctx):
        import json

        field = params.get("field", "")
        if not field:
            raise ValueError("No label field specified for Map Labels")

        map_str = params.get("map", "{}")
        try:
            label_map = json.loads(map_str)
        except Exception:
            # Fall back to safe_eval for Python dict literals
            label_map = safe_eval(map_str)

        if not isinstance(label_map, dict):
            raise ValueError(
                f"Map must be a dict, got {type(label_map).__name__}"
            )

        return input_view.map_labels(field, label_map)


# All handlers in this module
HANDLERS = [
    MatchHandler(),
    FilterLabelsHandler(),
    MatchLabelsHandler(),
    SortByHandler(),
    SortBySimilarityHandler(),
    LimitHandler(),
    MatchTagsHandler(),
    TakeHandler(),
    ShuffleHandler(),
    ToPatchesHandler(),
    MapLabelsHandler(),
]
