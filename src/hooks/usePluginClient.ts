/**
 * Typed wrapper around usePanelEvent for FiftyComfy backend communication.
 */

import { useCallback } from "react";
import { usePanelEvent } from "@fiftyone/operators";
import type {
  SerializedGraph,
  DatasetInfo,
  SavedGraphEntry,
  SavedGraphData,
} from "../types";

const PLUGIN_NAMESPACE = "@harpreetsahota/FiftyComfy";
const PANEL_NAME = "fiftycomfy_panel";

function makeOperator(method: string): string {
  return `${PLUGIN_NAMESPACE}/${PANEL_NAME}#${method}`;
}

export interface PluginClient {
  execute_graph: (params: { graph: SerializedGraph }) => Promise<any>;
  save_graph: (params: { name: string; graph: SerializedGraph }) => Promise<any>;
  load_graphs: () => Promise<{ graphs: SavedGraphEntry[] }>;
  load_graph: (params: { graph_id: string }) => Promise<{ status: string; data?: SavedGraphData }>;
  delete_graph: (params: { graph_id: string }) => Promise<any>;
  get_dataset_info: () => Promise<DatasetInfo>;
}

export function usePluginClient(): PluginClient {
  const handleEvent = usePanelEvent();

  const callBackend = useCallback(
    (method: string, params: Record<string, any> = {}) => {
      return new Promise<any>((resolve, reject) => {
        handleEvent(method, {
          operator: makeOperator(method),
          params,
          callback: (result: any) => {
            if (result?.error) {
              reject(new Error(result.error));
            } else {
              resolve(result?.result ?? result);
            }
          },
        });
      });
    },
    [handleEvent]
  );

  return {
    execute_graph: useCallback(
      (params) => callBackend("execute_graph", params),
      [callBackend]
    ),

    save_graph: useCallback(
      (params) => callBackend("save_graph", params),
      [callBackend]
    ),

    load_graphs: useCallback(
      () => callBackend("load_graphs"),
      [callBackend]
    ),

    load_graph: useCallback(
      (params) => callBackend("load_graph", params),
      [callBackend]
    ),

    delete_graph: useCallback(
      (params) => callBackend("delete_graph", params),
      [callBackend]
    ),

    get_dataset_info: useCallback(
      () => callBackend("get_dataset_info"),
      [callBackend]
    ),
  };
}
