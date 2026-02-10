/**
 * FiftyComfyView — main panel wrapper that composes all subcomponents.
 *
 * This is the top-level React component registered as the FiftyComfy panel.
 * It manages the graph store, plugin client, and layout.
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NodeTypeDef, GraphIndexEntry, ComfyNodeData } from "./types";
import { DEFAULT_NODE_CATALOG } from "./registry";
import { useGraphStore } from "./hooks/useGraphStore";
import { usePluginClient } from "./hooks/usePluginClient";
import { onNodeStatusUpdate, onExecutionComplete } from "./operators";

import { Canvas } from "./components/Canvas";
import { NodePalette } from "./components/NodePalette";
import { NodeConfigDrawer } from "./components/NodeConfigDrawer";
import { ExecutionBar } from "./components/ExecutionBar";
import { GraphLibrary } from "./components/GraphLibrary";

export function FiftyComfyView() {
  // Node catalog (loaded from backend, falls back to static)
  const [catalog, setCatalog] = useState<NodeTypeDef[]>(DEFAULT_NODE_CATALOG);
  const [lastRunInfo, setLastRunInfo] = useState<string>("");

  // Graph library modal
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savedGraphs, setSavedGraphs] = useState<GraphIndexEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Plugin client (backend communication)
  const client = usePluginClient();

  // Graph store (canvas state)
  const store = useGraphStore(catalog);

  // Get the selected node object
  const selectedNode = store.selectedNodeId
    ? store.nodes.find((n) => n.id === store.selectedNodeId) || null
    : null;

  // Load catalog from backend on mount
  useEffect(() => {
    client.getNodeCatalog().then((backendCatalog) => {
      if (backendCatalog && backendCatalog.length > 0) {
        setCatalog(backendCatalog);
      }
    }).catch(() => {
      // Fallback to static catalog
    });
  }, []);

  // Subscribe to backend execution events
  useEffect(() => {
    const unsubStatus = onNodeStatusUpdate((update) => {
      store.updateNodeStatus(update);
    });
    const unsubComplete = onExecutionComplete((summary) => {
      store.setIsExecuting(false);
      if (summary?.node_count) {
        setLastRunInfo(`Ran ${summary.node_count} nodes`);
      }
    });
    return () => {
      unsubStatus();
      unsubComplete();
    };
  }, [store.updateNodeStatus, store.setIsExecuting]);

  // --- Action handlers ---

  const handleRun = useCallback(async () => {
    store.resetAllStatuses();
    store.setIsExecuting(true);
    setLastRunInfo("");

    const graphData = store.serializeGraph();

    try {
      // Validate first
      const validation = await client.validateGraph(graphData);
      if (!validation.valid) {
        // Highlight errored nodes
        for (const err of validation.errors) {
          if (err.node_id) {
            store.updateNodeStatus({
              nodeId: err.node_id,
              status: "error",
              error: err.message,
            });
          }
        }
        store.setIsExecuting(false);
        setLastRunInfo("Validation failed");
        return;
      }

      // Execute
      await client.executeGraph(graphData);
    } catch (e: any) {
      console.error("[FiftyComfy] Execution error:", e);
      store.setIsExecuting(false);
      setLastRunInfo("Error: " + (e.message || "Unknown error"));
    }
  }, [store, client]);

  const handleSave = useCallback(async () => {
    const graphData = store.serializeGraph();
    try {
      const result = await client.saveGraph(graphData);
      if (result?.saved) {
        setLastRunInfo("Saved!");
      }
    } catch (e: any) {
      console.error("[FiftyComfy] Save error:", e);
      setLastRunInfo("Save failed");
    }
  }, [store, client]);

  const handleLoadOpen = useCallback(async () => {
    setLibraryOpen(true);
    setLibraryLoading(true);
    try {
      const graphs = await client.loadGraphs();
      setSavedGraphs(graphs);
    } catch (e) {
      console.error("[FiftyComfy] Load graphs error:", e);
    }
    setLibraryLoading(false);
  }, [client]);

  const handleLoadGraph = useCallback(
    async (graphId: string) => {
      try {
        const graphData = await client.loadGraph(graphId);
        if (graphData) {
          store.loadGraph(graphData);
          setLibraryOpen(false);
          setLastRunInfo("Loaded");
        }
      } catch (e) {
        console.error("[FiftyComfy] Load graph error:", e);
      }
    },
    [store, client]
  );

  const handleDeleteGraph = useCallback(
    async (graphId: string) => {
      try {
        await client.deleteGraph(graphId);
        setSavedGraphs((prev) => prev.filter((g) => g.id !== graphId));
      } catch (e) {
        console.error("[FiftyComfy] Delete graph error:", e);
      }
    },
    [client]
  );

  const handleClear = useCallback(() => {
    store.clearGraph();
    setLastRunInfo("");
  }, [store]);

  const handleDropNode = useCallback(
    (nodeType: string, position: { x: number; y: number }) => {
      store.addNode(nodeType, position);
    },
    [store]
  );

  return (
    <ReactFlowProvider>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          color: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <ExecutionBar
          graphName={store.graphName}
          onGraphNameChange={store.setGraphName}
          isExecuting={store.isExecuting}
          onRun={handleRun}
          onSave={handleSave}
          onLoad={handleLoadOpen}
          onClear={handleClear}
          nodeCount={store.nodes.length}
          lastRunInfo={lastRunInfo}
        />

        {/* Main content area */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left sidebar: Node Palette */}
          <NodePalette catalog={catalog} />

          {/* Center: React Flow Canvas */}
          <Canvas
            nodes={store.nodes}
            edges={store.edges}
            onNodesChange={store.onNodesChange}
            onEdgesChange={store.onEdgesChange}
            onConnect={store.onConnect}
            onNodeClick={store.setSelectedNodeId}
            onPaneClick={() => store.setSelectedNodeId(null)}
            onDropNode={handleDropNode}
          />

          {/* Right sidebar: Node Config Drawer */}
          <NodeConfigDrawer
            node={
              selectedNode
                ? { id: selectedNode.id, data: selectedNode.data as ComfyNodeData }
                : null
            }
            onUpdateParams={store.updateNodeParams}
            onDelete={store.removeSelectedNode}
          />
        </div>

        {/* Graph Library Modal */}
        <GraphLibrary
          isOpen={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onLoad={handleLoadGraph}
          onDelete={handleDeleteGraph}
          graphs={savedGraphs}
          isLoading={libraryLoading}
        />

        {/* Global styles for animations */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .react-flow__node {
            font-family: 'Inter', -apple-system, sans-serif;
          }
          .react-flow__controls button {
            background: #1e293b !important;
            border-color: #334155 !important;
            color: #94a3b8 !important;
          }
          .react-flow__controls button:hover {
            background: #334155 !important;
          }
        `}</style>
      </div>
    </ReactFlowProvider>
  );
}

export default FiftyComfyView;
