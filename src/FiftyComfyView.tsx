/**
 * FiftyComfyView — The main panel component.
 *
 * This is a standalone JS panel (Pattern A). It wraps a LiteGraph
 * canvas and communicates with Python operators via useOperatorExecutor.
 */

import * as React from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { useOperatorExecutor } from "@fiftyone/operators";
import { LGraph, LGraphCanvas } from "@comfyorg/litegraph";
import litegraphCss from "@comfyorg/litegraph/style.css?inline";
import { registerAllNodes } from "./litegraph/registerNodes";
import { onEvent, type NodeStatusPayload, type ExecutionCompletePayload } from "./operators";

// ─── Plugin namespace ──────────────────────────────────────────────
const NS = "@harpreetsahota/FiftyComfy";

// ─── Styles ────────────────────────────────────────────────────────
const TH = 42;
const toolbarCss: React.CSSProperties = {
  position: "absolute", top: 0, left: 0, right: 0, height: TH, zIndex: 10,
  display: "flex", alignItems: "center", gap: 6, padding: "0 8px",
  background: "rgba(25,25,25,0.95)", borderBottom: "1px solid #444",
  fontFamily: "'Inter','Segoe UI',sans-serif",
};
const btn: React.CSSProperties = {
  padding: "5px 12px", border: "1px solid #555", borderRadius: 4,
  background: "#333", color: "#ddd", cursor: "pointer", fontSize: 13, fontWeight: 500,
};
const btnG: React.CSSProperties = { ...btn, background: "#2d6a4f", borderColor: "#40916c", color: "#fff" };
const sep: React.CSSProperties = { width: 1, height: 24, background: "#555", margin: "0 4px" };

// ─── Component ─────────────────────────────────────────────────────

export default function FiftyComfyView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<LGraph | null>(null);

  // Python operators via useOperatorExecutor
  const executeGraphOp = useOperatorExecutor(`${NS}/execute_graph`);
  const saveGraphOp = useOperatorExecutor(`${NS}/save_graph`);
  const loadGraphsOp = useOperatorExecutor(`${NS}/load_graphs`);
  const loadGraphOp = useOperatorExecutor(`${NS}/load_graph`);
  const getDatasetInfoOp = useOperatorExecutor(`${NS}/get_dataset_info`);

  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);

  // ---- Init LiteGraph on mount ----
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    try {
      // Inject LiteGraph CSS
      if (!document.getElementById("fiftycomfy-lg-css")) {
        const style = document.createElement("style");
        style.id = "fiftycomfy-lg-css";
        style.textContent = litegraphCss;
        document.head.appendChild(style);
      }

      registerAllNodes();

      const graph = new LGraph();
      const canvas = new LGraphCanvas(el, graph);

      canvas.render_shadows = false;
      canvas.max_zoom = 4;
      canvas.min_zoom = 0.1;
      canvas.allow_searchbox = true;
      (canvas as any).show_searchbox_on_double_click = true;
      (canvas as any).background_image = undefined;
      (canvas as any).clear_background_color = "#1e1e1e";
      canvas.render_curved_connections = true;
      (canvas as any).render_connection_arrows = false;

      graphRef.current = graph;
      graph.start();

      const parent = el.parentElement!;
      const resize = () => {
        el.width = parent.offsetWidth;
        el.height = parent.offsetHeight - TH;
        canvas.setDirty(true, true);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(parent);

      // Fetch dataset info
      getDatasetInfoOp.execute({}).then((result: any) => {
        if (result?.fields) {
          (globalThis as any).__fiftycomfy_dataset_info = result;
        }
      }).catch(() => {});

      console.log("[FiftyComfy] Canvas ready");

      return () => {
        graph.stop();
        ro.disconnect();
      };
    } catch (err) {
      console.error("[FiftyComfy] Init failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Subscribe to execution events ----
  useEffect(() => {
    const u1 = onEvent("node_status", (p: NodeStatusPayload) => {
      const g = graphRef.current;
      if (!g) return;
      const n = g.getNodeById(p.node_id);
      if (!n) return;
      (n as any).boxcolor =
        p.status === "running" ? "#FFA500" :
        p.status === "complete" ? "#00FF00" :
        p.status === "error" ? "#FF0000" :
        p.status === "skipped" ? "#888" : null;
      if (p.status === "complete" && p.result !== undefined) {
        n.properties.result = p.result;
      }
      n.setDirtyCanvas(true, true);
    });
    const u2 = onEvent("execution_complete", (p: ExecutionCompletePayload) => {
      setRunning(false);
      setStatus(`Done — ${p.completed ?? 0}/${p.total_nodes ?? 0} nodes`);
    });
    return () => { u1(); u2(); };
  }, []);

  // ---- Toolbar actions ----
  const handleQueue = useCallback(async () => {
    const g = graphRef.current;
    if (!g) return;
    for (const n of (g as any)._nodes || []) { n.boxcolor = null; n.setDirtyCanvas(true, true); }
    setRunning(true);
    setStatus("Executing...");
    try {
      const serialized = g.serialize();
      await executeGraphOp.execute({ graph_json: JSON.stringify(serialized) });
    } catch (e: any) {
      setRunning(false);
      setStatus("Error: " + (e?.message || "unknown"));
    }
  }, [executeGraphOp]);

  const handleSave = useCallback(async () => {
    const g = graphRef.current;
    if (!g) return;
    const name = prompt("Workflow name:");
    if (!name) return;
    try {
      await saveGraphOp.execute({ name, graph_json: JSON.stringify(g.serialize()) });
      setStatus("Saved: " + name);
    } catch (e: any) { console.error(e); }
  }, [saveGraphOp]);

  const handleLoadList = useCallback(async () => {
    try {
      const result = await loadGraphsOp.execute({});
      setSaved((result as any)?.graphs || []);
      setShowLoad(true);
    } catch (e: any) { console.error(e); }
  }, [loadGraphsOp]);

  const handleLoad = useCallback(async (id: string) => {
    const g = graphRef.current;
    if (!g) return;
    try {
      const result = await loadGraphOp.execute({ graph_id: id });
      if ((result as any)?.data?.graph) g.configure((result as any).data.graph);
    } catch (e: any) { console.error(e); }
    setShowLoad(false);
  }, [loadGraphOp]);

  const handleClear = useCallback(() => { graphRef.current?.clear(); setStatus("Ready"); }, []);

  // ---- Render ----
  return React.createElement("div", {
    style: { width: "100%", height: "100%", position: "relative", overflow: "hidden" },
  },
    // Toolbar
    React.createElement("div", { style: toolbarCss },
      React.createElement("button", { style: btnG, onClick: handleQueue, disabled: running }, "\u25B6 Queue"),
      React.createElement("div", { style: sep }),
      React.createElement("button", { style: btn, onClick: handleSave }, "Save"),
      React.createElement("button", { style: btn, onClick: handleLoadList }, "Load"),
      React.createElement("div", { style: sep }),
      React.createElement("button", { style: btn, onClick: handleClear }, "Clear"),
      React.createElement("span", { style: { marginLeft: "auto", fontSize: 12, color: "#888" } }, status),
    ),
    // Load dropdown
    showLoad && React.createElement("div", {
      style: {
        position: "absolute", top: TH + 2, left: 120, zIndex: 20,
        background: "#2a2a2a", border: "1px solid #555", borderRadius: 6,
        padding: 8, minWidth: 220, maxHeight: 300, overflowY: "auto" as const,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      },
    },
      React.createElement("div", {
        style: { fontSize: 12, color: "#888", marginBottom: 6, display: "flex", justifyContent: "space-between" },
      },
        React.createElement("span", null, "Saved Workflows"),
        React.createElement("span", { style: { cursor: "pointer", color: "#aaa" }, onClick: () => setShowLoad(false) }, "\u2715"),
      ),
      saved.length === 0
        ? React.createElement("div", { style: { fontSize: 13, color: "#666", padding: 8 } }, "No saved workflows")
        : saved.map((g) =>
            React.createElement("div", {
              key: g.id,
              onClick: () => handleLoad(g.id),
              style: { padding: "6px 8px", cursor: "pointer", borderRadius: 4, fontSize: 13, color: "#ddd" },
              onMouseOver: (e: any) => { e.currentTarget.style.background = "#3a3a3a"; },
              onMouseOut: (e: any) => { e.currentTarget.style.background = "transparent"; },
            }, g.name)
          ),
    ),
    // Canvas
    React.createElement("canvas", {
      ref: canvasRef,
      style: { position: "absolute", top: TH, left: 0, width: "100%", height: `calc(100% - ${TH}px)` },
    }),
  );
}
