/**
 * Graph state management using React state + React Flow.
 *
 * Manages the canvas nodes/edges, execution state, and graph metadata.
 * Uses React's useState/useCallback to avoid extra dependencies.
 */

import { useState, useCallback, useRef } from "react";
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
} from "@xyflow/react";
import {
  ComfyNodeData,
  GraphData,
  NodeTypeDef,
  NodeStatus,
  NodeExecutionState,
} from "../types";
import { getNodeTypeDef, DEFAULT_NODE_CATALOG } from "../registry";

let nodeIdCounter = 0;
function generateNodeId(): string {
  nodeIdCounter += 1;
  return `node_${Date.now()}_${nodeIdCounter}`;
}

function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}_${Date.now()}`;
}

export function useGraphStore(catalog: NodeTypeDef[]) {
  const [nodes, setNodes] = useState<Node<ComfyNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [graphId, setGraphId] = useState<string>("");
  const [graphName, setGraphName] = useState<string>("Untitled Workflow");
  const [graphDescription, setGraphDescription] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const activeCatalog = catalog.length > 0 ? catalog : DEFAULT_NODE_CATALOG;

  // React Flow change handlers
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<ComfyNodeData>[]);
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const id = generateEdgeId(connection.source, connection.target);
      const newEdge: Edge = {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        animated: false,
        style: { stroke: "#64748b", strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    []
  );

  // Add a node to the canvas
  const addNode = useCallback(
    (nodeType: string, position: { x: number; y: number }) => {
      const typeDef = getNodeTypeDef(activeCatalog, nodeType);
      if (!typeDef) {
        console.warn(`Unknown node type: ${nodeType}`);
        return;
      }

      // Build default params from schema
      const defaultParams: Record<string, any> = {};
      for (const [key, schema] of Object.entries(typeDef.paramsSchema)) {
        defaultParams[key] = schema.default;
      }

      const id = generateNodeId();
      const newNode: Node<ComfyNodeData> = {
        id,
        type: typeDef.category, // Maps to our custom node component
        position,
        data: {
          label: typeDef.label,
          nodeType: typeDef.type,
          category: typeDef.category,
          color: typeDef.color,
          description: typeDef.description,
          params: defaultParams,
          paramsSchema: typeDef.paramsSchema,
          inputs: typeDef.inputs,
          outputs: typeDef.outputs,
          status: "idle",
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [activeCatalog]
  );

  // Remove the selected node
  const removeSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
    );
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Update node params
  const updateNodeParams = useCallback(
    (nodeId: string, params: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, params: { ...n.data.params, ...params } } }
            : n
        )
      );
    },
    []
  );

  // Update node execution state
  const updateNodeStatus = useCallback((update: NodeExecutionState) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === update.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                status: update.status,
                progress: update.progress,
                statusMessage: update.message,
                result: update.result ?? n.data.result,
                error: update.error,
                durationMs: update.durationMs,
              },
            }
          : n
      )
    );
  }, []);

  // Reset all node statuses to idle
  const resetAllStatuses = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: "idle" as NodeStatus,
          progress: undefined,
          statusMessage: undefined,
          error: undefined,
          durationMs: undefined,
        },
      }))
    );
  }, []);

  // Serialize to GraphData for backend
  const serializeGraph = useCallback((): GraphData => {
    return {
      id: graphId || `graph_${Date.now()}`,
      name: graphName,
      description: graphDescription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        position: { x: n.position.x, y: n.position.y },
        params: n.data.params,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
      })),
    };
  }, [nodes, edges, graphId, graphName, graphDescription]);

  // Load from GraphData
  const loadGraph = useCallback(
    (graph: GraphData) => {
      setGraphId(graph.id);
      setGraphName(graph.name);
      setGraphDescription(graph.description || "");

      const newNodes: Node<ComfyNodeData>[] = graph.nodes.map((gn) => {
        const typeDef = getNodeTypeDef(activeCatalog, gn.type);
        return {
          id: gn.id,
          type: typeDef?.category || "view_stage",
          position: gn.position,
          data: {
            label: typeDef?.label || gn.type,
            nodeType: gn.type,
            category: typeDef?.category || "view_stage",
            color: typeDef?.color || "#6B7280",
            description: typeDef?.description || "",
            params: gn.params,
            paramsSchema: typeDef?.paramsSchema || {},
            inputs: typeDef?.inputs || ["view"],
            outputs: typeDef?.outputs || ["view"],
            status: "idle" as NodeStatus,
          },
        };
      });

      const newEdges: Edge[] = graph.edges.map((ge) => ({
        id: ge.id,
        source: ge.source,
        target: ge.target,
        sourceHandle: ge.sourceHandle || undefined,
        targetHandle: ge.targetHandle || undefined,
        animated: false,
        style: { stroke: "#64748b", strokeWidth: 2 },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId(null);
    },
    [activeCatalog]
  );

  // Clear the canvas
  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setGraphId("");
    setGraphName("Untitled Workflow");
    setGraphDescription("");
    setSelectedNodeId(null);
  }, []);

  return {
    // State
    nodes,
    edges,
    graphId,
    graphName,
    graphDescription,
    selectedNodeId,
    isExecuting,
    // Setters
    setGraphName,
    setGraphDescription,
    setSelectedNodeId,
    setIsExecuting,
    // React Flow handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    // Graph operations
    addNode,
    removeSelectedNode,
    updateNodeParams,
    updateNodeStatus,
    resetAllStatuses,
    serializeGraph,
    loadGraph,
    clearGraph,
  };
}
