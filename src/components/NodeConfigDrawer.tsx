/**
 * NodeConfigDrawer — right sidebar that shows the configuration form
 * for the currently selected node. Form fields are dynamically
 * generated from the node's paramsSchema.
 */

import React, { useCallback } from "react";
import { ComfyNodeData, ParamSchema } from "../types";

interface NodeConfigDrawerProps {
  node: { id: string; data: ComfyNodeData } | null;
  onUpdateParams: (nodeId: string, params: Record<string, any>) => void;
  onDelete: () => void;
}

// Individual field renderers

function StringField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ParamSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>
        {schema.label}
        {schema.required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {schema.description && <div style={descStyle}>{schema.description}</div>}
      <input
        type="text"
        value={value ?? ""}
        placeholder={schema.placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function IntField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ParamSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>
        {schema.label}
        {schema.required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {schema.description && <div style={descStyle}>{schema.description}</div>}
      <input
        type="number"
        value={value ?? ""}
        min={schema.min}
        max={schema.max}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : parseInt(v, 10));
        }}
        style={inputStyle}
      />
    </div>
  );
}

function FloatField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ParamSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>
        {schema.label}
        {schema.required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {schema.description && <div style={descStyle}>{schema.description}</div>}
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        min={schema.min}
        max={schema.max}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : parseFloat(v));
        }}
        style={inputStyle}
      />
    </div>
  );
}

function BoolField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ParamSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  return (
    <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#3b82f6", width: 14, height: 14 }}
      />
      <label style={{ ...labelStyle, marginBottom: 0 }}>
        {schema.label}
      </label>
    </div>
  );
}

function EnumField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ParamSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  const options = schema.values || [];
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>
        {schema.label}
        {schema.required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {schema.description && <div style={descStyle}>{schema.description}</div>}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ ...inputStyle, cursor: "pointer" }}
      >
        <option value="">-- Select --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function ListField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ParamSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  const items: string[] = Array.isArray(value) ? value : [];

  const addItem = () => onChange([...items, ""]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, val: string) =>
    onChange(items.map((item, i) => (i === idx ? val : item)));

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>
        {schema.label}
        {schema.required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {schema.description && <div style={descStyle}>{schema.description}</div>}
      {items.map((item, idx) => (
        <div key={idx} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => removeItem(idx)}
            style={smallBtnStyle}
            title="Remove"
          >
            &times;
          </button>
        </div>
      ))}
      <button onClick={addItem} style={{ ...smallBtnStyle, fontSize: 11, padding: "4px 8px" }}>
        + Add
      </button>
    </div>
  );
}

// Main component

export function NodeConfigDrawer({
  node,
  onUpdateParams,
  onDelete,
}: NodeConfigDrawerProps) {
  const handleChange = useCallback(
    (paramName: string, value: any) => {
      if (node) {
        onUpdateParams(node.id, { [paramName]: value });
      }
    },
    [node, onUpdateParams]
  );

  if (!node) {
    return (
      <div
        style={{
          width: 240,
          background: "#0f172a",
          borderLeft: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 20 }}>
          Select a node to edit its configuration
        </div>
      </div>
    );
  }

  const { data } = node;
  const schemaEntries = Object.entries(data.paramsSchema);

  return (
    <div
      style={{
        width: 240,
        background: "#0f172a",
        borderLeft: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: data.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", flex: 1 }}>
          {data.label}
        </span>
        <button
          onClick={onDelete}
          style={{
            ...smallBtnStyle,
            color: "#f43f5e",
            borderColor: "#f43f5e33",
          }}
          title="Delete node"
        >
          &times;
        </button>
      </div>

      {/* Description */}
      <div
        style={{
          padding: "6px 12px",
          fontSize: 11,
          color: "#64748b",
          borderBottom: "1px solid #1e293b",
        }}
      >
        {data.description}
      </div>

      {/* Form fields */}
      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
        {schemaEntries.length === 0 && (
          <div style={{ color: "#475569", fontSize: 11, fontStyle: "italic" }}>
            No configurable parameters
          </div>
        )}
        {schemaEntries.map(([name, schema]) => {
          const value = data.params[name];
          const fieldProps = {
            name,
            schema,
            value,
            onChange: (v: any) => handleChange(name, v),
          };

          switch (schema.type) {
            case "string":
              return <StringField key={name} {...fieldProps} />;
            case "int":
              return <IntField key={name} {...fieldProps} />;
            case "float":
              return <FloatField key={name} {...fieldProps} />;
            case "bool":
              return <BoolField key={name} {...fieldProps} />;
            case "enum":
              return <EnumField key={name} {...fieldProps} />;
            case "list":
              return <ListField key={name} {...fieldProps} />;
            default:
              return <StringField key={name} {...fieldProps} />;
          }
        })}
      </div>
    </div>
  );
}

// Shared styles

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#cbd5e1",
  marginBottom: 3,
};

const descStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#64748b",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  borderRadius: 4,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid #334155",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
};
