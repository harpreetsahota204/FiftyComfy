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
  saved_views: string[];
  tags: string[];
}

let _datasetInfo: DatasetInfo = {
  dataset_name: "",
  fields: [],
  label_fields: [],
  saved_views: [],
  tags: [],
};

/**
 * Store dataset schema info so combo widgets can be populated.
 * Called from FiftyComfyView after fetching from the Python backend.
 */
export function setDatasetInfo(info: DatasetInfo): void {
  _datasetInfo = info;
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
    // Label fields: used by Filter Labels, Match Labels, To Patches, Map Labels
    else if (
      name === "field" && (
        t.includes("Filter Labels") ||
        t.includes("Match Labels") ||
        t.includes("To Patches") ||
        t.includes("Map Labels")
      )
    ) {
      w.options.values = _datasetInfo.label_fields.length > 0
        ? _datasetInfo.label_fields
        : ["(no label fields)"];
    }
    // General fields: Sort By, Count Values, Distinct, Bounds
    else if (name === "field") {
      w.options.values = _datasetInfo.fields.length > 0
        ? _datasetInfo.fields
        : ["(no fields)"];
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
      this.color = "#1B4F72";
      this.bgcolor = "#154360";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      const name = _datasetInfo.dataset_name;
      if (name) {
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "#4FC3F7";
        ctx.textAlign = "center";
        ctx.fillText(name, this.size[0] / 2, this.size[1] - 12);
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
      this.color = "#1B4F72";
      this.bgcolor = "#154360";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      const name = _datasetInfo.dataset_name;
      if (name) {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "left";
        ctx.fillText("dataset: " + name, 10, this.size[1] - 8);
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
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.addWidget("text", "expression", "F('confidence') > 0.5", (v: string) => { this.properties.expression = v; });
      this.addWidget("toggle", "only_matches", true, (v: boolean) => { this.properties.only_matches = v; });
      this.properties = { field: "", expression: "F('confidence') > 0.5", only_matches: true };
      this.size = [320, 130];
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.addWidget("text", "filter", "F('confidence') > 0.5", (v: string) => { this.properties.filter = v; });
      this.addWidget("toggle", "bool", true, (v: boolean) => { this.properties.bool = v; });
      this.properties = { field: "", filter: "F('confidence') > 0.5", bool: true };
      this.size = [320, 130];
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.addWidget("text", "brain_key", "similarity", (v: string) => { this.properties.brain_key = v; });
      this.addWidget("number", "k", 25, (v: number) => { this.properties.k = v; }, { min: 1, max: 100000, step: 1 });
      this.addWidget("toggle", "reverse", false, (v: boolean) => { this.properties.reverse = v; });
      this.properties = { brain_key: "similarity", k: 25, reverse: false };
      this.size = [320, 120];
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.addWidget("number", "count", 100, (v: number) => { this.properties.count = v; }, { min: 1, max: 100000, step: 10 });
      this.properties = { count: 100 };
      this.size = [220, 70];
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.addWidget("number", "count", 100, (v: number) => { this.properties.count = v; }, { min: 1, max: 100000, step: 10 });
      this.addWidget("number", "seed", 0, (v: number) => { this.properties.seed = v || null; }, { min: 0, max: 99999, step: 1 });
      this.properties = { count: 100, seed: null };
      this.size = [240, 90];
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.addWidget("number", "seed", 0, (v: number) => { this.properties.seed = v || null; }, { min: 0, max: 99999, step: 1 });
      this.properties = { seed: null };
      this.size = [220, 70];
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
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
      this.color = "#2A633A";
      this.bgcolor = "#1E4A2B";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/View Stages/Map Labels", FO_MapLabels as any);

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
      this.color = "#5B2C6F";
      this.bgcolor = "#4A235A";
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
      this.color = "#5B2C6F";
      this.bgcolor = "#4A235A";
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
      this.color = "#5B2C6F";
      this.bgcolor = "#4A235A";
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
      this.color = "#5B2C6F";
      this.bgcolor = "#4A235A";
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
      this.color = "#5B2C6F";
      this.bgcolor = "#4A235A";
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
      this.color = "#5B2C6F";
      this.bgcolor = "#4A235A";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Brain/Find Near Duplicates", FO_FindNearDuplicates as any);

  // ─── Aggregations ─────────────────────────────────────────────

  class FO_Count extends LGraphNode {
    static title = "Count";
    static desc = "Count samples in the view";
    constructor() {
      super();
      this.title = "Count";
      this.addInput("view", "FO_VIEW");
      this.properties = { result: null };
      this.size = [200, 70];
      this.color = "#7D6608";
      this.bgcolor = "#5C4B08";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if (this.properties.result !== null && this.properties.result !== undefined) {
        ctx.font = "bold 20px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText(String(this.properties.result), this.size[0] / 2, this.size[1] - 15);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Aggregations/Count", FO_Count as any);

  class FO_CountValues extends LGraphNode {
    static title = "Count Values";
    static desc = "Count occurrences of each value in a field";
    constructor() {
      super();
      this.title = "Count Values";
      this.addInput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.properties = { field: "", result: null };
      this.size = [300, 140];
      this.color = "#7D6608";
      this.bgcolor = "#5C4B08";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if (this.properties.result) {
        ctx.font = "12px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "left";
        let y = 70;
        const entries = Object.entries(this.properties.result).slice(0, 5);
        for (const [key, val] of entries) {
          ctx.fillText(`${key}: ${val}`, 10, y);
          y += 16;
        }
        if (Object.keys(this.properties.result).length > 5) {
          ctx.fillText("...", 10, y);
        }
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Aggregations/Count Values", FO_CountValues as any);

  class FO_Distinct extends LGraphNode {
    static title = "Distinct";
    static desc = "Get distinct values for a field";
    constructor() {
      super();
      this.title = "Distinct";
      this.addInput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.properties = { field: "", result: null };
      this.size = [280, 120];
      this.color = "#7D6608";
      this.bgcolor = "#5C4B08";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if (this.properties.result) {
        ctx.font = "12px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "left";
        const vals = (this.properties.result as any[]).slice(0, 6);
        let y = 70;
        for (const val of vals) { ctx.fillText(String(val), 10, y); y += 16; }
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Aggregations/Distinct", FO_Distinct as any);

  class FO_Bounds extends LGraphNode {
    static title = "Bounds";
    static desc = "Get min/max bounds for a numeric field";
    constructor() {
      super();
      this.title = "Bounds";
      this.addInput("view", "FO_VIEW");
      this.addWidget("combo", "field", "", (v: string) => { this.properties.field = v; }, { values: [] as string[] });
      this.properties = { field: "", result: null };
      this.size = [240, 90];
      this.color = "#7D6608";
      this.bgcolor = "#5C4B08";
    }
    onDrawForeground(ctx: CanvasRenderingContext2D) {
      if (this.properties.result) {
        const [min, max] = this.properties.result;
        ctx.font = "14px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "left";
        ctx.fillText(`[${min}, ${max}]`, 10, this.size[1] - 15);
      }
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Aggregations/Bounds", FO_Bounds as any);

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
      this.color = "#922B21";
      this.bgcolor = "#7B241C";
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
      this.color = "#922B21";
      this.bgcolor = "#7B241C";
    }
  }
  LiteGraph.registerNodeType("FiftyComfy/Output/Save View", FO_SaveView as any);

  console.log("[FiftyComfy] Registered all node types");
}
