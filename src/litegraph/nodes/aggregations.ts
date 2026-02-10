/**
 * Aggregation nodes — compute statistics and display results on node.
 */

import { LiteGraph, LGraphNode } from "@comfyorg/litegraph";

// ─── Count ─────────────────────────────────────────────────────────

class FO_Count extends LGraphNode {
  static title = "Count";
  static desc = "Count samples in the view";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    // No output — terminal/display node
    this.properties = { result: null };
    this.size = [200, 70];
    this.color = "#7D6608";
    this.bgcolor = "#5C4B08";
  }

  onDrawForeground(ctx: CanvasRenderingContext2D) {
    if (this.properties.result !== null && this.properties.result !== undefined) {
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.fillText(
        String(this.properties.result),
        this.size[0] / 2,
        this.size[1] - 15
      );
    }
  }
}

LiteGraph.registerNodeType("FiftyComfy/Aggregations/Count", FO_Count);

// ─── Count Values ──────────────────────────────────────────────────

class FO_CountValues extends LGraphNode {
  static title = "Count Values";
  static desc = "Count occurrences of each value in a field";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");

    this.addWidget("combo", "field", "", (v: string) => {
      this.properties.field = v;
    }, { values: [] as string[] });

    this.properties = { field: "", result: null };
    this.size = [300, 140];
    this.color = "#7D6608";
    this.bgcolor = "#5C4B08";
  }

  onDrawForeground(ctx: CanvasRenderingContext2D) {
    if (this.properties.result) {
      ctx.font = "12px monospace";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "left";
      let y = 70;
      const entries = Object.entries(this.properties.result).slice(0, 5);
      for (const [key, val] of entries) {
        ctx.fillText(`${key}: ${val}`, 10, y);
        y += 16;
      }
      if (Object.keys(this.properties.result).length > 5) {
        ctx.fillText("...", 10, y);
      }
    }
  }
}

LiteGraph.registerNodeType("FiftyComfy/Aggregations/Count Values", FO_CountValues);

// ─── Distinct ──────────────────────────────────────────────────────

class FO_Distinct extends LGraphNode {
  static title = "Distinct";
  static desc = "Get distinct values for a field";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");

    this.addWidget("combo", "field", "", (v: string) => {
      this.properties.field = v;
    }, { values: [] as string[] });

    this.properties = { field: "", result: null };
    this.size = [280, 120];
    this.color = "#7D6608";
    this.bgcolor = "#5C4B08";
  }

  onDrawForeground(ctx: CanvasRenderingContext2D) {
    if (this.properties.result) {
      ctx.font = "12px monospace";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "left";
      const vals = (this.properties.result as any[]).slice(0, 6);
      let y = 70;
      for (const val of vals) {
        ctx.fillText(String(val), 10, y);
        y += 16;
      }
      if (this.properties.result.length > 6) {
        ctx.fillText("...", 10, y);
      }
    }
  }
}

LiteGraph.registerNodeType("FiftyComfy/Aggregations/Distinct", FO_Distinct);

// ─── Bounds ────────────────────────────────────────────────────────

class FO_Bounds extends LGraphNode {
  static title = "Bounds";
  static desc = "Get min/max bounds for a numeric field";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");

    this.addWidget("combo", "field", "", (v: string) => {
      this.properties.field = v;
    }, { values: [] as string[] });

    this.properties = { field: "", result: null };
    this.size = [240, 90];
    this.color = "#7D6608";
    this.bgcolor = "#5C4B08";
  }

  onDrawForeground(ctx: CanvasRenderingContext2D) {
    if (this.properties.result) {
      const [min, max] = this.properties.result;
      ctx.font = "14px monospace";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "left";
      ctx.fillText(`[${min}, ${max}]`, 10, this.size[1] - 15);
    }
  }
}

LiteGraph.registerNodeType("FiftyComfy/Aggregations/Bounds", FO_Bounds);

export { FO_Count, FO_CountValues, FO_Distinct, FO_Bounds };
