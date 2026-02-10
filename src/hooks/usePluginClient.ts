/**
 * Typed wrapper around FiftyOne's usePanelEvent() for communicating
 * with the Python panel backend.
 */

import { useCallback } from "react";
import { GraphData, GraphIndexEntry, NodeTypeDef, ValidationError } from "../types";
import { PLUGIN_URI, normalizeNodeTypeDef } from "../registry";

// We'll access these from the FiftyOne globals
const fooModule = (window as any).__foo__;

function usePanelEvent(): (name: string, params: any) => Promise<any> {
  // Use the FiftyOne operator executor to call panel methods
  const triggerEvent = fooModule?.usePanelEvent?.();

  return useCallback(
    async (methodName: string, params: any = {}) => {
      if (triggerEvent) {
        return await triggerEvent(methodName, {
          operator: `${PLUGIN_URI}/fiftycomfy#on_${methodName}`,
          params,
        });
      }
      console.warn("[FiftyComfy] usePanelEvent not available");
      return null;
    },
    [triggerEvent]
  );
}

export function usePluginClient() {
  const callPanel = usePanelEvent();

  const executeGraph = useCallback(
    async (graph: GraphData) => {
      return await callPanel("execute_graph", { graph });
    },
    [callPanel]
  );

  const validateGraph = useCallback(
    async (graph: GraphData): Promise<{ valid: boolean; errors: ValidationError[] }> => {
      const result = await callPanel("validate_graph", { graph });
      return result || { valid: true, errors: [] };
    },
    [callPanel]
  );

  const saveGraph = useCallback(
    async (graph: GraphData): Promise<{ graph_id: string; saved: boolean }> => {
      const result = await callPanel("save_graph", { graph });
      return result || { graph_id: "", saved: false };
    },
    [callPanel]
  );

  const loadGraphs = useCallback(async (): Promise<GraphIndexEntry[]> => {
    const result = await callPanel("load_graphs", {});
    return result?.graphs || [];
  }, [callPanel]);

  const loadGraph = useCallback(
    async (graphId: string): Promise<GraphData | null> => {
      const result = await callPanel("load_graph", { graph_id: graphId });
      return result?.graph || null;
    },
    [callPanel]
  );

  const deleteGraph = useCallback(
    async (graphId: string): Promise<boolean> => {
      const result = await callPanel("delete_graph", { graph_id: graphId });
      return result?.deleted || false;
    },
    [callPanel]
  );

  const getNodeDefaults = useCallback(
    async (nodeType: string): Promise<NodeTypeDef | null> => {
      const result = await callPanel("get_node_defaults", { node_type: nodeType });
      if (result?.metadata) {
        return normalizeNodeTypeDef(result.metadata);
      }
      return null;
    },
    [callPanel]
  );

  const getNodeCatalog = useCallback(async (): Promise<NodeTypeDef[]> => {
    const result = await callPanel("get_node_catalog", {});
    if (result?.catalog) {
      return result.catalog.map(normalizeNodeTypeDef);
    }
    return [];
  }, [callPanel]);

  return {
    executeGraph,
    validateGraph,
    saveGraph,
    loadGraphs,
    loadGraph,
    deleteGraph,
    getNodeDefaults,
    getNodeCatalog,
  };
}
