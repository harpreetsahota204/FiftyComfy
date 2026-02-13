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
import { registerAllNodes, setDatasetInfo, updateAllComboWidgets, hookNodeAdded } from "./litegraph/registerNodes";
import { onEvent } from "./operators";

const NS = "@harpreetsahota/FiftyComfy";
const STORAGE_KEY = "fiftycomfy_workflows";

// ─── Module-level singleton (survives React remounts) ──────────────
let _graph: LGraph | null = null;
let _lgCanvas: LGraphCanvas | null = null;
let _initialized = false;
let _cssInjected = false;
let _currentDatasetName: string = "";

// ─── localStorage helpers for workflow persistence ─────────────────
function getSavedWorkflows(): Record<string, any> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveWorkflow(name: string, graphData: any) {
  const all = getSavedWorkflows();
  all[name] = graphData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function listWorkflowNames(): string[] {
  return Object.keys(getSavedWorkflows());
}

function loadWorkflow(name: string): any | null {
  return getSavedWorkflows()[name] || null;
}

function deleteWorkflow(name: string) {
  const all = getSavedWorkflows();
  delete all[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

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

// ─── Fetch dataset info ─────────────────────────────────────────────
// The Python operator pushes data to JS via ctx.trigger() -> dataset_info_loaded
// JS operator -> event bus "dataset_info". We subscribe here.
// Re-fetched on every mount so dataset switches are detected.

let _datasetInfoListenerSet = false;

function setupDatasetInfoListener() {
  if (_datasetInfoListenerSet) return;
  _datasetInfoListenerSet = true;

  onEvent("dataset_info", (info: any) => {
    if (info && info.fields) {
      const newName = info.dataset_name || "";

      // Detect dataset switch: clear graph and reset
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
        info.label_fields?.length, "label fields,",
        info.patches_fields?.length, "patches fields,",
        Object.keys(info.label_classes || {}).length, "label class fields"
      );
    }
  });
}

function fetchDatasetInfo() {
  // Subscribe to the event bus (once)
  setupDatasetInfoListener();

  // Always re-fetch — dataset may have changed since last mount
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
  const [showLoad, setShowLoad] = useState(false);
  const [savedNames, setSavedNames] = useState<string[]>([]);

  // ---- Init LiteGraph (singleton graph, fresh canvas per mount) ----
  useEffect(() => {
    const el = canvasRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    // Inject LiteGraph CSS once
    if (!_cssInjected) {
      const style = document.createElement("style");
      style.id = "fiftycomfy-lg-css";
      style.textContent = litegraphCss;
      document.head.appendChild(style);
      _cssInjected = true;
    }

    // Register node types once
    if (!_initialized) {
      registerAllNodes();
      (LiteGraph as any).allow_edit_node_title = false;

      // White node title text
      (LiteGraph as any).NODE_TEXT_COLOR = "#FFFFFF";
      (LiteGraph as any).NODE_TITLE_COLOR = "#FFFFFF";
      (LiteGraph as any).WIDGET_TEXT_COLOR = "#FFFFFF";

      // Bright connection line colors
      (LiteGraph as any).DEFAULT_LINK_COLOR = "#99ccff";
      (LiteGraph as any).LINK_COLOR = "#99ccff";
      (LiteGraph as any).EVENT_LINK_COLOR = "#ff9966";
      (LiteGraph as any).registered_link_types = (LiteGraph as any).registered_link_types || {};
      (LiteGraph as any).registered_link_types["FO_VIEW"] = { color: "#4FC3F7" };

      _initialized = true;
    }

    // Create graph once (survives remounts)
    if (!_graph) {
      _graph = new LGraph();
      hookNodeAdded(_graph);
    }

    // Stop old canvas render loop if one exists from a previous mount
    if (_lgCanvas) {
      try {
        // Detach old canvas from the graph to prevent conflicts
        (_lgCanvas as any).setGraph(null);
      } catch { /* ignore */ }
      _lgCanvas = null;
    }

    // Create a fresh LGraphCanvas bound to the new DOM element
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
      input_off: "#888",
      input_on: "#4FC3F7",
      output_off: "#888",
      output_on: "#4FC3F7",
    };

    // Ensure the graph's render loop is running
    _graph.start();

    // Fetch dataset info (once per session, not per mount)
    fetchDatasetInfo();

    // FIX: devicePixelRatio mismatch in litegraph's double-buffer compositing.
    // When dpr > 1, drawBackCanvas applies a dpr transform that clips the grid,
    // and drawFrontCanvas composites at bgcanvas.width/dpr (shrinking it).
    // Setting viewport bypasses ALL dpr logic in both methods:
    //   drawBackCanvas: skips setTransform(dpr,...) when viewport is set
    //   drawFrontCanvas: composites at viewport size instead of dividing by dpr
    // Grid renders at 1x (fine for a dotted pattern), fills the full panel.
    const doResize = () => {
      if (!container || !el || !_lgCanvas) return;
      const w = container.offsetWidth || container.clientWidth;
      const h = container.offsetHeight || container.clientHeight;
      if (w === 0 || h === 0) return;
      (_lgCanvas as any).viewport = [0, 0, w, h];
      (_lgCanvas as any).resize(w, h);
    };

    doResize();
    requestAnimationFrame(doResize);
    setTimeout(doResize, 100);

    const ro = new ResizeObserver(doResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      // Do NOT destroy _graph here — it survives remounts.
      // Do NOT call _graph.stop() — the render loop should keep running.
      // The canvas will be cleaned up when the DOM element is removed.
    };
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

  // ---- Save (localStorage) ----
  const handleSave = useCallback(() => {
    if (!_graph) return;
    const name = prompt("Workflow name:");
    if (!name) return;
    saveWorkflow(name, _graph.serialize());
    setStatus("Saved: " + name);
  }, []);

  // ---- Load list (localStorage) ----
  const handleLoadList = useCallback(() => {
    setSavedNames(listWorkflowNames());
    setShowLoad(true);
  }, []);

  // ---- Load specific graph (localStorage) ----
  const handleLoad = useCallback((name: string) => {
    if (!_graph) return;
    const data = loadWorkflow(name);
    if (data) {
      _graph.configure(data);
      // Re-populate combo widgets on all loaded nodes
      updateAllComboWidgets(_graph);
      setStatus("Loaded: " + name);
    }
    setShowLoad(false);
  }, []);

  // ---- Clear ----
  const handleClear = useCallback(() => {
    if (_graph) _graph.clear();
    setStatus("Ready");
  }, []);

  // ---- Render ----
  return React.createElement("div", {
    ref: containerRef,
    style: {
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "hidden",
    },
  },
    React.createElement("canvas", {
      ref: canvasRef,
      style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
    }),
    React.createElement("div", { style: toolbarCss },
      React.createElement("button", {
        style: btnRunCss,
        onClick: handleRun,
        disabled: running,
      }, running ? "Running..." : "\u25B6 Run Workflow"),
      React.createElement("div", { style: sepCss }),
      React.createElement("button", { style: btnCss, onClick: handleSave }, "Save"),
      React.createElement("button", { style: btnCss, onClick: handleLoadList }, "Load"),
      React.createElement("div", { style: sepCss }),
      React.createElement("button", { style: btnCss, onClick: handleClear }, "Clear"),
      React.createElement("span", {
        style: { marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)" },
      }, status),
    ),
    showLoad && React.createElement("div", {
      style: {
        position: "absolute", top: TH + 4, left: 100, zIndex: 20,
        background: "#2a2a2a", border: "1px solid #555", borderRadius: 6,
        padding: 8, minWidth: 220, maxHeight: 300, overflowY: "auto" as const,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      },
    },
      React.createElement("div", {
        style: { fontSize: 11, color: "#888", marginBottom: 6, display: "flex", justifyContent: "space-between" },
      },
        React.createElement("span", null, "Saved Workflows"),
        React.createElement("span", {
          style: { cursor: "pointer", color: "#aaa" },
          onClick: () => setShowLoad(false),
        }, "\u2715"),
      ),
      savedNames.length === 0
        ? React.createElement("div", { style: { fontSize: 12, color: "#666", padding: 8 } }, "No saved workflows")
        : savedNames.map((name) =>
            React.createElement("div", {
              key: name,
              onClick: () => handleLoad(name),
              style: { padding: "5px 8px", cursor: "pointer", borderRadius: 4, fontSize: 12, color: "#ddd" },
              onMouseOver: (e: any) => { e.currentTarget.style.background = "#3a3a3a"; },
              onMouseOut: (e: any) => { e.currentTarget.style.background = "transparent"; },
            }, name)
          ),
    ),
  );
}
