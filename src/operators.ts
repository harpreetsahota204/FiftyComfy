/**
 * TypeScript operators for FiftyComfy.
 *
 * These are event handlers triggered by the Python backend via ctx.trigger().
 * They use a simple global event bus (no Recoil) so the React component
 * can subscribe to updates.
 */

import { Operator, OperatorConfig } from "@fiftyone/operators";

// ─── Types ─────────────────────────────────────────────────────────

export interface NodeStatusPayload {
  node_id: number;
  status: "running" | "complete" | "error" | "skipped";
  result?: any;
  error?: string;
}

export interface ExecutionCompletePayload {
  status: "complete" | "error";
  total_nodes?: number;
  completed?: number;
  failed?: number;
}

// ─── Global event bus ──────────────────────────────────────────────
// Simple pub/sub so the React component can receive updates from
// operators without needing Recoil as a dependency.

type Listener = (data: any) => void;
const listeners: Record<string, Listener[]> = {};

export function onEvent(event: string, fn: Listener) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
  return () => {
    listeners[event] = listeners[event].filter((f) => f !== fn);
  };
}

function emit(event: string, data: any) {
  (listeners[event] || []).forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error(`[FiftyComfy] Event listener error (${event}):`, e);
    }
  });
}

// ─── Node Status Update Operator ───────────────────────────────────

export class NodeStatusUpdateOperator extends Operator {
  get config(): OperatorConfig {
    return new OperatorConfig({
      name: "node_status_update",
      label: "Node Status Update",
      unlisted: true,
    });
  }

  async execute({ params }: any) {
    emit("node_status", params as NodeStatusPayload);
  }
}

// ─── Execution Complete Operator ───────────────────────────────────

export class ExecutionCompleteOperator extends Operator {
  get config(): OperatorConfig {
    return new OperatorConfig({
      name: "execution_complete",
      label: "Execution Complete",
      unlisted: true,
    });
  }

  async execute({ params }: any) {
    emit("execution_complete", params as ExecutionCompletePayload);
  }
}
