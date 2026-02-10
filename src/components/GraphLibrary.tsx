/**
 * GraphLibrary — modal dialog for browsing, loading, and deleting
 * saved workflow graphs.
 */

import React, { useEffect, useState } from "react";
import { GraphIndexEntry } from "../types";

interface GraphLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (graphId: string) => void;
  onDelete: (graphId: string) => void;
  graphs: GraphIndexEntry[];
  isLoading: boolean;
}

export function GraphLibrary({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  graphs,
  isLoading,
}: GraphLibraryProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: 12,
          border: "1px solid #334155",
          width: 480,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
            Saved Workflows
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: 18,
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {isLoading ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Loading...
            </div>
          ) : graphs.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              No saved workflows yet. Build a graph and click Save.
            </div>
          ) : (
            graphs.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: "10px 12px",
                  margin: 4,
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "border-color 0.15s",
                  cursor: "pointer",
                }}
                onClick={() => onLoad(g.id)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#334155";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#e2e8f0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 2,
                    }}
                  >
                    {g.node_count != null && `${g.node_count} nodes`}
                    {g.updated_at &&
                      ` \u00B7 ${new Date(g.updated_at).toLocaleDateString()}`}
                  </div>
                  {g.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${g.name}"?`)) {
                      onDelete(g.id);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px 8px",
                    fontSize: 11,
                  }}
                  title="Delete workflow"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
