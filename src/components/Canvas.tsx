/**
 * Canvas — the main React Flow canvas for FiftyComfy.
 *
 * Handles drag-and-drop from palette, node selection,
 * and the visual flow graph.
 */

import React, { useCallback, useRef, DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowInstance,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import { nodeTypes } from "./nodes";
import { ComfyNodeData } from "../types";

interface CanvasProps {
  nodes: Node<ComfyNodeData>[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onNodeClick: (nodeId: string) => void;
  onPaneClick: () => void;
  onDropNode: (nodeType: string, position: { x: number; y: number }) => void;
}

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDropNode,
}: CanvasProps) {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/fiftycomfy-node-type");
      if (!nodeType || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onDropNode(nodeType, position);
    },
    [onDropNode]
  );

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  return (
    <div style={{ flex: 1, height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: "#64748b", strokeWidth: 2 },
        }}
        style={{ background: "#0f172a" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e293b"
        />
        <Controls
          style={{
            background: "#1e293b",
            borderRadius: 8,
            border: "1px solid #334155",
          }}
        />
        <MiniMap
          nodeColor={(node: Node<ComfyNodeData>) => {
            return (node.data as ComfyNodeData)?.color || "#64748b";
          }}
          style={{
            background: "#0f172a",
            borderRadius: 8,
            border: "1px solid #334155",
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
