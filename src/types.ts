/**
 * Core TypeScript interfaces for FiftyComfy.
 */

export type NodeCategory =
  | "source"
  | "view_stage"
  | "brain"
  | "aggregation"
  | "output";

export type HandleType = "view";

export type NodeStatus =
  | "idle"
  | "pending"
  | "running"
  | "complete"
  | "error"
  | "skipped";

export type ParamType = "string" | "int" | "float" | "bool" | "enum" | "list";

export interface ParamSchema {
  type: ParamType;
  label: string;
  default: any;
  required: boolean;
  description?: string;
  placeholder?: string;
  values?: string[];
  dynamic?: boolean;
  min?: number;
  max?: number;
  item_type?: string;
}

export interface NodeTypeDef {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  color: string;
  inputs: HandleType[];
  outputs: HandleType[];
  paramsSchema: Record<string, ParamSchema>;
}

export interface GraphNodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  params: Record<string, any>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface GraphData {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface GraphIndexEntry {
  id: string;
  name: string;
  description?: string;
  updated_at: string;
  node_count?: number;
}

export interface NodeExecutionState {
  nodeId: string;
  status: NodeStatus;
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface ComfyNodeData {
  label: string;
  nodeType: string;
  category: NodeCategory;
  color: string;
  description: string;
  params: Record<string, any>;
  paramsSchema: Record<string, ParamSchema>;
  inputs: HandleType[];
  outputs: HandleType[];
  status: NodeStatus;
  progress?: number;
  statusMessage?: string;
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface ValidationError {
  node_id?: string;
  message: string;
  field?: string;
}
