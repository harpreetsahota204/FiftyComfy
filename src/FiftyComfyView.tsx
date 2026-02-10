/**
 * FiftyComfyView — React wrapper around LiteGraph canvas.
 *
 * LiteGraph init is lazy (inside useEffect). No Recoil dependency.
 * Uses the global event bus from operators.ts for execution updates.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePanelEvent } from "@fiftyone/operators";
import { LGraph, LGraphCanvas, LiteGraph } from "@comfyorg/litegraph";
import litegraphCss from "@comfyorg/litegraph/style.css?inline";
import { registerAllNodes } from "./litegraph/registerNodes";
import { onEvent, type NodeStatusPayload, type ExecutionCompletePayload } from "./operators";

// ─── Plugin namespace ──────────────────────────────────────────────
const PLUGIN_NS = "@harpreetsahota/FiftyComfy";
const PANEL_NAME = "fiftycomfy_panel";
function op(method: string) {
  return `${PLUGIN_NS}/${PANEL_NAME}#${method}`;
}

// ─── Styles ────────────────────────────────────────────────────────
const TH = 42; // toolbar height

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
  const lgCanvasRef = useRef<LGraphCanvas | null>(null);
  const handleEvent = usePanelEvent();

  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);

  // ---- Backend RPC ----
  const rpc = useCallback(
    (method: string, params: Record<string, any> = {}): Promise<any> =>
      new Promise((resolve, reject) => {
        handleEvent(method, {
          operator: op(method),
          params,
          callback: (r: any) => (r?.error ? reject(new Error(r.error)) : resolve(r?.result ?? r)),
        });
      }),
    [handleEvent],
  );

  // ---- Init LiteGraph on mount ----
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    try {
      // Inject LiteGraph CSS (FiftyOne won't load dist/style.css)
      if (!document.getElementById("fiftycomfy-litegraph-css")) {
        const style = document.createElement("style");
        style.id = "fiftycomfy-litegraph-css";
        style.textContent = litegraphCss;
        document.head.appendChild(style);
      }

      // Register all FiftyOne node types (idempotent, first call only)
      registerAllNodes();

      // Create LiteGraph instances
      const graph = new LGraph();
      const canvas = new LGraphCanvas(el, graph);

      // ComfyUI-style defaults
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
      lgCanvasRef.current = canvas;
      graph.start();

      // Fit to container
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
      rpc("get_dataset_info")
        .then((info) => {
          if (info?.fields) (globalThis as any).__fiftycomfy_dataset_info = info;
        })
        .catch(() => {});

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
    try { await rpc("execute_graph", { graph: g.serialize() }); }
    catch (e: any) { setRunning(false); setStatus("Error: " + (e?.message || "unknown")); }
  }, [rpc]);

  const handleSave = useCallback(async () => {
    const g = graphRef.current;
    if (!g) return;
    const name = prompt("Workflow name:");
    if (!name) return;
    try { await rpc("save_graph", { name, graph: g.serialize() }); setStatus("Saved: " + name); }
    catch (e: any) { console.error(e); }
  }, [rpc]);

  const handleLoadList = useCallback(async () => {
    try { const r = await rpc("load_graphs"); setSaved(r?.graphs || []); setShowLoad(true); }
    catch (e: any) { console.error(e); }
  }, [rpc]);

  const handleLoad = useCallback(async (id: string) => {
    const g = graphRef.current;
    if (!g) return;
    try { const r = await rpc("load_graph", { graph_id: id }); if (r?.data?.graph) g.configure(r.data.graph); }
    catch (e: any) { console.error(e); }
    setShowLoad(false);
  }, [rpc]);

  const handleClear = useCallback(() => { graphRef.current?.clear(); setStatus("Ready"); }, []);

  // ---- Render ----
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div style={toolbarCss}>
        <button style={btnG} onClick={handleQueue} disabled={running}>&#9654; Queue</button>
        <div style={sep} />
        <button style={btn} onClick={handleSave}>Save</button>
        <button style={btn} onClick={handleLoadList}>Load</button>
        <div style={sep} />
        <button style={btn} onClick={handleClear}>Clear</button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>{status}</span>
      </div>

      {showLoad && (
        <div style={{
          position: "absolute", top: TH + 2, left: 120, zIndex: 20,
          background: "#2a2a2a", border: "1px solid #555", borderRadius: 6,
          padding: 8, minWidth: 220, maxHeight: 300, overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <span>Saved Workflows</span>
            <span style={{ cursor: "pointer", color: "#aaa" }} onClick={() => setShowLoad(false)}>✕</span>
          </div>
          {saved.length === 0
            ? <div style={{ fontSize: 13, color: "#666", padding: 8 }}>No saved workflows</div>
            : saved.map((g) => (
                <div key={g.id} onClick={() => handleLoad(g.id)}
                  style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 4, fontSize: 13, color: "#ddd" }}
                  onMouseOver={(e) => { (e.currentTarget).style.background = "#3a3a3a"; }}
                  onMouseOut={(e) => { (e.currentTarget).style.background = "transparent"; }}
                >{g.name}</div>
              ))
          }
        </div>
      )}

      <canvas ref={canvasRef}
        style={{ position: "absolute", top: TH, left: 0, width: "100%", height: `calc(100% - ${TH}px)` }}
      />
    </div>
  );
}
