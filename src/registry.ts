/**
 * Node type registry — metadata, colors, and category definitions.
 *
 * The authoritative node catalog comes from the Python backend at runtime.
 * This file provides static fallback definitions and category metadata
 * for the palette and canvas rendering.
 */

import { NodeCategory, NodeTypeDef } from "./types";

export const PLUGIN_URI = "@harpreetsahota/FiftyComfy";

// Category display metadata
export interface CategoryMeta {
  key: NodeCategory;
  label: string;
  color: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "source", label: "Source", color: "#3B82F6", icon: "database" },
  { key: "view_stage", label: "View Stages", color: "#10B981", icon: "filter" },
  { key: "brain", label: "Brain", color: "#8B5CF6", icon: "cpu" },
  { key: "aggregation", label: "Aggregation", color: "#F59E0B", icon: "bar-chart" },
  { key: "output", label: "Output", color: "#F43F5E", icon: "external-link" },
];

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  source: "#3B82F6",
  view_stage: "#10B981",
  brain: "#8B5CF6",
  aggregation: "#F59E0B",
  output: "#F43F5E",
};

/**
 * Static fallback node catalog.
 * Used when the backend catalog hasn't loaded yet.
 * The paramsSchema uses snake_case keys matching the Python backend.
 */
export const DEFAULT_NODE_CATALOG: NodeTypeDef[] = [
  // Source nodes
  {
    type: "source/dataset",
    label: "Current Dataset",
    category: "source",
    description: "Uses the dataset currently loaded in the App",
    color: "#3B82F6",
    inputs: [],
    outputs: ["view"],
    paramsSchema: {},
  },
  {
    type: "source/saved_view",
    label: "Load Saved View",
    category: "source",
    description: "Loads a previously saved view from the dataset",
    color: "#3B82F6",
    inputs: [],
    outputs: ["view"],
    paramsSchema: {
      view_name: {
        type: "enum",
        label: "Saved View",
        values: [],
        default: null,
        required: true,
        dynamic: true,
      },
    },
  },
  // View stage nodes
  {
    type: "view_stage/match",
    label: "Match",
    category: "view_stage",
    description: "Filter samples by a ViewExpression",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      expression: {
        type: "string",
        label: "Expression",
        default: "",
        required: true,
        placeholder: "F('confidence') > 0.9",
        description: "A FiftyOne ViewExpression",
      },
    },
  },
  {
    type: "view_stage/match_tags",
    label: "Match Tags",
    category: "view_stage",
    description: "Filter samples that have specific tags",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      tags: {
        type: "list",
        item_type: "string",
        label: "Tags",
        default: [],
        required: true,
      },
      all: { type: "bool", label: "Require All Tags", default: false, required: false },
      bool: { type: "bool", label: "Include Matching", default: true, required: false },
    },
  },
  {
    type: "view_stage/filter_labels",
    label: "Filter Labels",
    category: "view_stage",
    description: "Filter detections/classifications within a label field",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      field: {
        type: "enum",
        label: "Label Field",
        values: [],
        default: null,
        required: true,
        dynamic: true,
      },
      expression: {
        type: "string",
        label: "Expression",
        default: "",
        required: true,
        placeholder: "F('confidence') > 0.5",
      },
      only_matches: {
        type: "bool",
        label: "Only Matches",
        default: true,
        required: false,
      },
    },
  },
  {
    type: "view_stage/sort_by",
    label: "Sort By",
    category: "view_stage",
    description: "Sort samples by a field",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      field: {
        type: "enum",
        label: "Field",
        values: [],
        default: null,
        required: true,
        dynamic: true,
      },
      reverse: { type: "bool", label: "Descending", default: false, required: false },
    },
  },
  {
    type: "view_stage/limit",
    label: "Limit",
    category: "view_stage",
    description: "Limit the number of samples",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      count: { type: "int", label: "Count", default: 100, required: true, min: 1 },
    },
  },
  {
    type: "view_stage/exists",
    label: "Exists",
    category: "view_stage",
    description: "Filter to samples where a field exists (or doesn't)",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      field: {
        type: "enum",
        label: "Field",
        values: [],
        default: null,
        required: true,
        dynamic: true,
      },
      bool: { type: "bool", label: "Exists", default: true, required: false },
    },
  },
  {
    type: "view_stage/take",
    label: "Random Sample",
    category: "view_stage",
    description: "Randomly sample N items from the view",
    color: "#10B981",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      count: { type: "int", label: "Count", default: 100, required: true, min: 1 },
      seed: { type: "int", label: "Random Seed", default: null, required: false },
    },
  },
  // Brain nodes
  {
    type: "brain/compute_embeddings",
    label: "Compute Embeddings",
    category: "brain",
    description: "Compute embeddings using a model from the zoo",
    color: "#8B5CF6",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      model: {
        type: "enum",
        label: "Model",
        values: [
          "clip-vit-base32-torch",
          "clip-vit-large14-torch",
          "mobilenet-v2-imagenet-torch",
          "resnet50-imagenet-torch",
        ],
        default: "clip-vit-base32-torch",
        required: true,
      },
      embeddings_field: {
        type: "string",
        label: "Embeddings Field",
        default: "embeddings",
        required: true,
      },
      batch_size: { type: "int", label: "Batch Size", default: null, required: false, min: 1 },
      skip_existing: {
        type: "bool",
        label: "Skip Existing",
        default: false,
        required: false,
      },
    },
  },
  {
    type: "brain/compute_visualization",
    label: "Compute Visualization",
    category: "brain",
    description: "Compute low-dimensional embedding visualization (UMAP, t-SNE, PCA)",
    color: "#8B5CF6",
    inputs: ["view"],
    outputs: ["view"],
    paramsSchema: {
      brain_key: {
        type: "string",
        label: "Brain Key",
        default: "visualization",
        required: true,
      },
      method: {
        type: "enum",
        label: "Method",
        values: ["umap", "tsne", "pca"],
        default: "umap",
        required: true,
      },
      num_dims: {
        type: "enum",
        label: "Dimensions",
        values: ["2", "3"],
        default: "2",
        required: true,
      },
      embeddings: {
        type: "enum",
        label: "Embeddings Field",
        values: [],
        default: null,
        required: false,
        dynamic: true,
      },
    },
  },
  // Aggregation nodes
  {
    type: "aggregation/count",
    label: "Count",
    category: "aggregation",
    description: "Count samples in the view",
    color: "#F59E0B",
    inputs: ["view"],
    outputs: [],
    paramsSchema: {},
  },
  {
    type: "aggregation/count_values",
    label: "Count Values",
    category: "aggregation",
    description: "Count occurrences of each value in a field",
    color: "#F59E0B",
    inputs: ["view"],
    outputs: [],
    paramsSchema: {
      field: {
        type: "enum",
        label: "Field",
        values: [],
        default: null,
        required: true,
        dynamic: true,
      },
    },
  },
  // Output nodes
  {
    type: "output/set_app_view",
    label: "Set App View",
    category: "output",
    description: "Push the resulting view back into the FiftyOne App's grid",
    color: "#F43F5E",
    inputs: ["view"],
    outputs: [],
    paramsSchema: {},
  },
  {
    type: "output/save_view",
    label: "Save View",
    category: "output",
    description: "Save the view as a saved view on the dataset",
    color: "#F43F5E",
    inputs: ["view"],
    outputs: [],
    paramsSchema: {
      name: { type: "string", label: "View Name", default: "", required: true },
      description: { type: "string", label: "Description", default: "", required: false },
      overwrite: { type: "bool", label: "Overwrite", default: false, required: false },
    },
  },
];

/**
 * Convert backend catalog format (params_schema) to frontend format (paramsSchema).
 */
export function normalizeNodeTypeDef(raw: any): NodeTypeDef {
  return {
    type: raw.type,
    label: raw.label,
    category: raw.category,
    description: raw.description,
    color: raw.color || CATEGORY_COLORS[raw.category as NodeCategory] || "#6B7280",
    inputs: raw.inputs || [],
    outputs: raw.outputs || [],
    paramsSchema: raw.params_schema || raw.paramsSchema || {},
  };
}

/**
 * Get a node type def by type string from a catalog.
 */
export function getNodeTypeDef(
  catalog: NodeTypeDef[],
  nodeType: string
): NodeTypeDef | undefined {
  return catalog.find((n) => n.type === nodeType);
}
