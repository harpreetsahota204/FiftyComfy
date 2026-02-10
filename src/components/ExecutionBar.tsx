/**
 * ExecutionBar — top bar with Run, Save, Load, Clear controls
 * and the graph name editor.
 */

import React, { useState } from "react";

interface ExecutionBarProps {
  graphName: string;
  onGraphNameChange: (name: string) => void;
  isExecuting: boolean;
  onRun: () => void;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  nodeCount: number;
  lastRunInfo?: string;
}

export function ExecutionBar({
  graphName,
  onGraphNameChange,
  isExecuting,
  onRun,
  onSave,
  onLoad,
  onClear,
  nodeCount,
  lastRunInfo,
}: ExecutionBarProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      style={{
        height: 44,
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        fontFamily: "'Inter', -apple-system, sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Graph name */}
      {isEditing ? (
        <input
          type="text"
          value={graphName}
          onChange={(e) => onGraphNameChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
          autoFocus
          style={{
            background: "#1e293b",
            border: "1px solid #3b82f6",
            borderRadius: 4,
            padding: "3px 8px",
            color: "#f1f5f9",
            fontSize: 13,
            fontWeight: 600,
            outline: "none",
            width: 200,
          }}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#f1f5f9",
            cursor: "pointer",
            padding: "3px 8px",
            borderRadius: 4,
            border: "1px solid transparent",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#334155";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
          title="Click to rename"
        >
          {graphName || "Untitled Workflow"}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Status info */}
      {lastRunInfo && (
        <span style={{ fontSize: 11, color: "#64748b", marginRight: 8 }}>
          {lastRunInfo}
        </span>
      )}
      <span style={{ fontSize: 11, color: "#475569" }}>
        {nodeCount} node{nodeCount !== 1 ? "s" : ""}
      </span>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "#334155" }} />

      {/* Action buttons */}
      <BarButton
        onClick={onRun}
        disabled={isExecuting || nodeCount === 0}
        color="#10b981"
        label={isExecuting ? "Running..." : "\u25B6 Run"}
      />
      <BarButton onClick={onSave} disabled={isExecuting} color="#3b82f6" label="Save" />
      <BarButton onClick={onLoad} disabled={isExecuting} color="#8b5cf6" label="Load" />
      <BarButton onClick={onClear} disabled={isExecuting} color="#64748b" label="Clear" />
    </div>
  );
}

function BarButton({
  onClick,
  disabled,
  color,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  color: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        border: `1px solid ${disabled ? "#334155" : color}`,
        background: disabled ? "#1e293b" : `${color}22`,
        color: disabled ? "#475569" : color,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
