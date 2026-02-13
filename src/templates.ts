/**
 * Built-in workflow templates for FiftyComfy.
 *
 * Each template is a serialized LiteGraph graph (same format as
 * graph.serialize()) with metadata for display in the template picker.
 *
 * The graph format must match exactly what LiteGraph produces:
 * - nodes[].inputs[].link = linkId | null
 * - nodes[].outputs[].links = [linkId, ...]
 * - links[] = [linkId, originNodeId, originSlot, targetNodeId, targetSlot, type]
 */

export interface BuiltinTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  graph: any;
}

// ─── Graph builder ─────────────────────────────────────────────────
// Builds graphs by defining a chain of nodes. Connections (links)
// are created automatically for linear pipelines.

interface NodeDef {
  type: string;
  title: string;
  w: number;
  h: number;
  properties: Record<string, any>;
  hasInput: boolean;   // has an FO_VIEW input?
  hasOutput: boolean;  // has an FO_VIEW output?
}

function buildLinearGraph(nodeDefs: NodeDef[]): any {
  const X_START = 50;
  const X_GAP = 60;
  const Y = 200;

  const nodes: any[] = [];
  const links: any[] = [];
  let nodeId = 1;
  let linkId = 1;
  let xPos = X_START;

  for (let i = 0; i < nodeDefs.length; i++) {
    const def = nodeDefs[i];

    // Determine which link connects to this node's input
    const inputLinkId = (def.hasInput && i > 0) ? linkId : null;

    // Determine the output link id (will be created after)
    // We create the link AFTER this node, connecting to the next
    const willHaveOutputLink = def.hasOutput && i < nodeDefs.length - 1 && nodeDefs[i + 1].hasInput;

    const n: any = {
      id: nodeId,
      type: def.type,
      pos: [xPos, Y],
      size: [def.w, def.h],
      flags: {},
      order: i,
      mode: 0,
      properties: { ...def.properties },
      inputs: def.hasInput
        ? [{ name: "view", type: "FO_VIEW", link: inputLinkId }]
        : [],
      outputs: def.hasOutput
        ? [{ name: "view", type: "FO_VIEW", links: willHaveOutputLink ? [linkId + (inputLinkId ? 0 : 1)] : [], slot_index: 0 }]
        : [],
    };

    nodes.push(n);

    // If previous node connected to this one, that link was already
    // accounted for; now advance linkId
    if (inputLinkId) {
      linkId++;
    }

    xPos += def.w + X_GAP;
    nodeId++;
  }

  // Now build the links array by walking the nodes
  // Reset — build links from scratch based on the node connectivity
  const finalLinks: any[] = [];
  let lid = 1;

  // Re-assign all link references
  for (let i = 0; i < nodes.length - 1; i++) {
    const curr = nodes[i];
    const next = nodes[i + 1];

    if (curr.outputs.length > 0 && next.inputs.length > 0) {
      // Create link: [linkId, originNodeId, originSlot, targetNodeId, targetSlot, type]
      finalLinks.push([lid, curr.id, 0, next.id, 0, "FO_VIEW"]);

      // Set references on the nodes
      curr.outputs[0].links = [lid];
      next.inputs[0].link = lid;

      lid++;
    }
  }

  return {
    version: 0.4,
    last_node_id: nodes.length,
    last_link_id: lid - 1,
    nodes,
    links: finalLinks,
    groups: [],
    config: {},
    extra: {},
  };
}

// ─── Node shorthand constructors ───────────────────────────────────

const SRC = (title: string, props: any = {}): NodeDef => ({
  type: "FiftyComfy/Source/Current Dataset", title, w: 240, h: 60,
  properties: props, hasInput: false, hasOutput: true,
});

const VS = (name: string, title: string, w: number, h: number, props: any): NodeDef => ({
  type: `FiftyComfy/View Stages/${name}`, title, w, h,
  properties: props, hasInput: true, hasOutput: true,
});

const BR = (name: string, title: string, w: number, h: number, props: any): NodeDef => ({
  type: `FiftyComfy/Brain/${name}`, title, w, h,
  properties: props, hasInput: true, hasOutput: true,
});

const EV = (name: string, title: string, w: number, h: number, props: any): NodeDef => ({
  type: `FiftyComfy/Evaluation/${name}`, title, w, h,
  properties: props, hasInput: true, hasOutput: true,
});

const OUT = (): NodeDef => ({
  type: "FiftyComfy/Output/Set App View", title: "Set App View", w: 220, h: 50,
  properties: {}, hasInput: true, hasOutput: false,
});

// ─── Template definitions ──────────────────────────────────────────

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  // ── Data Curation ──
  {
    id: "compute-visualize-embeddings",
    name: "Compute & Visualize Embeddings",
    category: "Data Curation",
    description: "Compute CLIP embeddings and create a UMAP visualization",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Compute Embeddings", "Compute Embeddings", 340, 100,
        { model: "clip-vit-base32-torch", embeddings_field: "embeddings" }),
      BR("Compute Visualization", "Compute Visualization", 340, 150,
        { brain_key: "visualization", method: "umap", num_dims: 2, embeddings: "embeddings" }),
      OUT(),
    ]),
  },
  {
    id: "find-near-duplicates",
    name: "Find Near Duplicates",
    category: "Data Curation",
    description: "Compute embeddings and detect near-duplicate samples",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Compute Embeddings", "Compute Embeddings", 340, 100,
        { model: "clip-vit-base32-torch", embeddings_field: "embeddings" }),
      BR("Find Near Duplicates", "Find Near Duplicates", 320, 100,
        { threshold: 0.1, embeddings: "embeddings" }),
      OUT(),
    ]),
  },
  {
    id: "find-exact-duplicates",
    name: "Find Exact Duplicates",
    category: "Data Curation",
    description: "Find samples with identical media files",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Find Exact Duplicates", "Find Exact Duplicates", 280, 50, {}),
      OUT(),
    ]),
  },
  {
    id: "curate-by-uniqueness",
    name: "Curate by Uniqueness",
    category: "Data Curation",
    description: "Compute embeddings, uniqueness scores, and view the most unique samples",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Compute Embeddings", "Compute Embeddings", 340, 100,
        { model: "clip-vit-base32-torch", embeddings_field: "embeddings" }),
      BR("Compute Uniqueness", "Compute Uniqueness", 320, 100,
        { uniqueness_field: "uniqueness", embeddings: "embeddings" }),
      VS("Sort By", "Sort By", 280, 90, { field: "uniqueness", reverse: true }),
      VS("Limit", "Limit", 220, 70, { count: 100 }),
      OUT(),
    ]),
  },
  {
    id: "curate-by-representativeness",
    name: "Curate by Representativeness",
    category: "Data Curation",
    description: "Compute embeddings, representativeness scores, and view top results",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Compute Embeddings", "Compute Embeddings", 340, 100,
        { model: "clip-vit-base32-torch", embeddings_field: "embeddings" }),
      BR("Compute Representativeness", "Compute Representativeness", 360, 130,
        { representativeness_field: "representativeness", method: "cluster-center", embeddings: "embeddings" }),
      VS("Sort By", "Sort By", 280, 90, { field: "representativeness", reverse: true }),
      VS("Limit", "Limit", 220, 70, { count: 100 }),
      OUT(),
    ]),
  },

  // ── Quality ──
  {
    id: "find-annotation-mistakes",
    name: "Find Annotation Mistakes",
    category: "Quality",
    description: "Estimate mistakenness and surface likely annotation errors",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Compute Mistakenness", "Compute Mistakenness", 320, 130,
        { pred_field: "", label_field: "", mistakenness_field: "mistakenness" }),
      VS("Sort By", "Sort By", 280, 90, { field: "mistakenness", reverse: true }),
      OUT(),
    ]),
  },
  {
    id: "sample-hardness",
    name: "Sample Hardness",
    category: "Quality",
    description: "Compute sample hardness and view hardest-to-classify samples",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      BR("Compute Hardness", "Compute Hardness", 320, 100,
        { predictions_field: "", hardness_field: "hardness" }),
      VS("Sort By", "Sort By", 280, 90, { field: "hardness", reverse: true }),
      OUT(),
    ]),
  },

  // ── Filtering ──
  {
    id: "filter-high-confidence",
    name: "Filter High-Confidence Predictions",
    category: "Filtering",
    description: "Keep only predictions with confidence > 0.9",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      VS("Filter Labels", "Filter Labels", 320, 150,
        { field: "", expression: 'F("confidence") > 0.90', only_matches: true }),
      OUT(),
    ]),
  },
  {
    id: "filter-by-bbox-area",
    name: "Filter by BBox Area",
    category: "Filtering",
    description: "Compute metadata, bbox areas, and filter detections by size",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      VS("Compute Metadata", "Compute Metadata", 280, 70, { overwrite: false }),
      VS("Compute BBox Area", "Compute BBox Area", 340, 150,
        { field: "", output_field: "bbox_area", area_mode: "pixel" }),
      VS("Filter Labels", "Filter Labels", 320, 150,
        { field: "", expression: 'F("bbox_area") > 3200', only_matches: true }),
      OUT(),
    ]),
  },

  // ── Evaluation ──
  {
    id: "evaluate-detections",
    name: "Evaluate Detections",
    category: "Evaluation",
    description: "Run COCO evaluation and view TP/FP/FN patches",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      EV("Evaluate Detections", "Evaluate Detections", 340, 150,
        { pred_field: "", gt_field: "", eval_key: "eval", method: "coco" }),
      EV("To Evaluation Patches", "To Evaluation Patches", 320, 70,
        { eval_key: "eval" }),
      OUT(),
    ]),
  },
  {
    id: "evaluate-classifications",
    name: "Evaluate Classifications",
    category: "Evaluation",
    description: "Evaluate classification predictions against ground truth",
    graph: buildLinearGraph([
      SRC("Current Dataset"),
      EV("Evaluate Classifications", "Evaluate Classifications", 340, 130,
        { pred_field: "", gt_field: "", eval_key: "eval" }),
      OUT(),
    ]),
  },
];
