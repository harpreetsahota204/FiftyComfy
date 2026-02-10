/**
 * FiftyComfy — DEBUG entry point.
 * Adds visible markers to determine if the bundle is even loading.
 */

import * as React from "react";
import * as plugins from "@fiftyone/plugins";
import * as fooOperators from "@fiftyone/operators";

// ─── Visible debug marker ──────────────────────────────────────────
// This will tell us if the bundle is loading at all
(function debugMarker() {
  try {
    console.log("[FiftyComfy] Bundle executing...");
    console.log("[FiftyComfy] plugins module:", plugins);
    console.log("[FiftyComfy] plugins keys:", Object.keys(plugins || {}));
    console.log("[FiftyComfy] operators module:", fooOperators);
    console.log("[FiftyComfy] __fop__:", typeof (globalThis as any).__fop__);
    console.log("[FiftyComfy] React:", typeof React);
    
    // Visible marker in DOM
    const marker = document.createElement("div");
    marker.id = "fiftycomfy-debug";
    marker.style.cssText = "position:fixed;bottom:10px;right:10px;background:#2d6a4f;color:white;padding:8px 16px;border-radius:8px;z-index:99999;font-family:monospace;font-size:12px;pointer-events:none;";
    marker.textContent = "FiftyComfy JS loaded";
    document.body.appendChild(marker);
    setTimeout(() => marker.remove(), 10000);
  } catch (e) {
    console.error("[FiftyComfy] Debug marker error:", e);
  }
})();

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

// ─── Register ──────────────────────────────────────────────────────
try {
  const registerFn = (plugins as any).registerComponent;
  console.log("[FiftyComfy] registerComponent:", typeof registerFn);
  
  if (registerFn) {
    const panelType =
      (plugins as any).PluginComponentType?.Panel ??
      (plugins as any).PluginComponentTypes?.Panel ??
      "Panel";
    
    console.log("[FiftyComfy] Panel type:", panelType);
    
    registerFn({
      name: "FiftyComfyView",
      component: FiftyComfyView,
      type: panelType,
      activator: ({ dataset }: any) => !!dataset,
    });
    console.log("[FiftyComfy] ✓ Component registered successfully");
  } else {
    console.error("[FiftyComfy] ✗ registerComponent is", registerFn);
    console.error("[FiftyComfy] Available in plugins:", Object.keys(plugins || {}));
  }
} catch (e) {
  console.error("[FiftyComfy] ✗ Registration error:", e);
}
