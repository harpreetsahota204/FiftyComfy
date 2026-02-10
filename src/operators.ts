/**
 * TypeScript operators that act as event handlers for backend -> frontend
 * communication via ctx.trigger().
 *
 * These are "unlisted" operators — they don't appear in the operator browser.
 * Python calls ctx.trigger("@harpreetsahota/FiftyComfy/node_status_update", {...})
 * and it invokes these operators on the frontend to update React state.
 *
 * Because FiftyOne's TS operator system uses Recoil atoms, we store
 * updates in a global event bus that our React components subscribe to.
 */

import { PLUGIN_URI } from "./registry";
import { NodeExecutionState } from "./types";

// ---------------------------------------------------------------------------
// Global event bus — React components subscribe via addEventListener
// ---------------------------------------------------------------------------

type StatusCallback = (update: NodeExecutionState) => void;
type CompletionCallback = (summary: any) => void;

const statusListeners: Set<StatusCallback> = new Set();
const completionListeners: Set<CompletionCallback> = new Set();

export function onNodeStatusUpdate(cb: StatusCallback): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function onExecutionComplete(cb: CompletionCallback): () => void {
  completionListeners.add(cb);
  return () => completionListeners.delete(cb);
}

function emitStatusUpdate(update: NodeExecutionState) {
  statusListeners.forEach((cb) => {
    try {
      cb(update);
    } catch (e) {
      console.error("[FiftyComfy] Error in status listener:", e);
    }
  });
}

function emitExecutionComplete(summary: any) {
  completionListeners.forEach((cb) => {
    try {
      cb(summary);
    } catch (e) {
      console.error("[FiftyComfy] Error in completion listener:", e);
    }
  });
}

// ---------------------------------------------------------------------------
// Operator registration helpers
// ---------------------------------------------------------------------------

const fooModule = () => (window as any).__foo__;

/**
 * Register all FiftyComfy TS operators.
 * Called from index.ts during plugin initialization.
 */
export function registerOperators() {
  const foo = fooModule();
  if (!foo?.registerOperator) {
    console.warn("[FiftyComfy] @fiftyone/operators not available, skipping TS operator registration");
    return;
  }

  // node_status_update — receives per-node execution state
  class NodeStatusUpdateOperator {
    get config() {
      return new foo.OperatorConfig({
        name: "node_status_update",
        label: "Node Status Update",
        unlisted: true,
      });
    }

    useHooks() {
      return {};
    }

    async execute({ params }: any) {
      const update: NodeExecutionState = {
        nodeId: params.node_id,
        status: params.status,
        progress: params.progress,
        message: params.message,
        result: params.result,
        error: params.error,
        durationMs: params.duration_ms,
      };
      emitStatusUpdate(update);
    }
  }

  // execution_complete — final summary
  class ExecutionCompleteOperator {
    get config() {
      return new foo.OperatorConfig({
        name: "execution_complete",
        label: "Execution Complete",
        unlisted: true,
      });
    }

    useHooks() {
      return {};
    }

    async execute({ params }: any) {
      emitExecutionComplete(params);
    }
  }

  try {
    foo.registerOperator(NodeStatusUpdateOperator, PLUGIN_URI);
    foo.registerOperator(ExecutionCompleteOperator, PLUGIN_URI);
  } catch (e) {
    console.warn("[FiftyComfy] Failed to register TS operators:", e);
  }
}
