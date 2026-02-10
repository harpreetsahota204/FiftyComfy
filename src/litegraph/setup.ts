/**
 * LiteGraph initialization — create LGraph + LGraphCanvas with
 * ComfyUI-style defaults.
 */

import { LGraph, LGraphCanvas, LiteGraph } from "@comfyorg/litegraph";

/** Custom FO_VIEW link type color (light blue noodles). */
function registerCustomTypes() {
  // @ts-ignore — LiteGraph link type color registry
  if (LiteGraph.registered_link_types) {
    // @ts-ignore
    LiteGraph.registered_link_types["FO_VIEW"] = { color: "#4FC3F7" };
  }
}

export interface LiteGraphInstance {
  graph: LGraph;
  canvas: LGraphCanvas;
}

/**
 * Initialize LiteGraph with a canvas element.
 *
 * @param canvasEl The HTML canvas element to bind to
 * @returns The LGraph + LGraphCanvas instances
 */
export function initLiteGraph(canvasEl: HTMLCanvasElement): LiteGraphInstance {
  registerCustomTypes();

  const graph = new LGraph();
  const canvas = new LGraphCanvas(canvasEl, graph);

  // ----- ComfyUI-style defaults -----
  canvas.render_shadows = false;
  canvas.max_zoom = 4;
  canvas.min_zoom = 0.1;
  canvas.allow_searchbox = true;
  canvas.show_searchbox_on_double_click = true;

  // Dark theme background
  canvas.background_image = undefined as any;
  canvas.clear_background_color = "#1e1e1e";

  // Snap to grid for tidy layouts
  canvas.align_to_grid = false;

  // Default link appearance
  canvas.render_curved_connections = true;
  canvas.render_connection_arrows = false;

  // Start the render loop
  graph.start();

  return { graph, canvas };
}
