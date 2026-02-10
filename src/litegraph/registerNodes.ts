/**
 * Register all FiftyOne node types with LiteGraph.
 *
 * Each import triggers LiteGraph.registerNodeType() calls in the
 * imported module. We only need to import them once.
 */

import "./nodes/source";
import "./nodes/viewStages";
import "./nodes/brain";
import "./nodes/aggregations";
import "./nodes/output";

let registered = false;

export function registerAllNodes(): void {
  if (registered) return;
  // The imports above already registered the nodes via side effects.
  registered = true;
}

/**
 * Update combo widget values on node types that need dynamic data.
 * Call this after fetching dataset info from the backend.
 */
export function updateDynamicWidgets(datasetInfo: {
  fields: string[];
  label_fields: string[];
  saved_views: string[];
  tags: string[];
}): void {
  // For now, dynamic widget population happens via onAdded callbacks
  // which we set up during node registration.
  // This function stores the latest dataset info so new nodes pick it up.
  (globalThis as any).__fiftycomfy_dataset_info = datasetInfo;
}
