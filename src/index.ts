/**
 * FiftyComfy plugin entry point.
 *
 * Registers the FiftyComfy panel component and TypeScript operators
 * with the FiftyOne plugin system.
 */

import { FiftyComfyView } from "./FiftyComfyView";
import { registerOperators } from "./operators";

// Access the FiftyOne plugins SDK from the global scope
const fop = (window as any).__fop__;

// Register the main panel component
if (fop?.registerComponent) {
  fop.registerComponent({
    name: "FiftyComfyView",
    component: FiftyComfyView,
    type: fop.PluginComponentTypes?.Panel,
    activator: ({ dataset }: any) => dataset !== null,
    surfaces: "grid",
    label: "FiftyComfy",
  });
} else {
  console.warn("[FiftyComfy] @fiftyone/plugins not available");
}

// Register TypeScript operators for backend -> frontend events
registerOperators();
