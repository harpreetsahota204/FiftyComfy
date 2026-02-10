/**
 * FiftyComfy — DEBUG v2 entry point.
 * 
 * Registration as Panel type=2 succeeds but component isn't found.
 * This version logs all available types and tries multiple
 * registration strategies.
 */

import * as React from "react";
import * as plugins from "@fiftyone/plugins";

// ─── Component ─────────────────────────────────────────────────────
function FiftyComfyView() {
  return React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a2e",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontSize: "24px",
      },
    },
    "FiftyComfy loaded!"
  );
}

// ─── Debug: log all available exports ──────────────────────────────
console.log("[FiftyComfy] All plugin exports:", Object.keys(plugins || {}));
console.log("[FiftyComfy] PluginComponentType:", (plugins as any).PluginComponentType);
console.log("[FiftyComfy] PluginComponentTypes:", (plugins as any).PluginComponentTypes);

// Log every export and its type
for (const [key, val] of Object.entries(plugins as any)) {
  console.log(`[FiftyComfy]   ${key}: ${typeof val}${typeof val === 'object' ? ' = ' + JSON.stringify(val) : ''}`);
}

// ─── Try EVERY possible component type ─────────────────────────────
const registerFn = (plugins as any).registerComponent;

if (registerFn) {
  // Get all type enum values
  const typeEnum = (plugins as any).PluginComponentType || (plugins as any).PluginComponentTypes || {};
  console.log("[FiftyComfy] Type enum values:", JSON.stringify(typeEnum));

  // Try each type value
  for (const [typeName, typeValue] of Object.entries(typeEnum)) {
    try {
      registerFn({
        name: "FiftyComfyView",
        component: FiftyComfyView,
        type: typeValue,
        activator: ({ dataset }: any) => !!dataset,
      });
      console.log(`[FiftyComfy] ✓ Registered with type ${typeName}=${typeValue}`);
    } catch (e: any) {
      console.log(`[FiftyComfy] ✗ Failed with type ${typeName}=${typeValue}: ${e.message}`);
    }
  }
  
  // Also try with NO type at all
  try {
    registerFn({
      name: "FiftyComfyView",
      component: FiftyComfyView,
    });
    console.log("[FiftyComfy] ✓ Registered with NO type");
  } catch (e: any) {
    console.log(`[FiftyComfy] ✗ Failed with no type: ${e.message}`);
  }

  // Also try with string type
  try {
    registerFn({
      name: "FiftyComfyView",
      component: FiftyComfyView,
      type: "Panel",
    });
    console.log('[FiftyComfy] ✓ Registered with type "Panel"');
  } catch (e: any) {
    console.log(`[FiftyComfy] ✗ Failed with string type: ${e.message}`);
  }
} else {
  console.error("[FiftyComfy] registerComponent not found!");
}

console.log("[FiftyComfy] Done with all registration attempts");
