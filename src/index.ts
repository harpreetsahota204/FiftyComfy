/**
 * FiftyComfy — Plugin entry point.
 *
 * Registers the React panel component and TypeScript event-handler operators.
 */

import { registerComponent, PluginComponentType } from "@fiftyone/plugins";
import FiftyComfyView from "./FiftyComfyView";
import { registerOperators } from "./operators";

// Import LiteGraph CSS for proper node rendering
import "@comfyorg/litegraph/style.css";

// Register the panel component
registerComponent({
  name: "FiftyComfyView",
  component: FiftyComfyView,
  type: PluginComponentType.Panel,
  activator: ({ dataset }: any) => !!dataset,
});

// Register TypeScript operators (receive Python triggers)
registerOperators();
