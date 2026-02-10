/**
 * FiftyComfy — Plugin entry point.
 *
 * Uses static imports so Vite properly externalizes @fiftyone/* packages
 * in the UMD wrapper. LiteGraph code is imported but node registration
 * only runs lazily inside the React component's useEffect.
 */

// Static imports — these become UMD externals
import * as plugins from "@fiftyone/plugins";
import * as fooOperators from "@fiftyone/operators";
import FiftyComfyView from "./FiftyComfyView";
import { NodeStatusUpdateOperator, ExecutionCompleteOperator } from "./operators";

// ─── Register the panel view component ─────────────────────────────
try {
  const registerComponent = (plugins as any).registerComponent;
  // Handle both naming conventions across FiftyOne versions
  const panelType =
    (plugins as any).PluginComponentType?.Panel ??
    (plugins as any).PluginComponentTypes?.Panel ??
    "Panel";

  if (registerComponent) {
    registerComponent({
      name: "FiftyComfyView",
      component: FiftyComfyView,
      type: panelType,
      activator: ({ dataset }: any) => !!dataset,
    });
    console.log("[FiftyComfy] Component registered");
  } else {
    console.error("[FiftyComfy] registerComponent not found in @fiftyone/plugins");
  }
} catch (e) {
  console.error("[FiftyComfy] Component registration failed:", e);
}

// ─── Register TypeScript operators ─────────────────────────────────
try {
  const registerOperator = (fooOperators as any).registerOperator;
  if (registerOperator) {
    const NS = "@harpreetsahota/FiftyComfy";
    registerOperator(NodeStatusUpdateOperator, NS);
    registerOperator(ExecutionCompleteOperator, NS);
    console.log("[FiftyComfy] Operators registered");
  }
} catch (e) {
  console.error("[FiftyComfy] Operator registration failed:", e);
}
