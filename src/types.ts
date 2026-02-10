/**
 * TypeScript interfaces for FiftyComfy.
 */

/** A serialized LiteGraph graph, as returned by graph.serialize(). */
export interface SerializedGraph {
  last_node_id: number;
  last_link_id: number;
  nodes: SerializedNode[];
  links: SerializedLink[];
  groups: any[];
  config?: Record<string, any>;
  extra?: Record<string, any>;
}

/** A single node from the serialized graph. */
export interface SerializedNode {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number];
  flags?: Record<string, any>;
  order?: number;
  mode?: number;
  inputs?: NodeSlot[];
  outputs?: NodeSlot[];
  properties: Record<string, any>;
  widgets_values?: any[];
}

/** A node input/output slot. */
export interface NodeSlot {
  name: string;
  type: string;
  link?: number | number[] | null;
  links?: number[];
}

/**
 * Serialized link:
 * [link_id, origin_id, origin_slot, target_id, target_slot, type_string]
 */
export type SerializedLink = [number, number, number, number, number, string];

/** Per-node execution status update from Python backend. */
export interface NodeStatusUpdate {
  node_id: number;
  status: "running" | "complete" | "error" | "skipped";
  result?: any;
  error?: string;
}

/** Final execution summary from Python backend. */
export interface ExecutionComplete {
  status: "complete" | "error";
  total_nodes?: number;
  completed?: number;
  failed?: number;
}

/** Dataset info returned by get_dataset_info(). */
export interface DatasetInfo {
  fields: string[];
  label_fields: string[];
  saved_views: string[];
  tags: string[];
}

/** Saved graph entry from the execution store. */
export interface SavedGraphEntry {
  id: string;
  name: string;
  saved_at: number;
}

/** Full saved graph with data. */
export interface SavedGraphData {
  id: string;
  name: string;
  graph: SerializedGraph;
  saved_at: number;
}
