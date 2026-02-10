/**
 * Export all custom node types for React Flow registration.
 *
 * All categories use the same BaseNode component since
 * BaseNode already renders differently based on data.category.
 * We register separate types so React Flow's `type` field maps correctly.
 */

import { BaseNode } from "./BaseNode";

export const nodeTypes = {
  source: BaseNode,
  view_stage: BaseNode,
  brain: BaseNode,
  aggregation: BaseNode,
  output: BaseNode,
};
