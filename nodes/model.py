"""Model node handlers — apply zoo models to FiftyOne views.

Ref: https://docs.voxel51.com/model_zoo/api.html
"""

import logging
from . import NodeHandler

logger = logging.getLogger(__name__)


class ApplyZooModelHandler(NodeHandler):
    """Apply a model from the FiftyOne Model Zoo to the view.

    API: model = foz.load_zoo_model(name); view.apply_model(model, label_field=...)
    Ref: https://docs.voxel51.com/model_zoo/api.html#applying-zoo-models
    """

    node_type = "FiftyComfy/Model/Apply Zoo Model"
    category = "model"

    def execute(self, input_view, params, ctx):
        import fiftyone.zoo as foz

        model_name = params.get("model", "")
        if not model_name:
            raise ValueError("No model selected")

        label_field = params.get("label_field", "predictions")
        if not label_field:
            label_field = "predictions"

        confidence_thresh = params.get("confidence_thresh")
        if confidence_thresh is not None and confidence_thresh != "" and confidence_thresh != 0:
            confidence_thresh = float(confidence_thresh)
        else:
            confidence_thresh = None

        store_logits = params.get("store_logits", False)

        logger.info(
            f"[FiftyComfy] Loading zoo model: {model_name}"
        )
        model = foz.load_zoo_model(model_name)

        logger.info(
            f"[FiftyComfy] Applying model to {len(input_view)} samples, "
            f"label_field={label_field}"
        )
        kwargs = {"label_field": label_field}
        if confidence_thresh is not None:
            kwargs["confidence_thresh"] = confidence_thresh
        if store_logits:
            kwargs["store_logits"] = True

        input_view.apply_model(model, **kwargs)
        return input_view


# All handlers in this module
HANDLERS = [
    ApplyZooModelHandler(),
]
