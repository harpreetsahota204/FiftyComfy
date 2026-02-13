/**
 * FiftyComfyView — LiteGraph canvas panel component.
 *
 * Singleton pattern: _graph survives React remounts (panel move/resize).
 * Each mount creates a fresh LGraphCanvas bound to the new DOM canvas element,
 * and reattaches the existing graph to it.
 */

import * as React from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { executeOperator } from "@fiftyone/operators";
import { LGraph, LGraphCanvas, LiteGraph } from "@comfyorg/litegraph";
import litegraphCss from "@comfyorg/litegraph/style.css?inline";
import { registerAllNodes, setDatasetInfo, updateAllComboWidgets, hookNodeAdded, installSearchFilter } from "./litegraph/registerNodes";
import { onEvent } from "./operators";
import { BUILTIN_TEMPLATES, BuiltinTemplate } from "./templates";

const NS = "@harpreetsahota/FiftyComfy";

// ─── Module-level singleton (survives React remounts) ──────────────
let _graph: LGraph | null = null;
let _lgCanvas: LGraphCanvas | null = null;
let _initialized = false;
let _cssInjected = false;
let _currentDatasetName: string = "";

// ─── Styles ────────────────────────────────────────────────────────
const TH = 36;

const toolbarCss: React.CSSProperties = {
  position: "absolute",
  top: 0, left: 0, right: 0,
  height: TH,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "0 8px",
  background: "rgba(20,20,20,0.85)",
  backdropFilter: "blur(4px)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontFamily: "'Inter','Segoe UI',sans-serif",
};

const btnCss: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 4,
  background: "rgba(255,255,255,0.08)",
  color: "#ccc",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "20px",
};

const btnRunCss: React.CSSProperties = {
  ...btnCss,
  background: "#2d6a4f",
  borderColor: "#40916c",
  color: "#fff",
  fontWeight: 600,
};

const sepCss: React.CSSProperties = {
  width: 1, height: 20,
  background: "rgba(255,255,255,0.1)",
  margin: "0 2px",
};

const panelCss: React.CSSProperties = {
  position: "absolute", top: TH + 4, left: 50, zIndex: 20,
  background: "#2a2a2a", border: "1px solid #555", borderRadius: 6,
  padding: 10, minWidth: 320, maxWidth: 420, maxHeight: 480, overflowY: "auto" as const,
  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
};

const sectionHeaderCss: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "#888",
  textTransform: "uppercase" as const, letterSpacing: "0.5px",
  margin: "10px 0 4px 0", padding: "0 4px",
};

const itemCss: React.CSSProperties = {
  padding: "5px 8px", cursor: "pointer", borderRadius: 4,
  fontSize: 12, color: "#ddd", display: "flex",
  justifyContent: "space-between", alignItems: "center",
};

const descCss: React.CSSProperties = {
  fontSize: 10, color: "#777", marginTop: 1,
};

const deleteBtnCss: React.CSSProperties = {
  fontSize: 10, color: "#888", cursor: "pointer",
  padding: "2px 6px", borderRadius: 3, border: "none",
  background: "transparent",
};

const savePanelCss: React.CSSProperties = {
  ...panelCss, minWidth: 280, maxWidth: 320, maxHeight: "none",
};

// ─── Types for saved workflows ─────────────────────────────────────
interface SavedEntry {
  id: string;
  name: string;
  saved_at: number;
}

// ─── Fetch dataset info ─────────────────────────────────────────────
let _datasetInfoListenerSet = false;

function setupDatasetInfoListener() {
  if (_datasetInfoListenerSet) return;
  _datasetInfoListenerSet = true;

  onEvent("dataset_info", (info: any) => {
    if (info && info.fields) {
      const newName = info.dataset_name || "";

      if (_currentDatasetName && newName && newName !== _currentDatasetName) {
        console.log(`[FiftyComfy] Dataset changed: ${_currentDatasetName} -> ${newName}, clearing canvas`);
        if (_graph) _graph.clear();
      }

      _currentDatasetName = newName;
      setDatasetInfo(info);
      if (_graph) updateAllComboWidgets(_graph);
      console.log(
        "[FiftyComfy] Dataset info received:",
        newName + ",",
        info.fields?.length, "fields,",
        info.label_fields?.length, "label fields"
      );
    }
  });
}

function fetchDatasetInfo() {
  setupDatasetInfoListener();
  executeOperator(`${NS}/get_dataset_info`, {})
    .catch((e: any) => {
      console.warn("[FiftyComfy] Could not fetch dataset info:", e);
    });
}

// ─── Component ─────────────────────────────────────────────────────

export default function FiftyComfyView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);

  // Templates panel state (built-in)
  const [showTemplates, setShowTemplates] = useState(false);

  // Saved (custom) panel state
  const [showSaved, setShowSaved] = useState(false);
  const [datasetTemplates, setDatasetTemplates] = useState<SavedEntry[]>([]);
  const [sharedTemplates, setSharedTemplates] = useState<SavedEntry[]>([]);

  // Save dialog state
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveScope, setSaveScope] = useState<"dataset" | "shared">("dataset");

  // ---- Init LiteGraph (singleton graph, fresh canvas per mount) ----
  useEffect(() => {
    const el = canvasRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    if (!_cssInjected) {
      const style = document.createElement("style");
      style.id = "fiftycomfy-lg-css";
      style.textContent = litegraphCss;
      document.head.appendChild(style);
      _cssInjected = true;
    }

    if (!_initialized) {
      registerAllNodes();
      (LiteGraph as any).allow_edit_node_title = false;
      (LiteGraph as any).NODE_TEXT_COLOR = "#FFFFFF";
      (LiteGraph as any).NODE_TITLE_COLOR = "#FFFFFF";
      (LiteGraph as any).WIDGET_TEXT_COLOR = "#FFFFFF";
      (LiteGraph as any).DEFAULT_LINK_COLOR = "#99ccff";
      (LiteGraph as any).LINK_COLOR = "#99ccff";
      (LiteGraph as any).EVENT_LINK_COLOR = "#ff9966";
      (LiteGraph as any).registered_link_types = (LiteGraph as any).registered_link_types || {};
      (LiteGraph as any).registered_link_types["FO_VIEW"] = { color: "#4FC3F7" };
      _initialized = true;
    }

    if (!_graph) {
      _graph = new LGraph();
      hookNodeAdded(_graph);
    }

    if (_lgCanvas) {
      try { (_lgCanvas as any).setGraph(null); } catch { /* ignore */ }
      _lgCanvas = null;
    }

    _lgCanvas = new LGraphCanvas(el, _graph);
    _lgCanvas.render_shadows = false;
    _lgCanvas.max_zoom = 4;
    _lgCanvas.min_zoom = 0.1;
    _lgCanvas.allow_searchbox = true;
    (_lgCanvas as any).show_searchbox_on_double_click = true;
    _lgCanvas.render_curved_connections = true;
    (_lgCanvas as any).render_connection_arrows = false;
    (_lgCanvas as any).connections_width = 3;
    (_lgCanvas as any).default_connection_color = {
      input_off: "#888", input_on: "#4FC3F7",
      output_off: "#888", output_on: "#4FC3F7",
    };
    (_lgCanvas as any).autoresize = true;
    installSearchFilter(_lgCanvas);
    _graph.start();
    fetchDatasetInfo();

    const doResize = () => { if (_lgCanvas) (_lgCanvas as any).resize(); };
    doResize();
    requestAnimationFrame(doResize);
    setTimeout(doResize, 100);
    const ro = new ResizeObserver(doResize);
    ro.observe(container);

    return () => { ro.disconnect(); };
  }, []);

  // ---- Load a graph from serialized data ----
  const loadGraphData = useCallback((data: any, label: string) => {
    if (!_graph || !data) return;
    _graph.configure(data);
    updateAllComboWidgets(_graph);
    setStatus("Loaded: " + label);
    setShowTemplates(false);
    setShowSaved(false);
  }, []);

  // ---- Run Workflow ----
  const handleRun = useCallback(async () => {
    if (!_graph) return;
    for (const n of (_graph as any)._nodes || []) {
      n.boxcolor = null;
      n.setDirtyCanvas(true, true);
    }
    setRunning(true);
    setStatus("Running...");
    try {
      await executeOperator(`${NS}/execute_graph`, {
        graph_json: JSON.stringify(_graph.serialize()),
      });
    } catch (e: any) {
      console.error("[FiftyComfy] Execution error:", e);
    }
    setRunning(false);
    setStatus("Done");
  }, []);

  // ---- Save workflow (server-side) ----
  const handleSaveOpen = useCallback(() => {
    setSaveName("");
    setSaveScope("dataset");
    setShowSave(true);
    setShowTemplates(false);
    setShowSaved(false);
  }, []);

  const handleSaveConfirm = useCallback(async () => {
    if (!_graph || !saveName.trim()) return;
    const graphJson = JSON.stringify(_graph.serialize());
    const op = saveScope === "shared" ? "save_shared_graph" : "save_graph";
    try {
      await executeOperator(`${NS}/${op}`, {
        name: saveName.trim(),
        graph_json: graphJson,
      });
      setStatus(`Saved: ${saveName.trim()} (${saveScope})`);
    } catch (e: any) {
      console.error("[FiftyComfy] Save error:", e);
      setStatus("Save failed");
    }
    setShowSave(false);
  }, [saveName, saveScope]);

  // ---- Open Templates panel (built-in) ----
  const handleTemplatesOpen = useCallback(() => {
    setShowTemplates(true);
    setShowSaved(false);
    setShowSave(false);
  }, []);

  // ---- Open Saved panel (custom user workflows) ----
  const handleSavedOpen = useCallback(async () => {
    setShowSaved(true);
    setShowTemplates(false);
    setShowSave(false);

    // Fetch dataset templates
    try {
      const result = await executeOperator(`${NS}/load_graphs`, {});
      setDatasetTemplates((result as any)?.result?.graphs || []);
    } catch {
      setDatasetTemplates([]);
    }

    // Fetch shared templates
    try {
      const result = await executeOperator(`${NS}/load_shared_graphs`, {});
      setSharedTemplates((result as any)?.result?.graphs || []);
    } catch {
      setSharedTemplates([]);
    }
  }, []);

  // ---- Load a specific saved workflow by ID ----
  const handleLoadSaved = useCallback(async (graphId: string, scope: "dataset" | "shared") => {
    const op = scope === "shared" ? "load_shared_graph" : "load_graph";
    try {
      const result = await executeOperator(`${NS}/${op}`, { graph_id: graphId });
      const data = (result as any)?.result?.data;
      if (data?.graph) {
        loadGraphData(data.graph, data.name || graphId);
      }
    } catch (e: any) {
      console.error("[FiftyComfy] Load error:", e);
      setStatus("Load failed");
    }
  }, [loadGraphData]);

  // ---- Delete a saved workflow ----
  const handleDelete = useCallback(async (graphId: string, scope: "dataset" | "shared") => {
    const op = scope === "shared" ? "delete_shared_graph" : "delete_graph";
    try {
      await executeOperator(`${NS}/${op}`, { graph_id: graphId });
      // Refresh the list
      if (scope === "dataset") {
        setDatasetTemplates((prev) => prev.filter((t) => t.id !== graphId));
      } else {
        setSharedTemplates((prev) => prev.filter((t) => t.id !== graphId));
      }
      setStatus("Deleted");
    } catch (e: any) {
      console.error("[FiftyComfy] Delete error:", e);
    }
  }, []);

  // ---- Load a built-in template ----
  const handleLoadBuiltin = useCallback((template: BuiltinTemplate) => {
    loadGraphData(template.graph, template.name);
  }, [loadGraphData]);

  // ---- Clear ----
  const handleClear = useCallback(() => {
    if (_graph) _graph.clear();
    setStatus("Ready");
  }, []);

  // ---- Group built-in templates by category ----
  const builtinByCategory: Record<string, BuiltinTemplate[]> = {};
  for (const t of BUILTIN_TEMPLATES) {
    if (!builtinByCategory[t.category]) builtinByCategory[t.category] = [];
    builtinByCategory[t.category].push(t);
  }

  // ---- Render ----
  return React.createElement("div", {
    ref: containerRef,
    style: { width: "100%", height: "100%", position: "relative", overflow: "hidden" },
  },
    // Canvas
    React.createElement("canvas", {
      ref: canvasRef,
      style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
    }),

    // Toolbar
    React.createElement("div", { style: toolbarCss },
      React.createElement("button", {
        style: btnRunCss, onClick: handleRun, disabled: running,
      }, running ? "Running..." : "\u25B6 Run Workflow"),
      React.createElement("div", { style: sepCss }),
      React.createElement("button", { style: btnCss, onClick: handleTemplatesOpen }, "Templates"),
      React.createElement("button", { style: btnCss, onClick: handleSavedOpen }, "Saved"),
      React.createElement("div", { style: sepCss }),
      React.createElement("button", { style: btnCss, onClick: handleSaveOpen }, "Save"),
      React.createElement("div", { style: sepCss }),
      React.createElement("button", { style: btnCss, onClick: handleClear }, "Clear"),
      React.createElement("span", {
        style: { marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)" },
      }, status),
    ),

    // ---- Save Dialog ----
    showSave && React.createElement("div", { style: savePanelCss },
      React.createElement("div", {
        style: { fontSize: 11, color: "#888", marginBottom: 8, display: "flex", justifyContent: "space-between" },
      },
        React.createElement("span", null, "Save Workflow"),
        React.createElement("span", {
          style: { cursor: "pointer", color: "#aaa" },
          onClick: () => setShowSave(false),
        }, "\u2715"),
      ),
      // Name input
      React.createElement("input", {
        type: "text",
        placeholder: "Workflow name...",
        value: saveName,
        onChange: (e: any) => setSaveName(e.target.value),
        onKeyDown: (e: any) => { if (e.key === "Enter") handleSaveConfirm(); },
        style: {
          width: "100%", padding: "6px 8px", fontSize: 12,
          background: "#1e1e1e", border: "1px solid #555",
          borderRadius: 4, color: "#ddd", outline: "none",
          boxSizing: "border-box" as const, marginBottom: 8,
        },
      }),
      // Scope selector
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 10 } },
        React.createElement("label", {
          style: { fontSize: 11, color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
        },
          React.createElement("input", {
            type: "radio", name: "scope", value: "dataset",
            checked: saveScope === "dataset",
            onChange: () => setSaveScope("dataset"),
          }),
          "This Dataset",
        ),
        React.createElement("label", {
          style: { fontSize: 11, color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
        },
          React.createElement("input", {
            type: "radio", name: "scope", value: "shared",
            checked: saveScope === "shared",
            onChange: () => setSaveScope("shared"),
          }),
          "Shared (all datasets)",
        ),
      ),
      // Save button
      React.createElement("button", {
        style: { ...btnCss, width: "100%", textAlign: "center" as const, background: "#2d6a4f", borderColor: "#40916c", color: "#fff" },
        onClick: handleSaveConfirm,
        disabled: !saveName.trim(),
      }, "Save"),
    ),

    // ---- Templates Panel (built-in) ----
    showTemplates && React.createElement("div", { style: panelCss },
      React.createElement("div", {
        style: { fontSize: 11, color: "#888", marginBottom: 6, display: "flex", justifyContent: "space-between" },
      },
        React.createElement("span", null, "Built-in Templates"),
        React.createElement("span", {
          style: { cursor: "pointer", color: "#aaa" },
          onClick: () => setShowTemplates(false),
        }, "\u2715"),
      ),

      ...Object.entries(builtinByCategory).flatMap(([category, templates]) => [
        React.createElement("div", { key: `cat-${category}`, style: sectionHeaderCss }, category),
        ...templates.map((t) =>
          React.createElement("div", {
            key: t.id,
            style: itemCss,
            onClick: () => handleLoadBuiltin(t),
            onMouseOver: (e: any) => { e.currentTarget.style.background = "#3a3a3a"; },
            onMouseOut: (e: any) => { e.currentTarget.style.background = "transparent"; },
          },
            React.createElement("div", null,
              React.createElement("div", null, t.name),
              React.createElement("div", { style: descCss }, t.description),
            ),
            React.createElement("span", { style: { fontSize: 10, color: "#555" } }, "\u25B6"),
          )
        ),
      ]),
    ),

    // ---- Saved Panel (custom user workflows) ----
    showSaved && React.createElement("div", { style: panelCss },
      React.createElement("div", {
        style: { fontSize: 11, color: "#888", marginBottom: 6, display: "flex", justifyContent: "space-between" },
      },
        React.createElement("span", null, "Saved Workflows"),
        React.createElement("span", {
          style: { cursor: "pointer", color: "#aaa" },
          onClick: () => setShowSaved(false),
        }, "\u2715"),
      ),

      // ── Shared ──
      React.createElement("div", { style: sectionHeaderCss }, "Shared (all datasets)"),
      sharedTemplates.length === 0
        ? React.createElement("div", {
            style: { fontSize: 11, color: "#555", padding: "4px 8px" },
          }, "No shared workflows")
        : sharedTemplates.map((t) =>
            React.createElement("div", {
              key: t.id,
              style: itemCss,
              onMouseOver: (e: any) => { e.currentTarget.style.background = "#3a3a3a"; },
              onMouseOut: (e: any) => { e.currentTarget.style.background = "transparent"; },
            },
              React.createElement("span", {
                style: { cursor: "pointer", flex: 1 },
                onClick: () => handleLoadSaved(t.id, "shared"),
              }, t.name),
              React.createElement("button", {
                style: deleteBtnCss,
                onClick: (e: any) => { e.stopPropagation(); handleDelete(t.id, "shared"); },
                onMouseOver: (e: any) => { e.currentTarget.style.color = "#f66"; },
                onMouseOut: (e: any) => { e.currentTarget.style.color = "#888"; },
              }, "\u2715"),
            )
          ),

      // ── Dataset ──
      React.createElement("div", { style: sectionHeaderCss },
        `This Dataset${_currentDatasetName ? ` (${_currentDatasetName})` : ""}`
      ),
      datasetTemplates.length === 0
        ? React.createElement("div", {
            style: { fontSize: 11, color: "#555", padding: "4px 8px" },
          }, "No saved workflows for this dataset")
        : datasetTemplates.map((t) =>
            React.createElement("div", {
              key: t.id,
              style: itemCss,
              onMouseOver: (e: any) => { e.currentTarget.style.background = "#3a3a3a"; },
              onMouseOut: (e: any) => { e.currentTarget.style.background = "transparent"; },
            },
              React.createElement("span", {
                style: { cursor: "pointer", flex: 1 },
                onClick: () => handleLoadSaved(t.id, "dataset"),
              }, t.name),
              React.createElement("button", {
                style: deleteBtnCss,
                onClick: (e: any) => { e.stopPropagation(); handleDelete(t.id, "dataset"); },
                onMouseOver: (e: any) => { e.currentTarget.style.color = "#f66"; },
                onMouseOut: (e: any) => { e.currentTarget.style.color = "#888"; },
              }, "\u2715"),
            )
          ),
    ),
  );
}
