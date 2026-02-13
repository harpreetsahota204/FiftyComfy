/**
 * Built-in workflow templates for FiftyComfy.
 *
 * Each template is a serialized LiteGraph graph (same format as
 * graph.serialize()) with metadata for display in the template picker.
 */

export interface BuiltinTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  graph: any;
}

// ─── Helper to build template graphs concisely ─────────────────────

let _nid = 1;
let _lid = 1;

function resetIds() {
  _nid = 1;
  _lid = 1;
}

function node(
  type: string,
  title: string,
  x: number,
  y: number,
  w: number,
  h: number,
  properties: Record<string, any>,
  inputs?: Array<{ name: string; type: string; link: number | null }>,
  outputs?: Array<{ name: string; type: string; links: number[] }>,
) {
  const id = _nid++;
  return {
    id,
    type,
    pos: [x, y] as [number, number],
    size: [w, h] as [number, number],
    flags: {},
    order: 0,
    mode: 0,
    properties,
    inputs: inputs || [],
    outputs: outputs || [],
  };
}

function link(
  originId: number,
  originSlot: number,
  targetId: number,
  targetSlot: number,
): [number, number, number, number, number, string] {
  const id = _lid++;
  return [id, originId, originSlot, targetId, targetSlot, "FO_VIEW"];
}

function makeGraph(nodes: any[], links: any[]): any {
  return {
    last_node_id: nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0,
    last_link_id: links.length > 0 ? Math.max(...links.map((l: any) => l[0])) : 0,
    nodes,
    links,
    groups: [],
    config: {},
    extra: {},
  };
}

// ─── Template definitions ──────────────────────────────────────────

function buildComputeVisualizeEmbeddings(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Compute Embeddings", "Compute Embeddings", 350, 200, 340, 100,
    { model: "clip-vit-base32-torch", embeddings_field: "embeddings" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/Brain/Compute Visualization", "Compute Visualization", 750, 200, 340, 150,
    { brain_key: "visualization", method: "umap", num_dims: 2, embeddings: "embeddings" },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/Output/Set App View", "Set App View", 1150, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 3 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0)];
  return makeGraph([n1, n2, n3, n4], links);
}

function buildFindNearDuplicates(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Compute Embeddings", "Compute Embeddings", 350, 200, 340, 100,
    { model: "clip-vit-base32-torch", embeddings_field: "embeddings" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/Brain/Find Near Duplicates", "Find Near Duplicates", 750, 200, 320, 100,
    { threshold: 0.1, embeddings: "embeddings" },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/Output/Set App View", "Set App View", 1130, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 3 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0)];
  return makeGraph([n1, n2, n3, n4], links);
}

function buildFindExactDuplicates(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Find Exact Duplicates", "Find Exact Duplicates", 350, 200, 280, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/Output/Set App View", "Set App View", 700, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 2 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0)];
  return makeGraph([n1, n2, n3], links);
}

function buildCurateByUniqueness(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Compute Uniqueness", "Compute Uniqueness", 350, 200, 320, 100,
    { uniqueness_field: "uniqueness", embeddings: "embeddings" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/View Stages/Sort By", "Sort By", 730, 200, 280, 90,
    { field: "uniqueness", reverse: true },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/View Stages/Limit", "Limit", 1070, 200, 220, 70,
    { count: 100 },
    [{ name: "view", type: "FO_VIEW", link: 3 }],
    [{ name: "view", type: "FO_VIEW", links: [4] }]);
  const n5 = node("FiftyComfy/Output/Set App View", "Set App View", 1350, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 4 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0), link(4, 0, 5, 0)];
  return makeGraph([n1, n2, n3, n4, n5], links);
}

function buildCurateByRepresentativeness(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Compute Representativeness", "Compute Representativeness", 350, 200, 360, 130,
    { representativeness_field: "representativeness", method: "cluster-center", embeddings: "embeddings" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/View Stages/Sort By", "Sort By", 770, 200, 280, 90,
    { field: "representativeness", reverse: true },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/View Stages/Limit", "Limit", 1110, 200, 220, 70,
    { count: 100 },
    [{ name: "view", type: "FO_VIEW", link: 3 }],
    [{ name: "view", type: "FO_VIEW", links: [4] }]);
  const n5 = node("FiftyComfy/Output/Set App View", "Set App View", 1390, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 4 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0), link(4, 0, 5, 0)];
  return makeGraph([n1, n2, n3, n4, n5], links);
}

function buildFindAnnotationMistakes(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Compute Mistakenness", "Compute Mistakenness", 350, 200, 320, 100,
    { pred_field: "", label_field: "" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/View Stages/Sort By", "Sort By", 730, 200, 280, 90,
    { field: "mistakenness", reverse: true },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/Output/Set App View", "Set App View", 1070, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 3 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0)];
  return makeGraph([n1, n2, n3, n4], links);
}

function buildSampleHardness(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Brain/Compute Hardness", "Compute Hardness", 350, 200, 320, 70,
    { predictions_field: "" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/View Stages/Sort By", "Sort By", 730, 200, 280, 90,
    { field: "hardness", reverse: true },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/Output/Set App View", "Set App View", 1070, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 3 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0)];
  return makeGraph([n1, n2, n3, n4], links);
}

function buildFilterHighConfidence(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/View Stages/Filter Labels", "Filter Labels", 350, 200, 320, 150,
    { field: "", expression: "F('confidence') > 0.9", only_matches: true },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/Output/Set App View", "Set App View", 730, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 2 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0)];
  return makeGraph([n1, n2, n3], links);
}

function buildFilterByBBoxArea(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/View Stages/Compute Metadata", "Compute Metadata", 350, 200, 280, 70,
    { overwrite: false },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/View Stages/Compute BBox Area", "Compute BBox Area", 690, 200, 340, 150,
    { field: "", output_field: "bbox_area", area_mode: "pixel" },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/View Stages/Filter Labels", "Filter Labels", 1090, 200, 320, 150,
    { field: "", expression: "F('bbox_area') > 1024", only_matches: true },
    [{ name: "view", type: "FO_VIEW", link: 3 }],
    [{ name: "view", type: "FO_VIEW", links: [4] }]);
  const n5 = node("FiftyComfy/Output/Set App View", "Set App View", 1470, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 4 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0), link(4, 0, 5, 0)];
  return makeGraph([n1, n2, n3, n4, n5], links);
}

function buildEvaluateDetections(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Evaluation/Evaluate Detections", "Evaluate Detections", 350, 200, 340, 150,
    { pred_field: "", gt_field: "", eval_key: "eval", method: "coco" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/Evaluation/To Evaluation Patches", "To Evaluation Patches", 750, 200, 320, 70,
    { eval_key: "eval" },
    [{ name: "view", type: "FO_VIEW", link: 2 }],
    [{ name: "view", type: "FO_VIEW", links: [3] }]);
  const n4 = node("FiftyComfy/Output/Set App View", "Set App View", 1130, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 3 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0), link(3, 0, 4, 0)];
  return makeGraph([n1, n2, n3, n4], links);
}

function buildEvaluateClassifications(): any {
  resetIds();
  const n1 = node("FiftyComfy/Source/Current Dataset", "Current Dataset", 50, 200, 240, 60, {},
    [], [{ name: "view", type: "FO_VIEW", links: [1] }]);
  const n2 = node("FiftyComfy/Evaluation/Evaluate Classifications", "Evaluate Classifications", 350, 200, 340, 130,
    { pred_field: "", gt_field: "", eval_key: "eval" },
    [{ name: "view", type: "FO_VIEW", link: 1 }],
    [{ name: "view", type: "FO_VIEW", links: [2] }]);
  const n3 = node("FiftyComfy/Output/Set App View", "Set App View", 750, 200, 220, 50, {},
    [{ name: "view", type: "FO_VIEW", link: 2 }], []);
  const links = [link(1, 0, 2, 0), link(2, 0, 3, 0)];
  return makeGraph([n1, n2, n3], links);
}

// ─── Export ────────────────────────────────────────────────────────

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  // Data Curation
  {
    id: "compute-visualize-embeddings",
    name: "Compute & Visualize Embeddings",
    category: "Data Curation",
    description: "Compute CLIP embeddings and create a UMAP visualization",
    graph: buildComputeVisualizeEmbeddings(),
  },
  {
    id: "find-near-duplicates",
    name: "Find Near Duplicates",
    category: "Data Curation",
    description: "Compute embeddings and detect near-duplicate samples",
    graph: buildFindNearDuplicates(),
  },
  {
    id: "find-exact-duplicates",
    name: "Find Exact Duplicates",
    category: "Data Curation",
    description: "Find samples with identical media files",
    graph: buildFindExactDuplicates(),
  },
  {
    id: "curate-by-uniqueness",
    name: "Curate by Uniqueness",
    category: "Data Curation",
    description: "Compute uniqueness scores and view the most unique samples",
    graph: buildCurateByUniqueness(),
  },
  {
    id: "curate-by-representativeness",
    name: "Curate by Representativeness",
    category: "Data Curation",
    description: "Score how representative each sample is and view the top results",
    graph: buildCurateByRepresentativeness(),
  },

  // Quality
  {
    id: "find-annotation-mistakes",
    name: "Find Annotation Mistakes",
    category: "Quality",
    description: "Estimate mistakenness and surface likely annotation errors",
    graph: buildFindAnnotationMistakes(),
  },
  {
    id: "sample-hardness",
    name: "Sample Hardness",
    category: "Quality",
    description: "Compute sample hardness and view the hardest-to-classify samples",
    graph: buildSampleHardness(),
  },

  // Filtering
  {
    id: "filter-high-confidence",
    name: "Filter High-Confidence Predictions",
    category: "Filtering",
    description: "Keep only predictions with confidence > 0.9",
    graph: buildFilterHighConfidence(),
  },
  {
    id: "filter-by-bbox-area",
    name: "Filter by BBox Area",
    category: "Filtering",
    description: "Compute metadata, bbox areas, and filter detections by size",
    graph: buildFilterByBBoxArea(),
  },

  // Evaluation
  {
    id: "evaluate-detections",
    name: "Evaluate Detections",
    category: "Evaluation",
    description: "Run COCO evaluation and view TP/FP/FN patches",
    graph: buildEvaluateDetections(),
  },
  {
    id: "evaluate-classifications",
    name: "Evaluate Classifications",
    category: "Evaluation",
    description: "Evaluate classification predictions against ground truth",
    graph: buildEvaluateClassifications(),
  },
];
