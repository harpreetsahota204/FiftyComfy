# FiftyComfy

A visual, node-based workflow editor for [FiftyOne](https://docs.voxel51.com) -- powered by [LiteGraph.js](https://github.com/comfyorg/litegraph.js) (the same engine behind ComfyUI). Build dataset curation, analysis, and model evaluation pipelines by connecting nodes on a canvas, without writing code.

## Installation

```bash
fiftyone plugins download https://github.com/harpreetsahota204/FiftyComfy --overwrite
```
## Getting Started

1. Launch the FiftyOne App with a dataset loaded:

```python
import fiftyone as fo
import fiftyone.zoo as foz

dataset = foz.load_zoo_dataset("quickstart")
session = fo.launch_app(dataset)
```

2. Open the **FiftyComfy** panel from the `+` button in the App's panel selector.

3. Right-click on the canvas (or double-click) to open the node search menu and start adding nodes.

4. Connect nodes by dragging from an output slot to an input slot. All nodes pass `FO_VIEW` (a FiftyOne DatasetView) through connections.

5. Click **Run Workflow** to execute the graph. Results are pushed back into the FiftyOne App.

## How It Works

FiftyComfy is a hybrid FiftyOne plugin:

- **Frontend**: A LiteGraph.js canvas wrapped in a React component, providing the ComfyUI-style node editor with pan, zoom, context menus, connection validation, and widget rendering.
- **Backend**: Python operators that receive the serialized graph, topologically sort it, and execute each node against the current dataset using the FiftyOne SDK.

When you click "Run Workflow", the graph is serialized to JSON and sent to the Python backend. The executor walks the graph in topological order, passing FiftyOne DatasetView objects between nodes. Output nodes like "Set App View" push the final view into the FiftyOne App grid.

## Nodes

### Source (orange)

Entry points for your workflow. Every graph needs at least one source node.

| Node | Description |
|------|-------------|
| **Current Dataset** | Uses the dataset currently loaded in the App. Displays the dataset name on the node. |
| **Load Saved View** | Loads a named saved view from the dataset. Dropdown populated from your dataset's saved views. |

### View Stages (blue)

Filter, sort, and transform your data. These correspond to [FiftyOne view stages](https://docs.voxel51.com/cheat_sheets/views_cheat_sheet.html).

| Node | Description | Widgets |
|------|-------------|---------|
| **Match** | Filter samples by a ViewField expression | `expression` (text) -- e.g., `F('confidence') > 0.5` |
| **Filter Labels** | Filter detections/classifications within a label field | `field` (dropdown), `expression` (text), `only_matches` (toggle) |
| **Match Labels** | Match samples containing labels satisfying a condition | `field` (dropdown), `filter` (text), `bool` (toggle) |
| **Sort By** | Sort samples by a field | `field` (dropdown), `reverse` (toggle) |
| **Sort By Similarity** | Sort by similarity to a reference (requires a similarity index) | `brain_key` (text), `k` (number), `reverse` (toggle) |
| **Limit** | Limit number of samples | `count` (number) |
| **Match Tags** | Filter samples by tags | `tags` (text, comma-separated) |
| **Take** | Randomly sample N samples | `count` (number), `seed` (number) |
| **Shuffle** | Randomly shuffle samples | `seed` (number) |
| **To Patches** | Convert to a patches view from a label list field (Detections, Polylines, Keypoints) | `field` (dropdown) |
| **Map Labels** | Remap label values using a mapping dict | `field` (dropdown), `map` (text) -- e.g., `{"cat": "animal"}` |

### Brain (purple)

[FiftyOne Brain](https://docs.voxel51.com/brain.html) methods for dataset analysis and curation.

| Node | Description | Key Widgets |
|------|-------------|-------------|
| **Compute Embeddings** | Compute embeddings using a zoo model | `model` (dropdown), `embeddings_field` (text) |
| **Compute Visualization** | Compute UMAP/t-SNE/PCA visualization | `brain_key`, `method` (dropdown), `num_dims`, `embeddings` |
| **Compute Similarity** | Create a similarity index | `brain_key`, `backend` (dropdown), `embeddings` |
| **Compute Uniqueness** | Score sample uniqueness | `uniqueness_field`, `embeddings` |
| **Compute Representativeness** | Score how representative each sample is | `representativeness_field`, `method` (dropdown), `embeddings` |
| **Compute Mistakenness** | Estimate annotation mistake likelihood | `pred_field` (dropdown), `label_field` (dropdown) |
| **Compute Hardness** | Compute sample hardness | `predictions_field` (dropdown) |
| **Find Exact Duplicates** | Find identical media files | (no widgets) |
| **Find Near Duplicates** | Find near-duplicate samples | `threshold` (number), `embeddings` |
| **Detect Leaky Splits** | Find data leaks across splits | `splits` (text), `threshold` (number) |
| **Manage Brain Run** | Rename or delete a brain run | `brain_key` (dropdown), `action` (dropdown), `new_name` (text) |

### Model (green)

Apply models from the [FiftyOne Model Zoo](https://docs.voxel51.com/model_zoo/api.html).

| Node | Description | Key Widgets |
|------|-------------|-------------|
| **Apply Zoo Model** | Run inference with a zoo model | `model` (dropdown -- 17 popular models), `label_field` (text), `confidence_thresh` (number), `store_logits` (toggle) |

### Evaluation (green)

[Evaluate model predictions](https://docs.voxel51.com/user_guide/evaluation.html) against ground truth.

| Node | Description | Key Widgets |
|------|-------------|-------------|
| **Evaluate Detections** | Evaluate detection predictions (COCO or Open Images style) | `pred_field` (dropdown), `gt_field` (dropdown), `eval_key` (text), `method` (dropdown) |
| **Evaluate Classifications** | Evaluate classification predictions | `pred_field` (dropdown), `gt_field` (dropdown), `eval_key` (text) |
| **Manage Evaluation** | Rename or delete an evaluation run | `eval_key` (dropdown), `action` (dropdown), `new_name` (text) |

### Output (yellow)

Terminal nodes that push results back to the FiftyOne App.

| Node | Description | Widgets |
|------|-------------|---------|
| **Set App View** | Push the resulting view into the App grid | (no widgets) |
| **Save View** | Save the view as a named saved view | `name` (text), `description` (text), `overwrite` (toggle) |

## Dynamic Dropdowns

Field dropdowns are automatically populated from your dataset's schema when the panel loads:

- **Label fields** (Detections, Classifications, Polylines, Keypoints) are used by Filter Labels, Match Labels, To Patches, Map Labels, and evaluation nodes.
- **Patches fields** (Detections, Polylines, Keypoints) are used by To Patches.
- **All fields** are used by Sort By.
- **Saved views**, **brain runs**, and **evaluation runs** populate their respective management dropdowns.
- **Label classes** (distinct values like `["car", "person", "dog"]`) are shown as a preview at the bottom of Filter Labels and Match Labels nodes.

## Example Workflows

### Filter and view high-confidence detections

```
Current Dataset --> Filter Labels (field: predictions, expr: F('confidence') > 0.8) --> Set App View
```

### Compute embeddings, then visualize

```
Current Dataset --> Compute Embeddings (model: clip-vit-base32-torch) --> Compute Visualization (method: umap) --> Set App View
```

### Apply a model and evaluate

```
Current Dataset --> Apply Zoo Model (model: faster-rcnn-resnet50-fpn-coco-torch, label_field: predictions) --> Evaluate Detections (pred: predictions, gt: ground_truth) --> Sort By (field: eval_fp, reverse: true) --> Set App View
```

### Find near duplicates

```
Current Dataset --> Compute Embeddings --> Find Near Duplicates (threshold: 0.1) --> Set App View
```

## Saving and Loading Workflows

- **Save**: Click the "Save" button in the toolbar and enter a name. Workflows are stored in browser localStorage.
- **Load**: Click "Load" to see saved workflows and click one to restore it.
- **Clear**: Click "Clear" to reset the canvas.

## Canvas Controls

All standard LiteGraph controls work out of the box:

- **Pan**: Middle-click drag or Ctrl+click drag
- **Zoom**: Mouse wheel
- **Add node**: Right-click for context menu, or double-click for search
- **Connect**: Drag from an output slot to an input slot
- **Delete**: Select node(s) and press Delete/Backspace
- **Copy/Paste**: Ctrl+C / Ctrl+V
- **Multi-select**: Click and drag to box-select
- **Collapse node**: Double-click the title bar

## License

Apache 2.0
