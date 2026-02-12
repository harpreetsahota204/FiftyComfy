"""Brain node handlers — FiftyOne Brain computations.

Cross-referenced against: https://docs.voxel51.com/brain.html
"""

import logging
from . import NodeHandler

logger = logging.getLogger(__name__)


class ComputeEmbeddingsHandler(NodeHandler):
    """Compute embeddings using a zoo model.

    compute_embeddings() is a method on the dataset/view, NOT on fiftyone.brain.
    Ref: https://docs.voxel51.com/brain.html#embedding-methods
    """

    node_type = "FiftyComfy/Brain/Compute Embeddings"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.zoo as foz

        model_name = params.get("model", "clip-vit-base32-torch")
        field = params.get("embeddings_field", "embeddings")

        model = foz.load_zoo_model(model_name)
        input_view.compute_embeddings(model, embeddings_field=field)
        return input_view


class ComputeVisualizationHandler(NodeHandler):
    """Compute UMAP/t-SNE/PCA embedding visualization.

    Ref: https://docs.voxel51.com/brain.html#visualizing-embeddings
    """

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
    """Create a similarity index for nearest-neighbor queries.

    Ref: https://docs.voxel51.com/brain.html#similarity
    """

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
    """Compute a uniqueness score for each sample.

    Ref: https://docs.voxel51.com/brain.html#image-uniqueness
    """

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
    """Score how representative each sample is of its neighborhood.

    Ref: https://docs.voxel51.com/brain.html#image-representativeness
    """

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
    """Estimate likelihood of annotation mistakes.

    API: fob.compute_mistakenness(samples, pred_field, label_field="ground_truth")
    - pred_field: the predictions field (positional)
    - label_field: the ground truth field (keyword)
    Ref: https://docs.voxel51.com/brain.html#label-mistakes
    """

    node_type = "FiftyComfy/Brain/Compute Mistakenness"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        pred_field = params.get("pred_field", "")
        label_field = params.get("label_field", "")
        if not pred_field:
            raise ValueError("No predictions field specified")
        if not label_field:
            raise ValueError("No ground truth label field specified")

        fob.compute_mistakenness(
            input_view,
            pred_field,
            label_field=label_field,
        )
        return input_view


class ComputeHardnessHandler(NodeHandler):
    """Compute sample hardness (how difficult to classify).

    API: fob.compute_hardness(samples, label_field)
    - label_field: the predictions field containing logits
    Ref: https://docs.voxel51.com/brain.html#sample-hardness
    """

    node_type = "FiftyComfy/Brain/Compute Hardness"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        predictions_field = params.get("predictions_field", "")
        if not predictions_field:
            raise ValueError("No predictions field specified")

        fob.compute_hardness(input_view, predictions_field)
        return input_view


class ComputeExactDuplicatesHandler(NodeHandler):
    """Find samples with identical media files.

    Ref: https://docs.voxel51.com/brain.html#exact-duplicates
    """

    node_type = "FiftyComfy/Brain/Find Exact Duplicates"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        fob.compute_exact_duplicates(input_view)
        return input_view


class ComputeNearDuplicatesHandler(NodeHandler):
    """Find near-duplicate samples using embeddings.

    API: fob.compute_near_duplicates(samples, thresh=..., embeddings=...)
    Ref: https://docs.voxel51.com/brain.html#near-duplicates
    """

    node_type = "FiftyComfy/Brain/Find Near Duplicates"
    category = "brain"

    def execute(self, input_view, params, ctx):
        import fiftyone.brain as fob

        kwargs = {}
        if params.get("threshold"):
            kwargs["thresh"] = float(params["threshold"])
        if params.get("embeddings"):
            kwargs["embeddings"] = params["embeddings"]
        fob.compute_near_duplicates(input_view, **kwargs)
        return input_view


class ComputeLeakySplitsHandler(NodeHandler):
    """Find data leaks across train/test/val splits.

    API: fob.compute_leaky_splits(samples, splits=...)
    Ref: https://docs.voxel51.com/brain.html#leaky-splits
    """

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


class ManageBrainRunHandler(NodeHandler):
    """Rename or delete a brain run on the dataset.

    Ref: https://docs.voxel51.com/brain.html#managing-brain-runs
    """

    node_type = "FiftyComfy/Brain/Manage Brain Run"
    category = "brain"

    def execute(self, input_view, params, ctx):
        brain_key = params.get("brain_key", "")
        action = params.get("action", "delete")
        new_name = params.get("new_name", "")

        if not brain_key:
            raise ValueError("No brain run selected")

        if action == "delete":
            ctx.dataset.delete_brain_run(brain_key)
            logger.info(f"[FiftyComfy] Deleted brain run: {brain_key}")
        elif action == "rename":
            if not new_name:
                raise ValueError("No new name specified for rename")
            ctx.dataset.rename_brain_run(brain_key, new_name)
            logger.info(
                f"[FiftyComfy] Renamed brain run: {brain_key} -> {new_name}"
            )
        else:
            raise ValueError(f"Unknown action: {action}")

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
    ManageBrainRunHandler(),
]
