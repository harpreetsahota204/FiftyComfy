/**
 * FiftyComfyView — LiteGraph canvas panel component.
 *
 * Fixes applied:
 * - Canvas resize: let _lgCanvas.resize() handle both canvas + bgcanvas
 * - Save/Load: use browser localStorage instead of Python operators
 * - Node titles: handled in registerNodes.ts via this.title in constructors
 */

import * as React from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { executeOperator } from "@fiftyone/operators";
import { LGraph, LGraphCanvas, LiteGraph } from "@comfyorg/litegraph";
import litegraphCss from "@comfyorg/litegraph/style.css?inline";
import { registerAllNodes } from "./litegraph/registerNodes";

const NS = "@harpreetsahota/FiftyComfy";
const STORAGE_KEY = "fiftycomfy_workflows";

// ─── Module-level singleton (survives React remounts) ──────────────
let _graph: LGraph | null = null;
let _lgCanvas: LGraphCanvas | null = null;
let _initialized = false;
let _cssInjected = false;

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

// ─── Component ─────────────────────────────────────────────────────

export default function FiftyComfyView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [savedNames, setSavedNames] = useState<string[]>([]);

  // ---- Init LiteGraph (singleton) ----
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

      // Bright connection line colors
      (LiteGraph as any).DEFAULT_LINK_COLOR = "#99ccff";
      (LiteGraph as any).LINK_COLOR = "#99ccff";
      (LiteGraph as any).EVENT_LINK_COLOR = "#ff9966";
      (LiteGraph as any).registered_link_types = (LiteGraph as any).registered_link_types || {};
      (LiteGraph as any).registered_link_types["FO_VIEW"] = { color: "#4FC3F7" };

      _initialized = true;
    }

    if (!_graph) {
      _graph = new LGraph();
    }

    _lgCanvas = new LGraphCanvas(el, _graph);
    _lgCanvas.render_shadows = false;
    _lgCanvas.max_zoom = 4;
    _lgCanvas.min_zoom = 0.1;
    _lgCanvas.allow_searchbox = true;
    (_lgCanvas as any).show_searchbox_on_double_click = true;

    // Use LiteGraph's default background (grid pattern, works at all zoom levels)

    _lgCanvas.render_curved_connections = true;
    (_lgCanvas as any).render_connection_arrows = false;
    (_lgCanvas as any).connections_width = 3;
    (_lgCanvas as any).default_connection_color = {
      input_off: "#888",
      input_on: "#4FC3F7",
      output_off: "#888",
      output_on: "#4FC3F7",
    };

    // Enable autoresize so LiteGraph auto-adapts on mouse events
    (_lgCanvas as any).autoresize = true;

    _graph.start();

    // FIX: Let _lgCanvas.resize() handle BOTH canvas and bgcanvas.
    // Do NOT set el.width/el.height manually — that causes resize()
    // to short-circuit and skip bgcanvas, clipping connections.
    const resize = () => {
      if (!container || !_lgCanvas) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      (_lgCanvas as any).resize(w, h);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => { ro.disconnect(); };
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
      style: { position: "absolute", top: 0, left: 0 },
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
