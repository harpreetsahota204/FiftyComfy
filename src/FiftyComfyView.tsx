/**
 * FiftyComfyView — React wrapper around LiteGraph canvas.
 *
 * This is the main panel component. It:
 * 1. Mounts a <canvas> element for LiteGraph
 * 2. Initializes the graph + canvas on mount
 * 3. Provides a toolbar with Queue, Save, Load, Clear
 * 4. Syncs node execution status from Recoil → LiteGraph node colors
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import type { LGraph } from "@comfyorg/litegraph";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { initLiteGraph } from "./litegraph/setup";
import { registerAllNodes, updateDynamicWidgets } from "./litegraph/registerNodes";
import { usePluginClient } from "./hooks/usePluginClient";
import {
  nodeStatusesAtom,
  executionStateAtom,
  type NodeStatusPayload,
  type ExecutionCompletePayload,
} from "./operators";
import type { SavedGraphEntry, SerializedGraph } from "./types";

// ─── Styles ────────────────────────────────────────────────────────

const TOOLBAR_HEIGHT = 42;

const toolbarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: TOOLBAR_HEIGHT,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "0 8px",
  background: "rgba(25, 25, 25, 0.95)",
  borderBottom: "1px solid #444",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const btnBase: React.CSSProperties = {
  padding: "5px 12px",
  border: "1px solid #555",
  borderRadius: 4,
  background: "#333",
  color: "#ddd",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  transition: "background 0.15s",
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "#2d6a4f",
  borderColor: "#40916c",
  color: "#fff",
};

const separatorStyle: React.CSSProperties = {
  width: 1,
  height: 24,
  background: "#555",
  margin: "0 4px",
};

const statusStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 12,
  color: "#888",
};

// ─── Component ─────────────────────────────────────────────────────

export default function FiftyComfyView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<LGraph | null>(null);
  const client = usePluginClient();

  const nodeStatuses = useRecoilValue(nodeStatusesAtom);
  const setNodeStatuses = useSetRecoilState(nodeStatusesAtom);
  const executionState = useRecoilValue(executionStateAtom);
  const setExecutionState = useSetRecoilState(executionStateAtom);

  const [savedGraphs, setSavedGraphs] = useState<SavedGraphEntry[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  // ---- Initialize LiteGraph on mount ----
  useEffect(() => {
    if (!canvasRef.current) return;

    // Register all FiftyOne node types (idempotent)
    registerAllNodes();

    const { graph, canvas } = initLiteGraph(canvasRef.current);
    graphRef.current = graph;

    // Size canvas to fill container
    const parent = canvasRef.current.parentElement!;
    const resize = () => {
      canvasRef.current!.width = parent.offsetWidth;
      canvasRef.current!.height = parent.offsetHeight - TOOLBAR_HEIGHT;
      canvas.setDirty(true, true);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    // Fetch dataset info for dynamic widgets
    client
      .get_dataset_info()
      .then((info) => {
        if (info) updateDynamicWidgets(info);
      })
      .catch(() => {
        // Panel may load before dataset is ready — that's OK
      });

    return () => {
      graph.stop();
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Sync execution status → node colors ----
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    for (const [nodeIdStr, update] of Object.entries(nodeStatuses)) {
      const nodeId = Number(nodeIdStr);
      const node = graph.getNodeById(nodeId);
      if (!node) continue;

      switch (update.status) {
        case "running":
          (node as any).boxcolor = "#FFA500"; // Orange
          break;
        case "complete":
          (node as any).boxcolor = "#00FF00"; // Green
          if (update.result !== undefined) {
            node.properties.result = update.result;
          }
          break;
        case "error":
          (node as any).boxcolor = "#FF0000"; // Red
          break;
        case "skipped":
          (node as any).boxcolor = "#888888"; // Grey
          break;
        default:
          (node as any).boxcolor = null;
      }
      node.setDirtyCanvas(true, true);
    }
  }, [nodeStatuses]);

  // ---- Toolbar Handlers ----

  const handleQueue = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) return;

    // Clear previous statuses
    setNodeStatuses({});
    setExecutionState({ running: true, lastResult: null });

    const serialized = graph.serialize() as unknown as SerializedGraph;
    try {
      await client.execute_graph({ graph: serialized });
    } catch (e) {
      console.error("FiftyComfy execution error:", e);
      setExecutionState({ running: false, lastResult: { status: "error" } });
    }
  }, [client, setNodeStatuses, setExecutionState]);

  const handleSave = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) return;

    const name = prompt("Workflow name:");
    if (!name) return;

    const serialized = graph.serialize() as unknown as SerializedGraph;
    try {
      await client.save_graph({ name, graph: serialized });
    } catch (e) {
      console.error("FiftyComfy save error:", e);
    }
  }, [client]);

  const handleLoadList = useCallback(async () => {
    try {
      const result = await client.load_graphs();
      setSavedGraphs(result?.graphs || []);
      setShowLoadMenu(true);
    } catch (e) {
      console.error("FiftyComfy load list error:", e);
    }
  }, [client]);

  const handleLoadGraph = useCallback(
    async (graphId: string) => {
      const graph = graphRef.current;
      if (!graph) return;

      try {
        const result = await client.load_graph({ graph_id: graphId });
        if (result?.data?.graph) {
          graph.configure(result.data.graph as any);
        }
      } catch (e) {
        console.error("FiftyComfy load error:", e);
      }
      setShowLoadMenu(false);
    },
    [client]
  );

  const handleClear = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.clear();
    setNodeStatuses({});
  }, [setNodeStatuses]);

  const handleResetColors = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const allNodes = graph._nodes || [];
    for (const node of allNodes) {
      (node as any).boxcolor = null;
      node.setDirtyCanvas(true, true);
    }
    setNodeStatuses({});
  }, [setNodeStatuses]);

  // ---- Status text ----
  const statusText = executionState.running
    ? "Executing..."
    : executionState.lastResult
    ? `Done — ${executionState.lastResult.completed ?? 0}/${executionState.lastResult.total_nodes ?? 0} nodes`
    : "Ready";

  // ---- Render ----
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <button
          style={btnPrimary}
          onClick={handleQueue}
          disabled={executionState.running}
          title="Execute the workflow graph"
        >
          &#9654; Queue
        </button>

        <div style={separatorStyle} />

        <button style={btnBase} onClick={handleSave} title="Save workflow">
          Save
        </button>
        <button style={btnBase} onClick={handleLoadList} title="Load a saved workflow">
          Load
        </button>

        <div style={separatorStyle} />

        <button style={btnBase} onClick={handleClear} title="Clear the canvas">
          Clear
        </button>
        <button style={btnBase} onClick={handleResetColors} title="Reset node status colors">
          Reset
        </button>

        <span style={statusStyle}>{statusText}</span>
      </div>

      {/* Load menu dropdown */}
      {showLoadMenu && (
        <div
          style={{
            position: "absolute",
            top: TOOLBAR_HEIGHT + 2,
            left: 120,
            zIndex: 20,
            background: "#2a2a2a",
            border: "1px solid #555",
            borderRadius: 6,
            padding: 8,
            minWidth: 220,
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#888",
              marginBottom: 6,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Saved Workflows</span>
            <span
              style={{ cursor: "pointer", color: "#aaa" }}
              onClick={() => setShowLoadMenu(false)}
            >
              ✕
            </span>
          </div>
          {savedGraphs.length === 0 ? (
            <div style={{ fontSize: 13, color: "#666", padding: 8 }}>
              No saved workflows yet
            </div>
          ) : (
            savedGraphs.map((g) => (
              <div
                key={g.id}
                onClick={() => handleLoadGraph(g.id)}
                style={{
                  padding: "6px 8px",
                  cursor: "pointer",
                  borderRadius: 4,
                  fontSize: 13,
                  color: "#ddd",
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLElement).style.background = "#3a3a3a";
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                }}
              >
                {g.name}
              </div>
            ))
          )}
        </div>
      )}

      {/* LiteGraph Canvas — offset by toolbar height */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: TOOLBAR_HEIGHT,
          left: 0,
          width: "100%",
          height: `calc(100% - ${TOOLBAR_HEIGHT}px)`,
        }}
      />
    </div>
  );
}
