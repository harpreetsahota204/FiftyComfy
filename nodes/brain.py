"""Brain nodes — run fiftyone.brain methods for embeddings, visualization, etc."""

import fiftyone.brain as fob

from . import NodeHandler, register_node, get_field_names


# Common embedding model choices for the zoo
EMBEDDING_MODELS = [
    "clip-vit-base32-torch",
    "clip-vit-large14-torch",
    "clip-vit-base32-open-clip",
    "open-clip-vit-b-32",
    "mobilenet-v2-imagenet-torch",
    "resnet50-imagenet-torch",
    "inception-v3-imagenet-torch",
    "densenet121-imagenet-torch",
    "vgg16-imagenet-torch",
]

DIM_REDUCTION_METHODS = ["umap", "tsne", "pca"]


@register_node
class ComputeEmbeddingsNode(NodeHandler):
    node_type = "brain/compute_embeddings"
    label = "Compute Embeddings"
    category = "brain"
    description = "Compute embeddings using a model from the zoo"
    color = "#8B5CF6"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "model": {
            "type": "enum",
            "label": "Model",
            "values": EMBEDDING_MODELS,
            "default": "clip-vit-base32-torch",
            "required": True,
            "description": "Embedding model from the FiftyOne Model Zoo",
        },
        "embeddings_field": {
            "type": "string",
            "label": "Embeddings Field",
            "default": "embeddings",
            "required": True,
            "description": "Field name to store computed embeddings",
        },
        "batch_size": {
            "type": "int",
            "label": "Batch Size",
            "default": None,
            "required": False,
            "min": 1,
            "description": "Batch size for inference",
        },
        "num_workers": {
            "type": "int",
            "label": "Num Workers",
            "default": None,
            "required": False,
            "min": 0,
            "description": "Number of data loading workers",
        },
        "skip_existing": {
            "type": "bool",
            "label": "Skip Existing",
            "default": False,
            "required": False,
            "description": "Skip samples that already have embeddings",
        },
    }

    def execute(self, input_view, params: dict, ctx):
        import fiftyone.zoo as foz

        model_name = params["model"]
        embeddings_field = params.get("embeddings_field", "embeddings")

        kwargs = {}
        if params.get("batch_size") is not None:
            kwargs["batch_size"] = int(params["batch_size"])
        if params.get("num_workers") is not None:
            kwargs["num_workers"] = int(params["num_workers"])
        if params.get("skip_existing"):
            kwargs["skip_existing"] = True

        model = foz.load_zoo_model(model_name)
        input_view.apply_model(model, embeddings_field, **kwargs)

        return input_view


@register_node
class ComputeVisualizationNode(NodeHandler):
    node_type = "brain/compute_visualization"
    label = "Compute Visualization"
    category = "brain"
    description = "Compute low-dimensional embedding visualization (UMAP, t-SNE, PCA)"
    color = "#8B5CF6"
    inputs = ["view"]
    outputs = ["view"]
    params_schema = {
        "brain_key": {
            "type": "string",
            "label": "Brain Key",
            "default": "visualization",
            "required": True,
            "description": "Key to store the visualization results",
        },
        "method": {
            "type": "enum",
            "label": "Method",
            "values": DIM_REDUCTION_METHODS,
            "default": "umap",
            "required": True,
            "description": "Dimensionality reduction method",
        },
        "num_dims": {
            "type": "enum",
            "label": "Dimensions",
            "values": ["2", "3"],
            "default": "2",
            "required": True,
            "description": "Number of output dimensions",
        },
        "embeddings": {
            "type": "enum",
            "label": "Embeddings Field",
            "values": [],
            "default": None,
            "required": False,
            "dynamic": True,
            "description": "Pre-computed embeddings field (optional if model is set)",
        },
        "model": {
            "type": "enum",
            "label": "Model",
            "values": [""] + EMBEDDING_MODELS,
            "default": "",
            "required": False,
            "description": "Model to compute embeddings on-the-fly (if no embeddings field)",
        },
    }

    def validate(self, params: dict) -> list[str]:
        errors = []
        if not params.get("brain_key"):
            errors.append("'Brain Key' is required")
        if not params.get("embeddings") and not params.get("model"):
            errors.append("Either 'Embeddings Field' or 'Model' must be set")
        return errors

    def execute(self, input_view, params: dict, ctx):
        brain_key = params["brain_key"]
        method = params.get("method", "umap")
        num_dims = int(params.get("num_dims", 2))

        kwargs = {
            "brain_key": brain_key,
            "method": method,
            "num_dims": num_dims,
        }

        if params.get("embeddings"):
            kwargs["embeddings"] = params["embeddings"]
        if params.get("model"):
            kwargs["model"] = params["model"]

        fob.compute_visualization(input_view, **kwargs)
        return input_view

    def get_dynamic_options(self, param_name: str, ctx):
        if param_name == "embeddings":
            return get_field_names(ctx)
        return None
