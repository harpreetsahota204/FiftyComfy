"""Evaluation node handlers — evaluate model predictions on FiftyOne views.

Ref: https://docs.voxel51.com/user_guide/evaluation.html
"""

import logging
from . import (
    NodeHandler,
    DETECTION_FQNS,
    CLASSIFICATION_FQNS,
    SEGMENTATION_FQNS,
    REGRESSION_FQNS,
    require_field_type,
)

logger = logging.getLogger(__name__)


class EvaluateDetectionsHandler(NodeHandler):
    """Evaluate object detection predictions against ground truth.

    API: view.evaluate_detections(pred_field, gt_field=..., eval_key=..., method=...)
    Supports: Detections, Polylines, Keypoints, TemporalDetections.
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

        # Guard: verify fields are detection-compatible types
        require_field_type(
            ctx, pred_field, DETECTION_FQNS, "Evaluate Detections"
        )
        require_field_type(
            ctx, gt_field, DETECTION_FQNS, "Evaluate Detections"
        )

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

        # Guard: verify fields are classification types
        require_field_type(
            ctx, pred_field, CLASSIFICATION_FQNS, "Evaluate Classifications"
        )
        require_field_type(
            ctx, gt_field, CLASSIFICATION_FQNS, "Evaluate Classifications"
        )

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


class EvaluateSegmentationsHandler(NodeHandler):
    """Evaluate semantic segmentation masks against ground truth.

    API: view.evaluate_segmentations(pred_field, gt_field=..., eval_key=..., method=...)
    Ref: https://docs.voxel51.com/user_guide/evaluation.html#segmentations
    """

    node_type = "FiftyComfy/Evaluation/Evaluate Segmentations"
    category = "evaluation"

    def execute(self, input_view, params, ctx):
        pred_field = params.get("pred_field", "")
        gt_field = params.get("gt_field", "")
        eval_key = params.get("eval_key", "eval")
        method = params.get("method", "simple")

        if not pred_field:
            raise ValueError("No predictions field specified")
        if not gt_field:
            raise ValueError("No ground truth field specified")
        if not eval_key:
            eval_key = "eval"

        # Guard: verify fields are segmentation types
        require_field_type(
            ctx, pred_field, SEGMENTATION_FQNS, "Evaluate Segmentations"
        )
        require_field_type(
            ctx, gt_field, SEGMENTATION_FQNS, "Evaluate Segmentations"
        )

        logger.info(
            f"[FiftyComfy] Evaluating segmentations: "
            f"pred={pred_field}, gt={gt_field}, key={eval_key}, method={method}"
        )

        kwargs = {
            "gt_field": gt_field,
            "eval_key": eval_key,
        }
        if method:
            kwargs["method"] = method

        input_view.evaluate_segmentations(pred_field, **kwargs)
        return input_view


class EvaluateRegressionsHandler(NodeHandler):
    """Evaluate regression predictions against ground truth.

    API: view.evaluate_regressions(pred_field, gt_field=..., eval_key=..., method=...)
    Ref: https://docs.voxel51.com/user_guide/evaluation.html#regressions
    """

    node_type = "FiftyComfy/Evaluation/Evaluate Regressions"
    category = "evaluation"

    def execute(self, input_view, params, ctx):
        pred_field = params.get("pred_field", "")
        gt_field = params.get("gt_field", "")
        eval_key = params.get("eval_key", "eval")
        method = params.get("method", "simple")

        if not pred_field:
            raise ValueError("No predictions field specified")
        if not gt_field:
            raise ValueError("No ground truth field specified")
        if not eval_key:
            eval_key = "eval"

        # Guard: verify fields are regression types
        require_field_type(
            ctx, pred_field, REGRESSION_FQNS, "Evaluate Regressions"
        )
        require_field_type(
            ctx, gt_field, REGRESSION_FQNS, "Evaluate Regressions"
        )

        logger.info(
            f"[FiftyComfy] Evaluating regressions: "
            f"pred={pred_field}, gt={gt_field}, key={eval_key}, method={method}"
        )

        kwargs = {
            "gt_field": gt_field,
            "eval_key": eval_key,
        }
        if method:
            kwargs["method"] = method

        input_view.evaluate_regressions(pred_field, **kwargs)
        return input_view


class ToEvaluationPatchesHandler(NodeHandler):
    """Convert to evaluation patches (TP/FP/FN per object).

    API: view.to_evaluation_patches(eval_key)
    Ref: https://docs.voxel51.com/user_guide/evaluation.html#evaluation-patches
    """

    node_type = "FiftyComfy/Evaluation/To Evaluation Patches"
    category = "evaluation"

    def execute(self, input_view, params, ctx):
        eval_key = params.get("eval_key", "")
        if not eval_key:
            raise ValueError("No evaluation key specified")

        # Guard: verify the eval_key exists
        try:
            evals = ctx.dataset.list_evaluations()
            if eval_key not in evals:
                raise ValueError(
                    f"Evaluation '{eval_key}' not found on this dataset. "
                    f"Available evaluations: {evals or '(none)'}"
                )
        except ValueError:
            raise
        except Exception:
            pass  # let FiftyOne raise its own error

        # Guard: cannot convert patches view to eval patches
        if hasattr(input_view, "_patches_field"):
            raise ValueError(
                "Cannot convert to evaluation patches — the view is "
                "already a patches view"
            )

        return input_view.to_evaluation_patches(eval_key)


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

        # Guard: verify eval_key exists
        try:
            evals = ctx.dataset.list_evaluations()
            if eval_key not in evals:
                raise ValueError(
                    f"Evaluation '{eval_key}' not found on this dataset. "
                    f"Available evaluations: {evals or '(none)'}"
                )
        except ValueError:
            raise
        except Exception:
            pass

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
    EvaluateSegmentationsHandler(),
    EvaluateRegressionsHandler(),
    ToEvaluationPatchesHandler(),
    ManageEvaluationHandler(),
]
