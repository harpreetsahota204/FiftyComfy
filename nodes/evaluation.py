"""Evaluation node handlers — evaluate model predictions on FiftyOne views.

Ref: https://docs.voxel51.com/user_guide/evaluation.html
"""

import logging
from . import NodeHandler

logger = logging.getLogger(__name__)


class EvaluateDetectionsHandler(NodeHandler):
    """Evaluate object detection predictions against ground truth.

    API: view.evaluate_detections(pred_field, gt_field=..., eval_key=..., method=...)
    Populates per-sample eval_tp, eval_fp, eval_fn fields.
    Ref: https://docs.voxel51.com/user_guide/evaluation.html#detections
    """

    node_type = "FiftyComfy/Evaluation/Evaluate Detections"
    category = "evaluation"

    def execute(self, input_view, params, ctx):
        pred_field = params.get("pred_field", "")
        gt_field = params.get("gt_field", "")
        eval_key = params.get("eval_key", "eval")
        method = params.get("method", "coco")

        if not pred_field:
            raise ValueError("No predictions field specified")
        if not gt_field:
            raise ValueError("No ground truth field specified")
        if not eval_key:
            eval_key = "eval"

        logger.info(
            f"[FiftyComfy] Evaluating detections: "
            f"pred={pred_field}, gt={gt_field}, key={eval_key}, method={method}"
        )

        kwargs = {
            "gt_field": gt_field,
            "eval_key": eval_key,
        }
        if method:
            kwargs["method"] = method

        input_view.evaluate_detections(pred_field, **kwargs)
        return input_view


class EvaluateClassificationsHandler(NodeHandler):
    """Evaluate classification predictions against ground truth.

    API: view.evaluate_classifications(pred_field, gt_field=..., eval_key=...)
    Populates a boolean eval_key field on each sample (correct/incorrect).
    Ref: https://docs.voxel51.com/user_guide/evaluation.html#classifications
    """

    node_type = "FiftyComfy/Evaluation/Evaluate Classifications"
    category = "evaluation"

    def execute(self, input_view, params, ctx):
        pred_field = params.get("pred_field", "")
        gt_field = params.get("gt_field", "")
        eval_key = params.get("eval_key", "eval")

        if not pred_field:
            raise ValueError("No predictions field specified")
        if not gt_field:
            raise ValueError("No ground truth field specified")
        if not eval_key:
            eval_key = "eval"

        logger.info(
            f"[FiftyComfy] Evaluating classifications: "
            f"pred={pred_field}, gt={gt_field}, key={eval_key}"
        )

        input_view.evaluate_classifications(
            pred_field,
            gt_field=gt_field,
            eval_key=eval_key,
        )
        return input_view


class ManageEvaluationHandler(NodeHandler):
    """Rename or delete an evaluation run on the dataset.

    API:
        dataset.list_evaluations()
        dataset.rename_evaluation(old_key, new_key)
        dataset.delete_evaluation(eval_key)
    """

    node_type = "FiftyComfy/Evaluation/Manage Evaluation"
    category = "evaluation"

    def execute(self, input_view, params, ctx):
        eval_key = params.get("eval_key", "")
        action = params.get("action", "delete")
        new_name = params.get("new_name", "")

        if not eval_key:
            raise ValueError("No evaluation run selected")

        if action == "delete":
            ctx.dataset.delete_evaluation(eval_key)
            logger.info(f"[FiftyComfy] Deleted evaluation: {eval_key}")
        elif action == "rename":
            if not new_name:
                raise ValueError("No new name specified for rename")
            ctx.dataset.rename_evaluation(eval_key, new_name)
            logger.info(
                f"[FiftyComfy] Renamed evaluation: {eval_key} -> {new_name}"
            )
        else:
            raise ValueError(f"Unknown action: {action}")

        return input_view


# All handlers in this module
HANDLERS = [
    EvaluateDetectionsHandler(),
    EvaluateClassificationsHandler(),
    ManageEvaluationHandler(),
]
