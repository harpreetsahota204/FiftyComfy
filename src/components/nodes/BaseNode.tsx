/**
 * BaseNode — shared chrome for all FiftyComfy canvas nodes.
 *
 * Renders the colored header, parameter summary, input/output handles,
 * and execution status badge. All category-specific node components
 * delegate to this.
 */

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ComfyNodeData, NodeStatus } from "../../types";

// Status badge rendering
function StatusBadge({ status, durationMs, error, progress }: {
  status: NodeStatus;
  durationMs?: number;
  error?: string;
  progress?: number;
}) {
  if (status === "idle") return null;

  const badges: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "#94a3b8", text: "#fff", label: "Pending..." },
    running: { bg: "#3b82f6", text: "#fff", label: progress != null ? `${Math.round(progress * 100)}%` : "Running..." },
    complete: { bg: "#10b981", text: "#fff", label: durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : "Done" },
    error: { bg: "#ef4444", text: "#fff", label: "Error" },
    skipped: { bg: "#94a3b8", text: "#fff", label: "Skipped" },
  };

  const badge = badges[status] || badges.pending;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        backgroundColor: badge.bg,
        color: badge.text,
      }}
      title={error || undefined}
    >
      {status === "running" && (
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>
          &#9696;
        </span>
      )}
      {status === "complete" && <span>&#10003;</span>}
      {status === "error" && <span>&#10007;</span>}
      {badge.label}
    </div>
  );
}

// Compact parameter display
function ParamSummary({ params, paramsSchema }: {
  params: Record<string, any>;
  paramsSchema: Record<string, any>;
}) {
  const entries = Object.entries(paramsSchema).slice(0, 3);
  if (entries.length === 0) return null;

  return (
    <div style={{ padding: "4px 10px 6px", fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
      {entries.map(([key, schema]) => {
        const val = params[key];
        if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) return null;
        const display = Array.isArray(val) ? val.join(", ") : String(val);
        return (
          <div key={key} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: "#64748b" }}>{(schema as any).label || key}:</span>{" "}
            {display.length > 30 ? display.slice(0, 30) + "..." : display}
          </div>
        );
      })}
    </div>
  );
}

// Inline result display for aggregation nodes
function InlineResult({ result }: { result: any }) {
  if (!result) return null;

  if (result.type === "count") {
    return (
      <div style={{
        padding: "6px 10px",
        borderTop: "1px solid #334155",
        fontSize: 18,
        fontWeight: 700,
        color: "#f8fafc",
        textAlign: "center",
      }}>
        n = {result.value?.toLocaleString()}
      </div>
    );
  }

  if (result.type === "count_values" && result.items) {
    return (
      <div style={{
        padding: "4px 10px 6px",
        borderTop: "1px solid #334155",
        fontSize: 10,
        color: "#cbd5e1",
        maxHeight: 80,
        overflow: "auto",
      }}>
        {result.items.slice(0, 5).map((item: any, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</span>
            <span style={{ fontWeight: 600, marginLeft: 8 }}>{item.count}</span>
          </div>
        ))}
        {result.total_unique > 5 && (
          <div style={{ color: "#64748b", fontStyle: "italic" }}>
            +{result.total_unique - 5} more
          </div>
        )}
      </div>
    );
  }

  if (result.type === "view" && result.count != null) {
    return (
      <div style={{
        padding: "2px 10px 4px",
        borderTop: "1px solid #334155",
        fontSize: 10,
        color: "#94a3b8",
        textAlign: "center",
      }}>
        {result.count.toLocaleString()} samples
      </div>
    );
  }

  if (result.message) {
    return (
      <div style={{
        padding: "4px 10px",
        borderTop: "1px solid #334155",
        fontSize: 10,
        color: "#10b981",
        textAlign: "center",
      }}>
        {result.message}
      </div>
    );
  }

  return null;
}

interface BaseNodeProps extends NodeProps {
  data: ComfyNodeData;
}

function BaseNodeComponent({ data, selected }: BaseNodeProps) {
  const hasInputs = data.inputs && data.inputs.length > 0;
  const hasOutputs = data.outputs && data.outputs.length > 0;

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 8,
        border: selected ? "2px solid #60a5fa" : "2px solid #334155",
        minWidth: 180,
        maxWidth: 220,
        boxShadow: selected
          ? "0 0 0 2px rgba(96,165,250,0.3), 0 4px 12px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.3)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Colored header */}
      <div
        style={{
          background: data.color,
          borderRadius: "6px 6px 0 0",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.label}
        </span>
        <StatusBadge
          status={data.status}
          durationMs={data.durationMs}
          error={data.error}
          progress={data.progress}
        />
      </div>

      {/* Parameter summary */}
      <ParamSummary params={data.params} paramsSchema={data.paramsSchema} />

      {/* Inline result (aggregations, outputs) */}
      <InlineResult result={data.result} />

      {/* Error message */}
      {data.error && (
        <div
          style={{
            padding: "4px 10px",
            borderTop: "1px solid #334155",
            fontSize: 10,
            color: "#fca5a5",
            background: "rgba(239,68,68,0.1)",
          }}
        >
          {data.error.length > 60 ? data.error.slice(0, 60) + "..." : data.error}
        </div>
      )}

      {/* Handles */}
      {hasInputs && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 10,
            height: 10,
            background: "#64748b",
            border: "2px solid #1e293b",
            left: -6,
          }}
        />
      )}
      {hasOutputs && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 10,
            height: 10,
            background: data.color,
            border: "2px solid #1e293b",
            right: -6,
          }}
        />
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
