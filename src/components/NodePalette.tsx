/**
 * NodePalette — left sidebar listing all available node types,
 * grouped by category. Users drag items from here onto the canvas.
 */

import React, { useState, DragEvent } from "react";
import { NodeTypeDef, NodeCategory } from "../types";
import { CATEGORIES, CategoryMeta } from "../registry";

interface NodePaletteProps {
  catalog: NodeTypeDef[];
}

// Category icons (simple unicode)
const CATEGORY_ICONS: Record<string, string> = {
  source: "\u{1F4BE}",      // floppy disk
  view_stage: "\u{1F50D}",  // magnifying glass
  brain: "\u{1F9E0}",       // brain
  aggregation: "\u{1F4CA}", // bar chart
  output: "\u{1F4E4}",      // outbox
};

function PaletteItem({ nodeDef }: { nodeDef: NodeTypeDef }) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("application/fiftycomfy-node-type", nodeDef.type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        padding: "6px 10px",
        margin: "2px 0",
        borderRadius: 6,
        cursor: "grab",
        fontSize: 12,
        color: "#e2e8f0",
        background: "#1e293b",
        border: "1px solid #334155",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#334155";
        (e.currentTarget as HTMLElement).style.borderColor = nodeDef.color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#1e293b";
        (e.currentTarget as HTMLElement).style.borderColor = "#334155";
      }}
      title={nodeDef.description}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: nodeDef.color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 500 }}>{nodeDef.label}</span>
    </div>
  );
}

export function NodePalette({ catalog }: NodePaletteProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const filteredCatalog = search
    ? catalog.filter(
        (n) =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase())
      )
    : catalog;

  const grouped: Record<string, NodeTypeDef[]> = {};
  for (const node of filteredCatalog) {
    if (!grouped[node.category]) grouped[node.category] = [];
    grouped[node.category].push(node);
  }

  return (
    <div
      style={{
        width: 200,
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Search */}
      <div style={{ padding: "8px 8px 4px" }}>
        <input
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#e2e8f0",
            fontSize: 11,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category groups */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px" }}>
        {CATEGORIES.map((cat) => {
          const nodes = grouped[cat.key];
          if (!nodes || nodes.length === 0) return null;
          const isCollapsed = collapsed[cat.key];

          return (
            <div key={cat.key} style={{ marginTop: 8 }}>
              <div
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [cat.key]: !c[cat.key] }))
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 4px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#94a3b8",
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: 8, color: cat.color }}>
                  {isCollapsed ? "\u25B6" : "\u25BC"}
                </span>
                <span>{CATEGORY_ICONS[cat.key] || ""}</span>
                <span>{cat.label}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: "#64748b",
                  }}
                >
                  {nodes.length}
                </span>
              </div>
              {!isCollapsed && (
                <div>
                  {nodes.map((n) => (
                    <PaletteItem key={n.type} nodeDef={n} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
