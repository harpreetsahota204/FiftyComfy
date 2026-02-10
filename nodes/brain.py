"""Brain node handlers — FiftyOne Brain computations."""

import logging
from . import NodeHandler

logger = logging.getLogger(__name__)


class ComputeEmbeddingsHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Embeddings"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        model = params.get("model", "clip-vit-base32-torch")
        field = params.get("embeddings_field", "embeddings")
        fob.compute_embeddings(input_view, model, embeddings_field=field)
        return input_view


class ComputeVisualizationHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Visualization"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        kwargs = {
            "brain_key": params.get("brain_key", "visualization"),
            "method": params.get("method", "umap"),
            "num_dims": int(params.get("num_dims", 2)),
        }
        embeddings = params.get("embeddings", "")
        if embeddings:
            kwargs["embeddings"] = embeddings
        fob.compute_visualization(input_view, **kwargs)
        return input_view


class ComputeSimilarityHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Similarity"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        kwargs = {"brain_key": params.get("brain_key", "similarity")}
        if params.get("embeddings"):
            kwargs["embeddings"] = params["embeddings"]
        if params.get("backend"):
            kwargs["backend"] = params["backend"]
        fob.compute_similarity(input_view, **kwargs)
        return input_view


class ComputeUniquenessHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Uniqueness"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        kwargs = {
            "uniqueness_field": params.get("uniqueness_field", "uniqueness")
        }
        if params.get("embeddings"):
            kwargs["embeddings"] = params["embeddings"]
        fob.compute_uniqueness(input_view, **kwargs)
        return input_view


class ComputeRepresentativenessHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Representativeness"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        kwargs = {
            "representativeness_field": params.get(
                "representativeness_field", "representativeness"
            ),
            "method": params.get("method", "cluster-center"),
        }
        if params.get("embeddings"):
            kwargs["embeddings"] = params["embeddings"]
        fob.compute_representativeness(input_view, **kwargs)
        return input_view


class ComputeMistakennessHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Mistakenness"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        fob.compute_mistakenness(
            input_view,
            params["pred_field"],
            params["label_field"],
        )
        return input_view


class ComputeHardnessHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Compute Hardness"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        fob.compute_hardness(input_view, params["label_field"])
        return input_view


class ComputeExactDuplicatesHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Find Exact Duplicates"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        fob.compute_exact_duplicates(input_view)
        return input_view


class ComputeNearDuplicatesHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Find Near Duplicates"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        kwargs = {}
        if params.get("threshold"):
            kwargs["threshold"] = float(params["threshold"])
        if params.get("embeddings"):
            kwargs["embeddings"] = params["embeddings"]
        fob.compute_near_duplicates(input_view, **kwargs)
        return input_view


class ComputeLeakySplitsHandler(NodeHandler):
    node_type = "FiftyComfy/Brain/Detect Leaky Splits"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        splits = params.get("splits", "train,test")
        if isinstance(splits, str):
            splits = [s.strip() for s in splits.split(",") if s.strip()]
        kwargs = {"splits": splits}
        if params.get("threshold"):
            kwargs["threshold"] = float(params["threshold"])
        fob.compute_leaky_splits(input_view, **kwargs)
        return input_view


# All handlers in this module
HANDLERS = [
    ComputeEmbeddingsHandler(),
    ComputeVisualizationHandler(),
    ComputeSimilarityHandler(),
    ComputeUniquenessHandler(),
    ComputeRepresentativenessHandler(),
    ComputeMistakennessHandler(),
    ComputeHardnessHandler(),
    ComputeExactDuplicatesHandler(),
    ComputeNearDuplicatesHandler(),
    ComputeLeakySplitsHandler(),
]
