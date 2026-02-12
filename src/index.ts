/**
 * FiftyComfy — Plugin entry point.
 *
 * Per the official FiftyOne docs "Custom operator view using component plugin":
 * When a Python panel references a JS component via
 *   view=types.View(component="FiftyComfyView")
 * the JS side must register that component with type = Component (3),
 * NOT Panel (2).
 *
 * See: https://docs.voxel51.com/plugins/developing_plugins.html#custom-operator-view-using-component-plugin
 */

import { registerComponent, PluginComponentType } from "@fiftyone/plugins";
import { registerOperator } from "@fiftyone/operators";
import FiftyComfyView from "./FiftyComfyView";
import { NodeStatusUpdateOperator, ExecutionCompleteOperator, DatasetInfoLoadedOperator } from "./operators";

// Register as Component (type 3) — this is what composite_view looks up
registerComponent({
  name: "FiftyComfyView",
  component: FiftyComfyView,
  type: PluginComponentType.Component,
  activator: () => true,
});

// Register TS operators
const NS = "@harpreetsahota/FiftyComfy";
registerOperator(NodeStatusUpdateOperator, NS);
registerOperator(ExecutionCompleteOperator, NS);
registerOperator(DatasetInfoLoadedOperator, NS);

console.log("[FiftyComfy] Component (type=3) and operators registered");
