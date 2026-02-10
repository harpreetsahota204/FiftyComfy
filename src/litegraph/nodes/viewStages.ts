/**
 * View Stage nodes — filter, sort, and transform FiftyOne views.
 */

import { LiteGraph, LGraphNode } from "@comfyorg/litegraph";

// ─── Match ─────────────────────────────────────────────────────────

class FO_Match extends LGraphNode {
  static title = "Match";
  static desc = "Filter samples by a ViewExpression";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "expression", "F('confidence') > 0.5", (v: string) => {
      this.properties.expression = v;
    });

    this.properties = { expression: "F('confidence') > 0.5" };
    this.size = [320, 80];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Match", FO_Match);

// ─── Filter Labels ─────────────────────────────────────────────────

class FO_FilterLabels extends LGraphNode {
  static title = "Filter Labels";
  static desc = "Filter detections/classifications within a label field";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "field", "", (v: string) => {
      this.properties.field = v;
    }, { values: [] as string[] }); // Populated dynamically

    this.addWidget("text", "expression", "F('confidence') > 0.5", (v: string) => {
      this.properties.expression = v;
    });

    this.addWidget("toggle", "only_matches", true, (v: boolean) => {
      this.properties.only_matches = v;
    });

    this.properties = { field: "", expression: "F('confidence') > 0.5", only_matches: true };
    this.size = [320, 130];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Filter Labels", FO_FilterLabels);

// ─── Sort By ───────────────────────────────────────────────────────

class FO_SortBy extends LGraphNode {
  static title = "Sort By";
  static desc = "Sort samples by a field";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "field", "", (v: string) => {
      this.properties.field = v;
    }, { values: [] as string[] }); // Populated dynamically

    this.addWidget("toggle", "reverse", false, (v: boolean) => {
      this.properties.reverse = v;
    });

    this.properties = { field: "", reverse: false };
    this.size = [280, 90];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Sort By", FO_SortBy);

// ─── Limit ─────────────────────────────────────────────────────────

class FO_Limit extends LGraphNode {
  static title = "Limit";
  static desc = "Limit number of samples";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("number", "count", 100, (v: number) => {
      this.properties.count = v;
    }, { min: 1, max: 100000, step: 10 });

    this.properties = { count: 100 };
    this.size = [220, 70];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Limit", FO_Limit);

// ─── Exists ────────────────────────────────────────────────────────

class FO_Exists extends LGraphNode {
  static title = "Exists";
  static desc = "Filter samples where a field exists (is not None)";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "field", "", (v: string) => {
      this.properties.field = v;
    }, { values: [] as string[] });

    this.addWidget("toggle", "bool", true, (v: boolean) => {
      this.properties.bool = v;
    });

    this.properties = { field: "", bool: true };
    this.size = [260, 90];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Exists", FO_Exists);

// ─── Match Tags ────────────────────────────────────────────────────

class FO_MatchTags extends LGraphNode {
  static title = "Match Tags";
  static desc = "Filter samples by tags (comma-separated)";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "tags", "", (v: string) => {
      this.properties.tags = v;
    });

    this.properties = { tags: "" };
    this.size = [280, 70];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Match Tags", FO_MatchTags);

// ─── Take ──────────────────────────────────────────────────────────

class FO_Take extends LGraphNode {
  static title = "Take";
  static desc = "Randomly sample N samples from the view";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("number", "count", 100, (v: number) => {
      this.properties.count = v;
    }, { min: 1, max: 100000, step: 10 });

    this.addWidget("number", "seed", 0, (v: number) => {
      this.properties.seed = v || null;
    }, { min: 0, max: 99999, step: 1 });

    this.properties = { count: 100, seed: null };
    this.size = [240, 90];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Take", FO_Take);

// ─── Shuffle ───────────────────────────────────────────────────────

class FO_Shuffle extends LGraphNode {
  static title = "Shuffle";
  static desc = "Randomly shuffle the samples";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("number", "seed", 0, (v: number) => {
      this.properties.seed = v || null;
    }, { min: 0, max: 99999, step: 1 });

    this.properties = { seed: null };
    this.size = [220, 70];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Shuffle", FO_Shuffle);

// ─── Select Fields ─────────────────────────────────────────────────

class FO_SelectFields extends LGraphNode {
  static title = "Select Fields";
  static desc = "Select only specified fields (comma-separated)";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "fields", "", (v: string) => {
      this.properties.fields = v;
    });

    this.properties = { fields: "" };
    this.size = [280, 70];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Select Fields", FO_SelectFields);

// ─── Exclude Fields ────────────────────────────────────────────────

class FO_ExcludeFields extends LGraphNode {
  static title = "Exclude Fields";
  static desc = "Exclude specified fields (comma-separated)";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "fields", "", (v: string) => {
      this.properties.fields = v;
    });

    this.properties = { fields: "" };
    this.size = [280, 70];
    this.color = "#2A633A";
    this.bgcolor = "#1E4A2B";
  }
}

LiteGraph.registerNodeType("FiftyComfy/View Stages/Exclude Fields", FO_ExcludeFields);

export {
  FO_Match,
  FO_FilterLabels,
  FO_SortBy,
  FO_Limit,
  FO_Exists,
  FO_MatchTags,
  FO_Take,
  FO_Shuffle,
  FO_SelectFields,
  FO_ExcludeFields,
};
