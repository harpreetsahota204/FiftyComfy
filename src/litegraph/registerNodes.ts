/**
 * Lazy node registration for LiteGraph.
 *
 * Every node sets this.title in its constructor for reliable display.
 * Combo widgets are populated dynamically via setDatasetInfo() + updateAllComboWidgets().
 */

import { LiteGraph, LGraphNode, LGraph } from "@comfyorg/litegraph";

let registered = false;

// ─── Dataset info cache (populated from Python via FiftyComfyView) ──
interface DatasetInfo {
  dataset_name: string;
  fields: string[];
  label_fields: string[];
  patches_fields: string[];
  detection_fields: string[];
  classification_fields: string[];
  segmentation_fields: string[];
  regression_fields: string[];
  saved_views: string[];
  tags: string[];
  label_classes: Record<string, string[]>;
  brain_runs: string[];
  evaluations: string[];
  zoo_models: string[];
}

let _datasetInfo: DatasetInfo = {
  dataset_name: "",
  fields: [],
  label_fields: [],
  patches_fields: [],
  detection_fields: [],
  classification_fields: [],
  segmentation_fields: [],
  regression_fields: [],
  saved_views: [],
  tags: [],
  label_classes: {},
  brain_runs: [],
  evaluations: [],
  zoo_models: [],
};

/**
 * Store dataset schema info so combo widgets can be populated.
 * Called from FiftyComfyView after fetching from the Python backend.
 */
export function setDatasetInfo(info: DatasetInfo): void {
  _datasetInfo = info;
  updateNodeVisibility();
}

/**
 * Populate combo widget values on a single node based on its type
 * and each widget's name.
 */
function populateNodeCombos(node: any): void {
  if (!node.widgets) return;
  const t: string = node.type || "";
  for (const w of node.widgets) {
    if (w.type !== "combo") continue;
    const name: string = w.name || "";

    // Saved views dropdown
    if (name === "view_name" && t.includes("Source/")) {
      w.options.values = _datasetInfo.saved_views.length > 0
        ? _datasetInfo.saved_views
        : ["(no saved views)"];
    }
    // Patches fields (Detections, Polylines, Keypoints only)
    else if (name === "field" && t.includes("To Patches")) {
      w.options.values = _datasetInfo.patches_fields.length > 0
        ? _datasetInfo.patches_fields
        : ["(no patchable fields)"];
    }
    // Label fields: Filter Labels, Match Labels, Map Labels
    else if (
      name === "field" && (
        t.includes("Filter Labels") ||
        t.includes("Match Labels") ||
        t.includes("Map Labels")
      )
    ) {
      w.options.values = _datasetInfo.label_fields.length > 0
        ? _datasetInfo.label_fields
        : ["(no label fields)"];
    }
    // Brain nodes needing label fields: Mistakenness, Hardness
    else if (
      (name === "pred_field" || name === "label_field" || name === "predictions_field") &&
      t.includes("Brain/")
    ) {
      w.options.values = _datasetInfo.label_fields.length > 0
        ? _datasetInfo.label_fields
        : ["(no label fields)"];
    }
    // Zoo model dropdown: Apply Zoo Model node
    else if (name === "model" && t.includes("Model/")) {
      w.options.values = _datasetInfo.zoo_models.length > 0
        ? _datasetInfo.zoo_models
        : ["(no models available)"];
    }
    // Evaluate Detections: show only detection-type fields
    else if (
      (name === "pred_field" || name === "gt_field") &&
      t.includes("Evaluate Detections")
    ) {
      w.options.values = _datasetInfo.detection_fields.length > 0
        ? _datasetInfo.detection_fields
        : ["(no detection fields)"];
    }
    // Evaluate Classifications: show only classification-type fields
    else if (
      (name === "pred_field" || name === "gt_field") &&
      t.includes("Evaluate Classifications")
    ) {
      w.options.values = _datasetInfo.classification_fields.length > 0
        ? _datasetInfo.classification_fields
        : ["(no classification fields)"];
    }
    // Evaluate Segmentations: show only segmentation-type fields
    else if (
      (name === "pred_field" || name === "gt_field") &&
      t.includes("Evaluate Segmentations")
    ) {
      w.options.values = _datasetInfo.segmentation_fields.length > 0
        ? _datasetInfo.segmentation_fields
        : ["(no segmentation fields)"];
    }
    // Evaluate Regressions: show only regression-type fields
    else if (
      (name === "pred_field" || name === "gt_field") &&
      t.includes("Evaluate Regressions")
    ) {
      w.options.values = _datasetInfo.regression_fields.length > 0
        ? _datasetInfo.regression_fields
        : ["(no regression fields)"];
    }
    // Evaluation runs: Manage Evaluation and To Evaluation Patches
    else if (name === "eval_key" && (t.includes("Manage Evaluation") || t.includes("To Evaluation Patches"))) {
      w.options.values = _datasetInfo.evaluations.length > 0
        ? _datasetInfo.evaluations
        : ["(no evaluations)"];
    }
    // Brain runs: Manage Brain Run node
    else if (name === "brain_key" && t.includes("Manage Brain Run")) {
      w.options.values = _datasetInfo.brain_runs.length > 0
        ? _datasetInfo.brain_runs
        : ["(no brain runs)"];
    }
    // Compute BBox Area: show only detection-type fields
    else if (name === "field" && t.includes("Compute BBox Area")) {
      w.options.values = _datasetInfo.detection_fields.length > 0
        ? _datasetInfo.detection_fields
        : ["(no detection fields)"];
    }
    // Filter Keypoints: show only label fields (keypoint fields ideally)
    else if (name === "field" && t.includes("Filter Keypoints")) {
      w.options.values = _datasetInfo.label_fields.length > 0
        ? _datasetInfo.label_fields
        : ["(no label fields)"];
    }
    // General fields: Sort By and any other "field" combo
    else if (name === "field") {
      w.options.values = _datasetInfo.fields.length > 0
        ? _datasetInfo.fields
        : ["(no fields)"];
    }
  }

  // For Filter Labels and Match Labels: add a "classes" hint widget
  // showing available labels once a field is selected
  if (t.includes("Filter Labels") || t.includes("Match Labels")) {
    const fieldVal = node.properties?.field || "";
    const classes = _datasetInfo.label_classes[fieldVal];
    if (classes && classes.length > 0) {
      // Store classes on the node so users can see what's available
      node.properties._available_classes = classes;
    }
  }
}

/**
 * Walk every node in the graph and refresh its combo widget values
 * from the cached dataset info.
 */
export function updateAllComboWidgets(graph: LGraph): void {
  const nodes = (graph as any)._nodes;
  if (!nodes) return;
  for (const node of nodes) {
    populateNodeCombos(node);
  }
}

// ─── Node visibility — hide nodes that don't apply to the dataset ───

/**
 * Mapping of node type strings to a function that returns true if
 * the node should be HIDDEN (skip_list = true) given the current
 * dataset info.
 */
const NODE_VISIBILITY_RULES: Record<string, (info: DatasetInfo) => boolean> = {
  // Source
  "FiftyComfy/Source/Load Saved View": (i) => i.saved_views.length === 0,

  // View stages requiring specific field types
  "FiftyComfy/View Stages/To Patches": (i) => i.patches_fields.length === 0,
  "FiftyComfy/View Stages/Filter Labels": (i) => i.label_fields.length === 0,
  "FiftyComfy/View Stages/Match Labels": (i) => i.label_fields.length === 0,
  "FiftyComfy/View Stages/Map Labels": (i) => i.label_fields.length === 0,
  "FiftyComfy/View Stages/Filter Keypoints": (i) => i.label_fields.length === 0,
  "FiftyComfy/View Stages/Select Labels": (i) => i.label_fields.length === 0,
  "FiftyComfy/View Stages/Exclude Labels": (i) => i.label_fields.length === 0,

  // Compute BBox Area requires detection fields
  "FiftyComfy/View Stages/Compute BBox Area": (i) => i.detection_fields.length === 0,

  // Brain nodes requiring label fields
  "FiftyComfy/Brain/Compute Mistakenness": (i) => i.label_fields.length === 0,
  "FiftyComfy/Brain/Compute Hardness": (i) => i.label_fields.length === 0,

  // Brain management requiring brain runs
  "FiftyComfy/Brain/Manage Brain Run": (i) => i.brain_runs.length === 0,
  "FiftyComfy/View Stages/Sort By Similarity": (i) => i.brain_runs.length === 0,

  // Evaluation nodes requiring specific field types
  "FiftyComfy/Evaluation/Evaluate Detections": (i) => i.detection_fields.length === 0,
  "FiftyComfy/Evaluation/Evaluate Classifications": (i) => i.classification_fields.length === 0,
  "FiftyComfy/Evaluation/Evaluate Segmentations": (i) => i.segmentation_fields.length === 0,
  "FiftyComfy/Evaluation/Evaluate Regressions": (i) => i.regression_fields.length === 0,

  // Evaluation management requiring evaluations
  "FiftyComfy/Evaluation/Manage Evaluation": (i) => i.evaluations.length === 0,
  "FiftyComfy/Evaluation/To Evaluation Patches": (i) => i.evaluations.length === 0,
};

/**
 * The set of node type strings currently hidden from the UI.
 * Used by the search box filter to stay in sync with skip_list.
 */
let _hiddenNodeTypes: Set<string> = new Set();

/**
 * Update which node types are visible in the context menu and
 * search box based on the current dataset info.
 *
 * Called from setDatasetInfo() after the info cache is updated.
 */
function updateNodeVisibility(): void {
  _hiddenNodeTypes.clear();

  for (const [nodeType, shouldHide] of Object.entries(NODE_VISIBILITY_RULES)) {
    const ctor = (LiteGraph as any).registered_node_types[nodeType];
    if (!ctor) continue;

    const hidden = shouldHide(_datasetInfo);
    ctor.skip_list = hidden;
    if (hidden) {
      _hiddenNodeTypes.add(nodeType);
    }
  }
}

/**
 * Install a search box filter on the canvas that respects node
 * visibility. Call once after creating LGraphCanvas.
 *
 * The onSearchBox callback replaces the default search behavior,
 * so we re-implement the basic type-name / title matching with
 * our hidden-set filter applied.
 */
export function installSearchFilter(canvas: any): void {
  canvas.onSearchBox = function (_helper: any, query: string, _graphcanvas: any): any[] {
    const str = (query || "").toLowerCase();
    const results: any[] = [];
    const types = (LiteGraph as any).registered_node_types;
    for (const type in types) {
      // Skip hidden nodes
      if (_hiddenNodeTypes.has(type)) continue;

      const ctor = types[type];
      const title: string = ctor.title || "";

      // Match against type path and title (show all when query is empty)
      if (str && !type.toLowerCase().includes(str) && !title.toLowerCase().includes(str)) {
        continue;
      }

      results.push(type);
    }
    // Alphabetical sort by the node's display title
    results.sort((a: string, b: string) => {
      const titleA = (types[a]?.title || a).toLowerCase();
      const titleB = (types[b]?.title || b).toLowerCase();
      return titleA.localeCompare(titleB);
    });
    return results;
  };
}

/**
 * Hook to auto-populate combos when a node is freshly added to the graph.
 * Call this once after creating the LGraph instance.
 */
export function hookNodeAdded(graph: LGraph): void {
  const prev = (graph as any).onNodeAdded;
  (graph as any).onNodeAdded = function (node: any) {
    populateNodeCombos(node);
    if (prev) prev.call(this, node);
  };
}


export function registerAllNodes(): void {
  if (registered) return;
  registered = true;

  // ─── Source ────────────────────────────────────────────────────

  class FO_LoadDataset extends LGraphNode {
    static title = "Current Dataset";
    static desc = "Use the dataset currently loaded in the App";
    constructor() {
      super();
      this.title = "Current Dataset";
      this.addOutput("view", "FO_VIEW");
      this.properties = {};
      this.size = [240, 60];
      this.color = "#FF7C1E";
      this.bgcolor = "#994A12";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if ((this.flags as any)?.collapsed) return;
      const name = _datasetInfo.dataset_name;
      if (name) {
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        const maxW = this.size[0] - 20;
        let display = name;
        while (ctx.measureText(display).width > maxW && display.length > 4) {
          display = display.slice(0, -2);
        }
        if (display !== name) display += "\u2026";
        ctx.fillText(display, this.size[0] / 2, this.size[1] - 12);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Source/Current Dataset", FO_LoadDataset as any);

  class FO_LoadSavedView extends LGraphNode {
    static title = "Load Saved View";
    static desc = "Load a saved view from the dataset";
    constructor() {
      super();
      this.title = "Load Saved View";
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "view_name", "", (v: string) => {
        this.properties.view_name = v;
      }, { values: [] as string[] });
      this.properties = { view_name: "" };
      this.size = [280, 80];
      this.color = "#FF7C1E";
      this.bgcolor = "#994A12";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if ((this.flags as any)?.collapsed) return;
      const name = _datasetInfo.dataset_name;
      if (name) {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textAlign = "left";
        const maxW = this.size[0] - 20;
        const prefix = "dataset: ";
        let display = prefix + name;
        while (ctx.measureText(display).width > maxW && display.length > prefix.length + 4) {
          display = prefix + name.slice(0, display.length - prefix.length - 2);
        }
        if (display !== prefix + name) display += "\u2026";
        ctx.fillText(display, 10, this.size[1] - 8);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Source/Load Saved View", FO_LoadSavedView as any);

  // ─── View Stages ──────────────────────────────────────────────

  class FO_Match extends LGraphNode {
    static title = "Match";
    static desc = "Filter samples by a ViewExpression";
    constructor() {
      super();
      this.title = "Match";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "expression", "F('confidence') > 0.5", (v: string) => {
        this.properties.expression = v;
      });
      this.properties = { expression: "F('confidence') > 0.5" };
      this.size = [320, 80];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Match", FO_Match as any);

  class FO_FilterLabels extends LGraphNode {
    static title = "Filter Labels";
    static desc = "Filter detections/classifications within a label field";
    constructor() {
      super();
      this.title = "Filter Labels";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("text", "expression", "F('label') == 'car'", (v: string) => { this.properties.expression = v; });
      this.addWidget("toggle", "only_matches", true, (v: boolean) => { this.properties.only_matches = v; });
      this.properties = { field: "", expression: "F('label') == 'car'", only_matches: true };
      this.size = [320, 150];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if ((this.flags as any)?.collapsed) return;
      const field = this.properties.field;
      const classes = field ? (_datasetInfo.label_classes[field] || []) : [];
      if (classes.length > 0) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "left";
        const preview = classes.slice(0, 6).join(", ") + (classes.length > 6 ? ", ..." : "");
        ctx.fillText("classes: " + preview, 8, this.size[1] - 6);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Filter Labels", FO_FilterLabels as any);

  class FO_MatchLabels extends LGraphNode {
    static title = "Match Labels";
    static desc = "Match samples containing labels that satisfy a condition";
    constructor() {
      super();
      this.title = "Match Labels";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("text", "filter", "F('label') == 'car'", (v: string) => { this.properties.filter = v; });
      this.addWidget("toggle", "bool", true, (v: boolean) => { this.properties.bool = v; });
      this.properties = { field: "", filter: "F('label') == 'car'", bool: true };
      this.size = [320, 150];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if ((this.flags as any)?.collapsed) return;
      const field = this.properties.field;
      const classes = field ? (_datasetInfo.label_classes[field] || []) : [];
      if (classes.length > 0) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "left";
        const preview = classes.slice(0, 6).join(", ") + (classes.length > 6 ? ", ..." : "");
        ctx.fillText("classes: " + preview, 8, this.size[1] - 6);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Match Labels", FO_MatchLabels as any);

  class FO_SortBy extends LGraphNode {
    static title = "Sort By";
    static desc = "Sort samples by a field";
    constructor() {
      super();
      this.title = "Sort By";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("toggle", "reverse", false, (v: boolean) => { this.properties.reverse = v; });
      this.properties = { field: "", reverse: false };
      this.size = [280, 90];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Sort By", FO_SortBy as any);

  class FO_SortBySimilarity extends LGraphNode {
    static title = "Sort By Similarity";
    static desc = "Sort samples by similarity to a reference (requires similarity index)";
    constructor() {
      super();
      this.title = "Sort By Similarity";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "query", "", (v: string) => { this.properties.query = v; });
      this.addWidget("text", "brain_key", "similarity", (v: string) => { this.properties.brain_key = v; });
      this.addWidget("number", "k", 25, (v: number) => { this.properties.k = v; }, { min: 1, max: 100000, step: 1, precision: 0 });
      this.addWidget("toggle", "reverse", false, (v: boolean) => { this.properties.reverse = v; });
      this.properties = { query: "", brain_key: "similarity", k: 25, reverse: false };
      this.size = [320, 150];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Sort By Similarity", FO_SortBySimilarity as any);

  class FO_Limit extends LGraphNode {
    static title = "Limit";
    static desc = "Limit number of samples";
    constructor() {
      super();
      this.title = "Limit";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("number", "count", 100, (v: number) => { this.properties.count = v; }, { min: 1, max: 100000, step: 10, precision: 0 });
      this.properties = { count: 100 };
      this.size = [220, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Limit", FO_Limit as any);

  class FO_MatchTags extends LGraphNode {
    static title = "Match Tags";
    static desc = "Filter samples by tags (comma-separated)";
    constructor() {
      super();
      this.title = "Match Tags";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "tags", "", (v: string) => { this.properties.tags = v; });
      this.properties = { tags: "" };
      this.size = [280, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Match Tags", FO_MatchTags as any);

  class FO_Take extends LGraphNode {
    static title = "Take";
    static desc = "Randomly sample N samples";
    constructor() {
      super();
      this.title = "Take";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("number", "count", 100, (v: number) => { this.properties.count = v; }, { min: 1, max: 100000, step: 10, precision: 0 });
      this.addWidget("number", "seed", 0, (v: number) => { this.properties.seed = v || null; }, { min: 0, max: 99999, step: 1, precision: 0 });
      this.properties = { count: 100, seed: null };
      this.size = [240, 90];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Take", FO_Take as any);

  class FO_Shuffle extends LGraphNode {
    static title = "Shuffle";
    static desc = "Randomly shuffle samples";
    constructor() {
      super();
      this.title = "Shuffle";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("number", "seed", 0, (v: number) => { this.properties.seed = v || null; }, { min: 0, max: 99999, step: 1, precision: 0 });
      this.properties = { seed: null };
      this.size = [220, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Shuffle", FO_Shuffle as any);

  class FO_ToPatches extends LGraphNode {
    static title = "To Patches";
    static desc = "Create a patches view from a label list field";
    constructor() {
      super();
      this.title = "To Patches";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.properties = { field: "" };
      this.size = [280, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/To Patches", FO_ToPatches as any);

  class FO_MapLabels extends LGraphNode {
    static title = "Map Labels";
    static desc = "Remap label values using a mapping dict";
    constructor() {
      super();
      this.title = "Map Labels";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("text", "map", '{"old_label": "new_label"}', (v: string) => { this.properties.map = v; });
      this.properties = { field: "", map: '{"old_label": "new_label"}' };
      this.size = [340, 100];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Map Labels", FO_MapLabels as any);

  class FO_Exists extends LGraphNode {
    static title = "Exists";
    static desc = "Filter samples where a field exists (is not None)";
    constructor() {
      super();
      this.title = "Exists";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("toggle", "bool", true, (v: boolean) => { this.properties.bool = v; });
      this.properties = { field: "", bool: true };
      this.size = [260, 90];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Exists", FO_Exists as any);

  class FO_SelectFields extends LGraphNode {
    static title = "Select Fields";
    static desc = "Select only specified fields (comma-separated)";
    constructor() {
      super();
      this.title = "Select Fields";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "fields", "", (v: string) => { this.properties.fields = v; });
      this.properties = { fields: "" };
      this.size = [280, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Select Fields", FO_SelectFields as any);

  class FO_ExcludeFields extends LGraphNode {
    static title = "Exclude Fields";
    static desc = "Exclude specified fields (comma-separated)";
    constructor() {
      super();
      this.title = "Exclude Fields";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "fields", "", (v: string) => { this.properties.fields = v; });
      this.properties = { fields: "" };
      this.size = [280, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Exclude Fields", FO_ExcludeFields as any);

  class FO_Skip extends LGraphNode {
    static title = "Skip";
    static desc = "Omit the first N samples from the view";
    constructor() {
      super();
      this.title = "Skip";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("number", "count", 0, (v: number) => { this.properties.count = v; }, { min: 0, max: 100000, step: 10, precision: 0 });
      this.properties = { count: 0 };
      this.size = [220, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Skip", FO_Skip as any);

  class FO_FilterField extends LGraphNode {
    static title = "Filter Field";
    static desc = "Filter values of a field by a ViewExpression";
    constructor() {
      super();
      this.title = "Filter Field";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("text", "expression", "F() > 0", (v: string) => { this.properties.expression = v; });
      this.addWidget("toggle", "only_matches", true, (v: boolean) => { this.properties.only_matches = v; });
      this.properties = { field: "", expression: "F() > 0", only_matches: true };
      this.size = [320, 130];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Filter Field", FO_FilterField as any);

  class FO_FilterKeypoints extends LGraphNode {
    static title = "Filter Keypoints";
    static desc = "Filter individual keypoint elements by expression";
    constructor() {
      super();
      this.title = "Filter Keypoints";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("text", "filter", "F('confidence') > 0.5", (v: string) => { this.properties.filter = v; });
      this.addWidget("toggle", "only_matches", true, (v: boolean) => { this.properties.only_matches = v; });
      this.properties = { field: "", filter: "F('confidence') > 0.5", only_matches: true };
      this.size = [340, 130];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Filter Keypoints", FO_FilterKeypoints as any);

  class FO_SelectLabels extends LGraphNode {
    static title = "Select Labels";
    static desc = "Select labels matching tags or fields";
    constructor() {
      super();
      this.title = "Select Labels";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "tags", "", (v: string) => { this.properties.tags = v; });
      this.addWidget("text", "fields", "", (v: string) => { this.properties.fields = v; });
      this.properties = { tags: "", fields: "" };
      this.size = [300, 100];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Select Labels", FO_SelectLabels as any);

  class FO_ExcludeLabels extends LGraphNode {
    static title = "Exclude Labels";
    static desc = "Exclude labels matching tags or fields";
    constructor() {
      super();
      this.title = "Exclude Labels";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "tags", "", (v: string) => { this.properties.tags = v; });
      this.addWidget("text", "fields", "", (v: string) => { this.properties.fields = v; });
      this.properties = { tags: "", fields: "" };
      this.size = [300, 100];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Exclude Labels", FO_ExcludeLabels as any);

  class FO_SetField extends LGraphNode {
    static title = "Set Field";
    static desc = "Set a field value using a ViewExpression";
    constructor() {
      super();
      this.title = "Set Field";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "field", "", (v: string) => { this.properties.field = v; });
      this.addWidget("text", "expression", "F('confidence') > 0.5", (v: string) => { this.properties.expression = v; });
      this.properties = { field: "", expression: "F('confidence') > 0.5" };
      this.size = [340, 100];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Set Field", FO_SetField as any);

  class FO_GroupBy extends LGraphNode {
    static title = "Group By";
    static desc = "Group samples by a field value";
    constructor() {
      super();
      this.title = "Group By";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("toggle", "reverse", false, (v: boolean) => { this.properties.reverse = v; });
      this.addWidget("toggle", "flat", false, (v: boolean) => { this.properties.flat = v; });
      this.properties = { field: "", reverse: false, flat: false };
      this.size = [280, 120];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Group By", FO_GroupBy as any);

  class FO_ComputeMetadata extends LGraphNode {
    static title = "Compute Metadata";
    static desc = "Populate width, height, and other metadata for all samples";
    constructor() {
      super();
      this.title = "Compute Metadata";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("toggle", "overwrite", false, (v: boolean) => { this.properties.overwrite = v; });
      this.properties = { overwrite: false };
      this.size = [280, 70];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Compute Metadata", FO_ComputeMetadata as any);

  class FO_ComputeBBoxArea extends LGraphNode {
    static title = "Compute BBox Area";
    static desc = "Compute bounding box area for each detection";
    constructor() {
      super();
      this.title = "Compute BBox Area";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.addWidget("text", "output_field", "bbox_area", (v: string) => { this.properties.output_field = v; });
      this.addWidget("toggle", "use_pixels", false, (v: boolean) => { this.properties.use_pixels = v; });
      this.properties = { field: "", output_field: "bbox_area", use_pixels: false };
      this.size = [320, 130];
      this.color = "#5AA5F1";
      this.bgcolor = "#365F8E";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Compute BBox Area", FO_ComputeBBoxArea as any);

  // ─── Brain ────────────────────────────────────────────────────

  class FO_ComputeEmbeddings extends LGraphNode {
    static title = "Compute Embeddings";
    static desc = "Compute embeddings using a zoo model";
    constructor() {
      super();
      this.title = "Compute Embeddings";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "model", "clip-vit-base32-torch", (v: string) => { this.properties.model = v; }, {
        values: ["clip-vit-base32-torch", "clip-vit-large14-torch", "open-clip-vit-b-32", "dinov2-vits14-torch"],
      });
      this.addWidget("text", "embeddings_field", "embeddings", (v: string) => { this.properties.embeddings_field = v; });
      this.properties = { model: "clip-vit-base32-torch", embeddings_field: "embeddings" };
      this.size = [340, 100];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Embeddings", FO_ComputeEmbeddings as any);

  class FO_ComputeVisualization extends LGraphNode {
    static title = "Compute Visualization";
    static desc = "Compute UMAP/t-SNE/PCA embedding visualization";
    constructor() {
      super();
      this.title = "Compute Visualization";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "brain_key", "visualization", (v: string) => { this.properties.brain_key = v; });
      this.addWidget("combo", "method", "umap", (v: string) => { this.properties.method = v; }, { values: ["umap", "tsne", "pca"] });
      this.addWidget("combo", "num_dims", "2", (v: string) => { this.properties.num_dims = parseInt(v); }, { values: ["2", "3"] });
      this.addWidget("text", "embeddings", "embeddings", (v: string) => { this.properties.embeddings = v; });
      this.properties = { brain_key: "visualization", method: "umap", num_dims: 2, embeddings: "embeddings" };
      this.size = [340, 150];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Visualization", FO_ComputeVisualization as any);

  class FO_ComputeSimilarity extends LGraphNode {
    static title = "Compute Similarity";
    static desc = "Create a similarity index";
    constructor() {
      super();
      this.title = "Compute Similarity";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "brain_key", "similarity", (v: string) => { this.properties.brain_key = v; });
      this.addWidget("combo", "backend", "sklearn", (v: string) => { this.properties.backend = v; }, { values: ["sklearn", "qdrant", "pinecone", "milvus", "lancedb"] });
      this.addWidget("text", "embeddings", "embeddings", (v: string) => { this.properties.embeddings = v; });
      this.properties = { brain_key: "similarity", backend: "sklearn", embeddings: "embeddings" };
      this.size = [340, 130];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Similarity", FO_ComputeSimilarity as any);

  class FO_ComputeUniqueness extends LGraphNode {
    static title = "Compute Uniqueness";
    static desc = "Compute uniqueness score per sample";
    constructor() {
      super();
      this.title = "Compute Uniqueness";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "uniqueness_field", "uniqueness", (v: string) => { this.properties.uniqueness_field = v; });
      this.addWidget("text", "embeddings", "embeddings", (v: string) => { this.properties.embeddings = v; });
      this.properties = { uniqueness_field: "uniqueness", embeddings: "embeddings" };
      this.size = [320, 100];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Uniqueness", FO_ComputeUniqueness as any);

  class FO_FindExactDuplicates extends LGraphNode {
    static title = "Find Exact Duplicates";
    static desc = "Find samples with identical media files";
    constructor() {
      super();
      this.title = "Find Exact Duplicates";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.properties = {};
      this.size = [280, 50];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Find Exact Duplicates", FO_FindExactDuplicates as any);

  class FO_FindNearDuplicates extends LGraphNode {
    static title = "Find Near Duplicates";
    static desc = "Find near-duplicate samples using embeddings";
    constructor() {
      super();
      this.title = "Find Near Duplicates";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("number", "threshold", 0.1, (v: number) => { this.properties.threshold = v; }, { min: 0.001, max: 1.0, step: 0.01, precision: 3 });
      this.addWidget("text", "embeddings", "embeddings", (v: string) => { this.properties.embeddings = v; });
      this.properties = { threshold: 0.1, embeddings: "embeddings" };
      this.size = [320, 100];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Find Near Duplicates", FO_FindNearDuplicates as any);

  class FO_ComputeRepresentativeness extends LGraphNode {
    static title = "Compute Representativeness";
    static desc = "Score how representative each sample is of its neighborhood";
    constructor() {
      super();
      this.title = "Compute Representativeness";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "representativeness_field", "representativeness", (v: string) => { this.properties.representativeness_field = v; });
      this.addWidget("combo", "method", "cluster-center", (v: string) => { this.properties.method = v; }, { values: ["cluster-center", "cluster-center-downweight"] });
      this.addWidget("text", "embeddings", "embeddings", (v: string) => { this.properties.embeddings = v; });
      this.properties = { representativeness_field: "representativeness", method: "cluster-center", embeddings: "embeddings" };
      this.size = [360, 130];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Representativeness", FO_ComputeRepresentativeness as any);

  class FO_ComputeMistakenness extends LGraphNode {
    static title = "Compute Mistakenness";
    static desc = "Estimate likelihood of annotation mistakes";
    constructor() {
      super();
      this.title = "Compute Mistakenness";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "pred_field", "", (v: string) => { this.properties.pred_field = v; }, { values: [] as string[] });
      this.addWidget("combo", "label_field", "", (v: string) => { this.properties.label_field = v; }, { values: [] as string[] });
      this.properties = { pred_field: "", label_field: "" };
      this.size = [320, 100];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Mistakenness", FO_ComputeMistakenness as any);

  class FO_ComputeHardness extends LGraphNode {
    static title = "Compute Hardness";
    static desc = "Compute sample hardness (how difficult to classify)";
    constructor() {
      super();
      this.title = "Compute Hardness";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "predictions_field", "", (v: string) => { this.properties.predictions_field = v; }, { values: [] as string[] });
      this.properties = { predictions_field: "" };
      this.size = [320, 70];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Hardness", FO_ComputeHardness as any);

  class FO_DetectLeakySplits extends LGraphNode {
    static title = "Detect Leaky Splits";
    static desc = "Find data leaks across train/test/val splits";
    constructor() {
      super();
      this.title = "Detect Leaky Splits";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("text", "splits", "train,test", (v: string) => { this.properties.splits = v; });
      this.addWidget("number", "threshold", 0.1, (v: number) => { this.properties.threshold = v; }, { min: 0.001, max: 1.0, step: 0.01, precision: 3 });
      this.properties = { splits: "train,test", threshold: 0.1 };
      this.size = [320, 100];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Detect Leaky Splits", FO_DetectLeakySplits as any);

  class FO_ManageBrainRun extends LGraphNode {
    static title = "Manage Brain Run";
    static desc = "Rename or delete a brain run on the dataset";
    constructor() {
      super();
      this.title = "Manage Brain Run";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "brain_key", "", (v: string) => { this.properties.brain_key = v; }, { values: [] as string[] });
      this.addWidget("combo", "action", "delete", (v: string) => { this.properties.action = v; }, { values: ["delete", "rename"] });
      this.addWidget("text", "new_name", "", (v: string) => { this.properties.new_name = v; });
      this.properties = { brain_key: "", action: "delete", new_name: "" };
      this.size = [320, 130];
      this.color = "#BC8CFF";
      this.bgcolor = "#6E5299";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if ((this.flags as any)?.collapsed) return;
      const action = this.properties.action || "delete";
      const key = this.properties.brain_key || "";
      if (key) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "left";
        const label = action === "rename"
          ? `will rename "${key}" \u2192 "${this.properties.new_name || "?"}"`
          : `will delete "${key}"`;
        const maxW = this.size[0] - 16;
        let display = label;
        while (ctx.measureText(display).width > maxW && display.length > 10) {
          display = display.slice(0, -2);
        }
        if (display !== label) display += "\u2026";
        ctx.fillText(display, 8, this.size[1] - 6);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Manage Brain Run", FO_ManageBrainRun as any);

  // ─── Model ────────────────────────────────────────────────────

  class FO_ApplyZooModel extends LGraphNode {
    static title = "Apply Zoo Model";
    static desc = "Apply a model from the FiftyOne Model Zoo";
    constructor() {
      super();
      this.title = "Apply Zoo Model";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "model", "", (v: string) => { this.properties.model = v; }, { values: [] as string[] });
      this.addWidget("text", "label_field", "predictions", (v: string) => { this.properties.label_field = v; });
      this.addWidget("number", "confidence_thresh", 0, (v: number) => { this.properties.confidence_thresh = v; }, { min: 0, max: 1.0, step: 0.05, precision: 2 });
      this.addWidget("toggle", "store_logits", false, (v: boolean) => { this.properties.store_logits = v; });
      this.properties = { model: "", label_field: "predictions", confidence_thresh: 0, store_logits: false };
      this.size = [360, 150];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Model/Apply Zoo Model", FO_ApplyZooModel as any);

  // ─── Evaluation ───────────────────────────────────────────────

  class FO_EvaluateDetections extends LGraphNode {
    static title = "Evaluate Detections";
    static desc = "Evaluate detection predictions against ground truth";
    constructor() {
      super();
      this.title = "Evaluate Detections";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "pred_field", "", (v: string) => { this.properties.pred_field = v; }, { values: [] as string[] });
      this.addWidget("combo", "gt_field", "", (v: string) => { this.properties.gt_field = v; }, { values: [] as string[] });
      this.addWidget("text", "eval_key", "eval", (v: string) => { this.properties.eval_key = v; });
      this.addWidget("combo", "method", "coco", (v: string) => { this.properties.method = v; }, { values: ["coco", "open-images"] });
      this.properties = { pred_field: "", gt_field: "", eval_key: "eval", method: "coco" };
      this.size = [340, 150];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Evaluation/Evaluate Detections", FO_EvaluateDetections as any);

  class FO_EvaluateClassifications extends LGraphNode {
    static title = "Evaluate Classifications";
    static desc = "Evaluate classification predictions against ground truth";
    constructor() {
      super();
      this.title = "Evaluate Classifications";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "pred_field", "", (v: string) => { this.properties.pred_field = v; }, { values: [] as string[] });
      this.addWidget("combo", "gt_field", "", (v: string) => { this.properties.gt_field = v; }, { values: [] as string[] });
      this.addWidget("text", "eval_key", "eval", (v: string) => { this.properties.eval_key = v; });
      this.properties = { pred_field: "", gt_field: "", eval_key: "eval" };
      this.size = [340, 130];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Evaluation/Evaluate Classifications", FO_EvaluateClassifications as any);

  class FO_ManageEvaluation extends LGraphNode {
    static title = "Manage Evaluation";
    static desc = "Rename or delete an evaluation run on the dataset";
    constructor() {
      super();
      this.title = "Manage Evaluation";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "eval_key", "", (v: string) => { this.properties.eval_key = v; }, { values: [] as string[] });
      this.addWidget("combo", "action", "delete", (v: string) => { this.properties.action = v; }, { values: ["delete", "rename"] });
      this.addWidget("text", "new_name", "", (v: string) => { this.properties.new_name = v; });
      this.properties = { eval_key: "", action: "delete", new_name: "" };
      this.size = [320, 130];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if ((this.flags as any)?.collapsed) return;
      const action = this.properties.action || "delete";
      const key = this.properties.eval_key || "";
      if (key) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "left";
        const label = action === "rename"
          ? `will rename "${key}" \u2192 "${this.properties.new_name || "?"}"`
          : `will delete "${key}"`;
        const maxW = this.size[0] - 16;
        let display = label;
        while (ctx.measureText(display).width > maxW && display.length > 10) {
          display = display.slice(0, -2);
        }
        if (display !== label) display += "\u2026";
        ctx.fillText(display, 8, this.size[1] - 6);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Evaluation/Manage Evaluation", FO_ManageEvaluation as any);

  class FO_EvaluateSegmentations extends LGraphNode {
    static title = "Evaluate Segmentations";
    static desc = "Evaluate semantic segmentation masks against ground truth";
    constructor() {
      super();
      this.title = "Evaluate Segmentations";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "pred_field", "", (v: string) => { this.properties.pred_field = v; }, { values: [] as string[] });
      this.addWidget("combo", "gt_field", "", (v: string) => { this.properties.gt_field = v; }, { values: [] as string[] });
      this.addWidget("text", "eval_key", "eval", (v: string) => { this.properties.eval_key = v; });
      this.addWidget("combo", "method", "simple", (v: string) => { this.properties.method = v; }, { values: ["simple"] });
      this.properties = { pred_field: "", gt_field: "", eval_key: "eval", method: "simple" };
      this.size = [340, 150];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Evaluation/Evaluate Segmentations", FO_EvaluateSegmentations as any);

  class FO_EvaluateRegressions extends LGraphNode {
    static title = "Evaluate Regressions";
    static desc = "Evaluate regression predictions against ground truth";
    constructor() {
      super();
      this.title = "Evaluate Regressions";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "pred_field", "", (v: string) => { this.properties.pred_field = v; }, { values: [] as string[] });
      this.addWidget("combo", "gt_field", "", (v: string) => { this.properties.gt_field = v; }, { values: [] as string[] });
      this.addWidget("text", "eval_key", "eval", (v: string) => { this.properties.eval_key = v; });
      this.addWidget("combo", "method", "simple", (v: string) => { this.properties.method = v; }, { values: ["simple"] });
      this.properties = { pred_field: "", gt_field: "", eval_key: "eval", method: "simple" };
      this.size = [340, 150];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Evaluation/Evaluate Regressions", FO_EvaluateRegressions as any);

  class FO_ToEvaluationPatches extends LGraphNode {
    static title = "To Evaluation Patches";
    static desc = "Convert to TP/FP/FN patches from an evaluation run";
    constructor() {
      super();
      this.title = "To Evaluation Patches";
      this.addInput("view", "FO_VIEW");
      this.addOutput("view", "FO_VIEW");
      this.addWidget("combo", "eval_key", "", (v: string) => { this.properties.eval_key = v; }, { values: [] as string[] });
      this.properties = { eval_key: "" };
      this.size = [320, 70];
      this.color = "#6AAF6C";
      this.bgcolor = "#3F6840";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Evaluation/To Evaluation Patches", FO_ToEvaluationPatches as any);

  // ─── Output ───────────────────────────────────────────────────

  class FO_SetAppView extends LGraphNode {
    static title = "Set App View";
    static desc = "Push the resulting view into the FiftyOne App";
    constructor() {
      super();
      this.title = "Set App View";
      this.addInput("view", "FO_VIEW");
      this.properties = {};
      this.size = [220, 50];
      this.color = "#998E3B";
      this.bgcolor = "#FFED63";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Output/Set App View", FO_SetAppView as any);

  class FO_SaveView extends LGraphNode {
    static title = "Save View";
    static desc = "Save the view as a named saved view";
    constructor() {
      super();
      this.title = "Save View";
      this.addInput("view", "FO_VIEW");
      this.addWidget("text", "name", "my_view", (v: string) => { this.properties.name = v; });
      this.addWidget("text", "description", "", (v: string) => { this.properties.description = v; });
      this.addWidget("toggle", "overwrite", false, (v: boolean) => { this.properties.overwrite = v; });
      this.properties = { name: "my_view", description: "", overwrite: false };
      this.size = [300, 120];
      this.color = "#998E3B";
      this.bgcolor = "#FFED63";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Output/Save View", FO_SaveView as any);

  console.log("[FiftyComfy] Registered all node types");
}
