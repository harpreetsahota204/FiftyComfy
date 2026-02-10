/**
 * FiftyComfy — Plugin entry point.
 *
 * Registers FiftyComfyView as a standalone JS panel (Pattern A),
 * exactly like the official Hello World example.
 * No Python Panel class — the panel IS this JS component.
 * Python operators handle all backend computation.
 */

import { registerComponent, PluginComponentType } from "@fiftyone/plugins";
import { registerOperator } from "@fiftyone/operators";
import FiftyComfyView from "./FiftyComfyView";
import { NodeStatusUpdateOperator, ExecutionCompleteOperator } from "./operators";

// Register the panel — this creates the panel in the FiftyOne App
registerComponent({
  name: "FiftyComfyView",
  label: "FiftyComfy",
  component: FiftyComfyView,
  type: PluginComponentType.Panel,
  activator: ({ dataset }: any) => !!dataset,
});

// Register TS operators for receiving Python execution status
const NS = "@harpreetsahota/FiftyComfy";
registerOperator(NodeStatusUpdateOperator, NS);
registerOperator(ExecutionCompleteOperator, NS);

console.log("[FiftyComfy] Panel and operators registered");
