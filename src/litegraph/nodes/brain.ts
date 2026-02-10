/**
 * Brain nodes — FiftyOne Brain computations.
 */

import { LiteGraph, LGraphNode } from "@comfyorg/litegraph";

// ─── Compute Embeddings ────────────────────────────────────────────

class FO_ComputeEmbeddings extends LGraphNode {
  static title = "Compute Embeddings";
  static desc = "Compute embeddings using a zoo model";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "model", "clip-vit-base32-torch", (v: string) => {
      this.properties.model = v;
    }, {
      values: [
        "clip-vit-base32-torch",
        "clip-vit-large14-torch",
        "open-clip-vit-b-32",
        "dinov2-vits14-torch",
      ],
    });

    this.addWidget("text", "embeddings_field", "embeddings", (v: string) => {
      this.properties.embeddings_field = v;
    });

    this.properties = {
      model: "clip-vit-base32-torch",
      embeddings_field: "embeddings",
    };
    this.size = [340, 100];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Embeddings", FO_ComputeEmbeddings);

// ─── Compute Visualization ─────────────────────────────────────────

class FO_ComputeVisualization extends LGraphNode {
  static title = "Compute Visualization";
  static desc = "Compute UMAP/t-SNE/PCA embedding visualization";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "brain_key", "visualization", (v: string) => {
      this.properties.brain_key = v;
    });

    this.addWidget("combo", "method", "umap", (v: string) => {
      this.properties.method = v;
    }, { values: ["umap", "tsne", "pca"] });

    this.addWidget("combo", "num_dims", "2", (v: string) => {
      this.properties.num_dims = parseInt(v);
    }, { values: ["2", "3"] });

    this.addWidget("text", "embeddings", "", (v: string) => {
      this.properties.embeddings = v;
    });

    this.properties = {
      brain_key: "visualization",
      method: "umap",
      num_dims: 2,
      embeddings: "",
    };
    this.size = [340, 150];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Visualization", FO_ComputeVisualization);

// ─── Compute Similarity ────────────────────────────────────────────

class FO_ComputeSimilarity extends LGraphNode {
  static title = "Compute Similarity";
  static desc = "Create a similarity index for nearest-neighbor queries";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "brain_key", "similarity", (v: string) => {
      this.properties.brain_key = v;
    });

    this.addWidget("combo", "backend", "sklearn", (v: string) => {
      this.properties.backend = v;
    }, { values: ["sklearn", "qdrant", "pinecone", "milvus", "lancedb"] });

    this.addWidget("text", "embeddings", "", (v: string) => {
      this.properties.embeddings = v;
    });

    this.properties = {
      brain_key: "similarity",
      backend: "sklearn",
      embeddings: "",
    };
    this.size = [340, 130];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Similarity", FO_ComputeSimilarity);

// ─── Compute Uniqueness ────────────────────────────────────────────

class FO_ComputeUniqueness extends LGraphNode {
  static title = "Compute Uniqueness";
  static desc = "Compute a uniqueness score for each sample";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "uniqueness_field", "uniqueness", (v: string) => {
      this.properties.uniqueness_field = v;
    });

    this.addWidget("text", "embeddings", "", (v: string) => {
      this.properties.embeddings = v;
    });

    this.properties = { uniqueness_field: "uniqueness", embeddings: "" };
    this.size = [320, 100];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Uniqueness", FO_ComputeUniqueness);

// ─── Compute Representativeness ────────────────────────────────────

class FO_ComputeRepresentativeness extends LGraphNode {
  static title = "Compute Representativeness";
  static desc = "Score how representative each sample is of its neighborhood";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "representativeness_field", "representativeness", (v: string) => {
      this.properties.representativeness_field = v;
    });

    this.addWidget("combo", "method", "cluster-center", (v: string) => {
      this.properties.method = v;
    }, { values: ["cluster-center", "cluster-center-downweight"] });

    this.addWidget("text", "embeddings", "", (v: string) => {
      this.properties.embeddings = v;
    });

    this.properties = {
      representativeness_field: "representativeness",
      method: "cluster-center",
      embeddings: "",
    };
    this.size = [360, 130];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Representativeness", FO_ComputeRepresentativeness);

// ─── Compute Mistakenness ──────────────────────────────────────────

class FO_ComputeMistakenness extends LGraphNode {
  static title = "Compute Mistakenness";
  static desc = "Estimate likelihood of annotation mistakes";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "pred_field", "", (v: string) => {
      this.properties.pred_field = v;
    }, { values: [] as string[] });

    this.addWidget("combo", "label_field", "", (v: string) => {
      this.properties.label_field = v;
    }, { values: [] as string[] });

    this.properties = { pred_field: "", label_field: "" };
    this.size = [320, 100];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Mistakenness", FO_ComputeMistakenness);

// ─── Compute Hardness ──────────────────────────────────────────────

class FO_ComputeHardness extends LGraphNode {
  static title = "Compute Hardness";
  static desc = "Compute sample hardness (how difficult to classify)";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("combo", "label_field", "", (v: string) => {
      this.properties.label_field = v;
    }, { values: [] as string[] });

    this.properties = { label_field: "" };
    this.size = [300, 70];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Compute Hardness", FO_ComputeHardness);

// ─── Find Exact Duplicates ─────────────────────────────────────────

class FO_ComputeExactDuplicates extends LGraphNode {
  static title = "Find Exact Duplicates";
  static desc = "Find samples with identical media files";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");
    this.properties = {};
    this.size = [280, 50];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Find Exact Duplicates", FO_ComputeExactDuplicates);

// ─── Find Near Duplicates ──────────────────────────────────────────

class FO_ComputeNearDuplicates extends LGraphNode {
  static title = "Find Near Duplicates";
  static desc = "Find near-duplicate samples using embeddings";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("number", "threshold", 0.1, (v: number) => {
      this.properties.threshold = v;
    }, { min: 0.001, max: 1.0, step: 0.01, precision: 3 });

    this.addWidget("text", "embeddings", "", (v: string) => {
      this.properties.embeddings = v;
    });

    this.properties = { threshold: 0.1, embeddings: "" };
    this.size = [320, 100];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Find Near Duplicates", FO_ComputeNearDuplicates);

// ─── Detect Leaky Splits ───────────────────────────────────────────

class FO_ComputeLeakySplits extends LGraphNode {
  static title = "Detect Leaky Splits";
  static desc = "Find data leaks across train/test/val splits";

  constructor() {
    super();
    this.addInput("view", "FO_VIEW");
    this.addOutput("view", "FO_VIEW");

    this.addWidget("text", "splits", "train,test", (v: string) => {
      this.properties.splits = v;
    });

    this.addWidget("number", "threshold", 0.1, (v: number) => {
      this.properties.threshold = v;
    }, { min: 0.001, max: 1.0, step: 0.01, precision: 3 });

    this.properties = { splits: "train,test", threshold: 0.1 };
    this.size = [320, 100];
    this.color = "#5B2C6F";
    this.bgcolor = "#4A235A";
  }
}

LiteGraph.registerNodeType("FiftyComfy/Brain/Detect Leaky Splits", FO_ComputeLeakySplits);

export {
  FO_ComputeEmbeddings,
  FO_ComputeVisualization,
  FO_ComputeSimilarity,
  FO_ComputeUniqueness,
  FO_ComputeRepresentativeness,
  FO_ComputeMistakenness,
  FO_ComputeHardness,
  FO_ComputeExactDuplicates,
  FO_ComputeNearDuplicates,
  FO_ComputeLeakySplits,
};
