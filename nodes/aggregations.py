"""Aggregation node handlers — compute statistics on FiftyOne views."""

from . import NodeHandler


class CountHandler(NodeHandler):
    node_type = "FiftyComfy/Aggregations/Count"
    category = "aggregations"

    def execute(self, input_view, params, ctx):
        return input_view.count()


class CountValuesHandler(NodeHandler):
    node_type = "FiftyComfy/Aggregations/Count Values"
    category = "aggregations"

    def execute(self, input_view, params, ctx):
        field = params.get("field", "")
        if not field:
            raise ValueError("No field specified for Count Values")
        return dict(input_view.count_values(field))


class DistinctHandler(NodeHandler):
    node_type = "FiftyComfy/Aggregations/Distinct"
    category = "aggregations"

    def execute(self, input_view, params, ctx):
        field = params.get("field", "")
        if not field:
            raise ValueError("No field specified for Distinct")
        return input_view.distinct(field)


class BoundsHandler(NodeHandler):
    node_type = "FiftyComfy/Aggregations/Bounds"
    category = "aggregations"

    def execute(self, input_view, params, ctx):
        field = params.get("field", "")
        if not field:
            raise ValueError("No field specified for Bounds")
        return list(input_view.bounds(field))


# All handlers in this module
HANDLERS = [
    CountHandler(),
    CountValuesHandler(),
    DistinctHandler(),
    BoundsHandler(),
]
