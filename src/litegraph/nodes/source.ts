/**
 * Source nodes — entry points for FiftyComfy graphs.
 */

import { LiteGraph, LGraphNode } from "@comfyorg/litegraph";

// ─── Current Dataset ───────────────────────────────────────────────

class FO_LoadDataset extends LGraphNode {
  static title = "Current Dataset";
  static desc = "Use the dataset currently loaded in the App";

  constructor() {
    super();
    this.addOutput("view", "FO_VIEW");
    this.properties = {};
    this.size = [220, 50];
    this.color = "#1B4F72";
    this.bgcolor = "#154360";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Source/Current Dataset", FO_LoadDataset);

// ─── Load Saved View ───────────────────────────────────────────────

class FO_LoadSavedView extends LGraphNode {
  static title = "Load Saved View";
  static desc = "Load a saved view from the dataset";

  constructor() {
    super();
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "view_name", "", (v: string) => {
      this.properties.view_name = v;
    }, { values: [] as string[] }); // Populated dynamically from dataset

    this.properties = { view_name: "" };
    this.size = [280, 70];
    this.color = "#1B4F72";
    this.bgcolor = "#154360";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Source/Load Saved View", FO_LoadSavedView);

export { FO_LoadDataset, FO_LoadSavedView };
