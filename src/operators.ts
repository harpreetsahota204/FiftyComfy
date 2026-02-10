/**
 * TypeScript operators for FiftyComfy.
 *
 * These receive status updates from the Python backend via ctx.trigger()
 * and update Recoil state so the LiteGraph canvas reflects execution status.
 */

import {
  Operator,
  OperatorConfig,
  registerOperator,
} from "@fiftyone/operators";
import { atom, useSetRecoilState } from "recoil";

/** Per-node status update from Python backend. */
export interface NodeStatusPayload {
  node_id: number;
  status: "running" | "complete" | "error" | "skipped";
  result?: any;
  error?: string;
}

/** Final execution summary from Python backend. */
export interface ExecutionCompletePayload {
  status: "complete" | "error";
  total_nodes?: number;
  completed?: number;
  failed?: number;
}

// Recoil atoms for cross-component state

export const nodeStatusesAtom = atom<Record<number, NodeStatusPayload>>({
  key: "fiftycomfy_nodeStatuses",
  default: {},
});

export const executionStateAtom = atom<{
  running: boolean;
  lastResult: ExecutionCompletePayload | null;
}>({
  key: "fiftycomfy_executionState",
  default: { running: false, lastResult: null },
});

// TS operator: receives per-node status updates from Python

class NodeStatusUpdateOperator extends Operator {
  get config(): OperatorConfig {
    return new OperatorConfig({
      name: "node_status_update",
      label: "Node Status Update",
      unlisted: true,
    });
  }

  useHooks() {
    const setStatuses = useSetRecoilState(nodeStatusesAtom);
    return { setStatuses };
  }

  async execute(ctx: { hooks: any; params: NodeStatusPayload }) {
    const { node_id, status, result, error } = ctx.params;
    ctx.hooks.setStatuses((prev: Record<number, NodeStatusPayload>) => ({
      ...prev,
      [node_id]: { node_id, status, result, error },
    }));
  }
}

// TS operator: receives final execution summary from Python

class ExecutionCompleteOperator extends Operator {
  get config(): OperatorConfig {
    return new OperatorConfig({
      name: "execution_complete",
      label: "Execution Complete",
      unlisted: true,
    });
  }

  useHooks() {
    const setExecState = useSetRecoilState(executionStateAtom);
    return { setExecState };
  }

  async execute(ctx: { hooks: any; params: ExecutionCompletePayload }) {
    ctx.hooks.setExecState({
      running: false,
      lastResult: ctx.params,
    });
  }
}

// Registration

const PLUGIN_NAMESPACE = "@harpreetsahota/FiftyComfy";

export function registerOperators() {
  registerOperator(NodeStatusUpdateOperator, PLUGIN_NAMESPACE);
  registerOperator(ExecutionCompleteOperator, PLUGIN_NAMESPACE);
}
