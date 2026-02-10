/**
 * Output nodes — push results back into the FiftyOne App.
 */

import { LiteGraph, LGraphNode } from "@comfyorg/litegraph";

// ─── Set App View ──────────────────────────────────────────────────

class FO_SetAppView extends LGraphNode {
  static title = "Set App View";
  static desc = "Push the resulting view into the FiftyOne App";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.properties = {};
    this.size = [220, 50];
    this.color = "#922B21";
    this.bgcolor = "#7B241C";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Output/Set App View", FO_SetAppView);

// ─── Save View ─────────────────────────────────────────────────────

class FO_SaveView extends LGraphNode {
  static title = "Save View";
  static desc = "Save the view as a named saved view on the dataset";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");

    this.addWidget("text", "name", "my_view", (v: string) => {
      this.properties.name = v;
    });

    this.addWidget("text", "description", "", (v: string) => {
      this.properties.description = v;
    });

    this.addWidget("toggle", "overwrite", false, (v: boolean) => {
      this.properties.overwrite = v;
    });

    this.properties = { name: "my_view", description: "", overwrite: false };
    this.size = [300, 120];
    this.color = "#922B21";
    this.bgcolor = "#7B241C";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Output/Save View", FO_SaveView);

export { FO_SetAppView, FO_SaveView };
