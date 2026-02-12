"""
FiftyComfy — Visual node-based workflow editor for FiftyOne.

A ComfyUI-style canvas for composing dataset curation and analysis
pipelines without writing code.

Architecture: Pure JS panel (registered via registerComponent in JS)
+ Python operators (for backend computation). No Python Panel class.
"""

import uuid
import json
import time
import logging

import fiftyone as fo
import fiftyone.operators as foo
import fiftyone.operators.types as types

from .executor import GraphExecutor
from .nodes import get_node_registry

logger = logging.getLogger(__name__)

STORE_VERSION = "v1"


def _get_store_key(ctx):
    dataset_id = str(ctx.dataset._doc.id) if ctx.dataset else "none"
    return f"fiftycomfy_{dataset_id}_{STORE_VERSION}"


# ─── Execute Graph Operator ─────────────────────────────────────────

class ExecuteGraph(foo.Operator):
    @property
    def config(self):
        return foo.OperatorConfig(
            name="execute_graph",
            label="Execute FiftyComfy Graph",
            unlisted=True,
            execute_as_generator=True,
            allow_immediate_execution=True,
        )

    def execute(self, ctx):
        graph_json = ctx.params.get("graph_json", "")
        try:
            graph_data = json.loads(graph_json) if isinstance(graph_json, str) else graph_json
        except Exception as e:
            yield ctx.ops.notify(f"Invalid graph JSON: {e}", variant="error")
            return

        registry = get_node_registry()
        executor = GraphExecutor(registry)

        # Forward all generator yields from the executor
        for msg in executor.execute(ctx, graph_data):
            yield msg


# ─── Save Graph Operator ────────────────────────────────────────────

class SaveGraph(foo.Operator):
    @property
    def config(self):
        return foo.OperatorConfig(
            name="save_graph",
            label="Save FiftyComfy Workflow",
            unlisted=True,
        )

    def execute(self, ctx):
        store = ctx.store(_get_store_key(ctx))
        name = ctx.params.get("name", "Untitled")
        graph_json = ctx.params.get("graph_json", "")

        try:
            graph_data = json.loads(graph_json) if isinstance(graph_json, str) else graph_json
        except Exception as e:
            return {"status": "error", "error": str(e)}

        graph_id = str(uuid.uuid4())
        entry = {
            "id": graph_id,
            "name": name,
            "graph": graph_data,
            "saved_at": time.time(),
        }

        store.set(f"graph_{graph_id}", entry)

        index = store.get("graph_index") or []
        index.append({"id": graph_id, "name": name, "saved_at": entry["saved_at"]})
        store.set("graph_index", index)

        return {"status": "ok", "graph_id": graph_id}


# ─── Load Graphs List Operator ──────────────────────────────────────

class LoadGraphs(foo.Operator):
    @property
    def config(self):
        return foo.OperatorConfig(
            name="load_graphs",
            label="List Saved FiftyComfy Workflows",
            unlisted=True,
        )

    def execute(self, ctx):
        store = ctx.store(_get_store_key(ctx))
        index = store.get("graph_index") or []
        return {"graphs": index}


# ─── Load Single Graph Operator ─────────────────────────────────────

class LoadGraph(foo.Operator):
    @property
    def config(self):
        return foo.OperatorConfig(
            name="load_graph",
            label="Load FiftyComfy Workflow",
            unlisted=True,
        )

    def execute(self, ctx):
        store = ctx.store(_get_store_key(ctx))
        graph_id = ctx.params.get("graph_id")
        entry = store.get(f"graph_{graph_id}")
        if not entry:
            return {"status": "error", "error": f"Graph {graph_id} not found"}
        return {"status": "ok", "data": entry}


# ─── Delete Graph Operator ──────────────────────────────────────────

class DeleteGraph(foo.Operator):
    @property
    def config(self):
        return foo.OperatorConfig(
            name="delete_graph",
            label="Delete FiftyComfy Workflow",
            unlisted=True,
        )

    def execute(self, ctx):
        store = ctx.store(_get_store_key(ctx))
        graph_id = ctx.params.get("graph_id")
        store.delete(f"graph_{graph_id}")

        index = store.get("graph_index") or []
        index = [g for g in index if g["id"] != graph_id]
        store.set("graph_index", index)

        return {"status": "ok"}


# ─── Get Dataset Info Operator ──────────────────────────────────────

class GetDatasetInfo(foo.Operator):
    @property
    def config(self):
        return foo.OperatorConfig(
            name="get_dataset_info",
            label="Get Dataset Info for FiftyComfy",
            unlisted=True,
            execute_as_generator=True,
        )

    def execute(self, ctx):
        if not ctx.dataset:
            yield ctx.trigger(
                "@harpreetsahota/FiftyComfy/dataset_info_loaded",
                params={
                    "dataset_name": "",
                    "fields": [],
                    "label_fields": [],
                    "patches_fields": [],
                    "saved_views": [],
                    "tags": [],
                    "label_classes": {},
                },
            )
            return

        def _get_fqn(field):
            """Get the fully qualified name of a field's document_type."""
            doc_type = getattr(field, "document_type", None)
            if doc_type is None:
                return None
            return f"{doc_type.__module__}.{doc_type.__name__}"

        # FQNs that support filter_labels / match_labels
        _LABEL_FQNS = {
            "fiftyone.core.labels.Classification",
            "fiftyone.core.labels.Classifications",
            "fiftyone.core.labels.Detections",
            "fiftyone.core.labels.Polylines",
            "fiftyone.core.labels.Keypoints",
        }
        # Subset that supports to_patches()
        _PATCHES_FQNS = {
            "fiftyone.core.labels.Detections",
            "fiftyone.core.labels.Polylines",
            "fiftyone.core.labels.Keypoints",
        }
        # Detection-type fields (for evaluate_detections)
        _DETECTION_FQNS = {
            "fiftyone.core.labels.Detections",
            "fiftyone.core.labels.Polylines",
            "fiftyone.core.labels.Keypoints",
        }
        # Classification-type fields (for evaluate_classifications)
        _CLASSIFICATION_FQNS = {
            "fiftyone.core.labels.Classification",
            "fiftyone.core.labels.Classifications",
        }
        # Map FQN -> sub-field path for distinct label queries
        _LABEL_PATH_MAP = {
            "fiftyone.core.labels.Detections": "detections.label",
            "fiftyone.core.labels.Polylines": "polylines.label",
            "fiftyone.core.labels.Keypoints": "keypoints.label",
            "fiftyone.core.labels.Classifications": "classifications.label",
            "fiftyone.core.labels.Classification": "label",
        }

        schema = ctx.dataset.get_field_schema()
        fields = list(schema.keys())

        label_fields = []
        patches_fields = []
        detection_fields = []
        classification_fields = []
        label_classes = {}

        for name, field in schema.items():
            fqn = _get_fqn(field)
            if fqn is None:
                continue

            if fqn in _LABEL_FQNS:
                label_fields.append(name)

            if fqn in _PATCHES_FQNS:
                patches_fields.append(name)

            if fqn in _DETECTION_FQNS:
                detection_fields.append(name)

            if fqn in _CLASSIFICATION_FQNS:
                classification_fields.append(name)

            # Collect distinct class labels
            sub_path = _LABEL_PATH_MAP.get(fqn)
            if sub_path:
                try:
                    vals = ctx.dataset.distinct(f"{name}.{sub_path}")
                    if vals:
                        label_classes[name] = vals
                except Exception:
                    pass

        logger.info(
            f"[FiftyComfy] Dataset '{ctx.dataset.name}': "
            f"{len(fields)} fields, "
            f"label_fields={label_fields}, "
            f"patches_fields={patches_fields}, "
            f"label_classes keys={list(label_classes.keys())}"
        )

        try:
            saved_views = ctx.dataset.list_saved_views()
        except Exception:
            saved_views = []

        try:
            tags = ctx.dataset.distinct("tags")
        except Exception:
            tags = []

        try:
            brain_runs = ctx.dataset.list_brain_runs()
        except Exception:
            brain_runs = []

        try:
            evaluations = ctx.dataset.list_evaluations()
        except Exception:
            evaluations = []

        # Curated list of popular zoo models (avoids slow foz.list_zoo_models())
        zoo_models = [
            # Detection
            "faster-rcnn-resnet50-fpn-coco-torch",
            "ssd300-vgg16-coco-torch",
            "retinanet-resnet50-fpn-coco-torch",
            "yolov5s-coco-torch",
            # Classification
            "resnet50-imagenet-torch",
            "resnet101-imagenet-torch",
            "mobilenet-v2-imagenet-torch",
            "inception-v3-imagenet-torch",
            "efficientnet-b0-imagenet-torch",
            # Segmentation
            "deeplabv3-resnet50-coco-torch",
            "deeplabv3-resnet101-coco-torch",
            # Embeddings
            "clip-vit-base32-torch",
            "clip-vit-large14-torch",
            "open-clip-vit-b-32",
            "dinov2-vits14-torch",
            # Zero-shot
            "zero-shot-classification-transformer-torch",
            "zero-shot-detection-transformer-torch",
        ]

        # Push dataset info to the JS side via ctx.trigger()
        # (executeOperator does NOT return Python results to JS callers)
        yield ctx.trigger(
            "@harpreetsahota/FiftyComfy/dataset_info_loaded",
            params={
                "dataset_name": ctx.dataset.name,
                "fields": fields,
                "label_fields": label_fields,
                "patches_fields": patches_fields,
                "saved_views": saved_views,
                "tags": tags,
                "detection_fields": detection_fields,
                "classification_fields": classification_fields,
                "label_classes": label_classes,
                "brain_runs": brain_runs,
                "evaluations": evaluations,
                "zoo_models": zoo_models,
            },
        )


# ─── Registration ───────────────────────────────────────────────────

def register(p):
    """Register all FiftyComfy components."""
    from .panel import FiftyComfyPanel

    p.register(FiftyComfyPanel)
    p.register(ExecuteGraph)
    p.register(SaveGraph)
    p.register(LoadGraphs)
    p.register(LoadGraph)
    p.register(DeleteGraph)
    p.register(GetDatasetInfo)
