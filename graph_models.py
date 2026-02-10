"""
Graph data models for FiftyComfy.

Defines the serialization format for graphs, nodes, and edges
that flow between the React frontend and Python backend.
"""

from dataclasses import dataclass, field, asdict
from typing import Any, Optional
from datetime import datetime
import uuid


@dataclass
class Position:
    x: float = 0.0
    y: float = 0.0


@dataclass
class GraphNode:
    """A single node in the workflow graph."""

    id: str
    type: str  # e.g. "source/dataset", "view_stage/match"
    position: Position = field(default_factory=Position)
    params: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict) -> "GraphNode":
        pos = data.get("position", {})
        return cls(
            id=data["id"],
            type=data["type"],
            position=Position(x=pos.get("x", 0), y=pos.get("y", 0)),
            params=data.get("params", {}),
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "position": {"x": self.position.x, "y": self.position.y},
            "params": self.params,
        }


@dataclass
class GraphEdge:
    """A directed edge connecting two nodes."""

    id: str
    source: str  # source node id
    target: str  # target node id
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "GraphEdge":
        return cls(
            id=data["id"],
            source=data["source"],
            target=data["target"],
            source_handle=data.get("sourceHandle"),
            target_handle=data.get("targetHandle"),
        )

    def to_dict(self) -> dict:
        d = {
            "id": self.id,
            "source": self.source,
            "target": self.target,
        }
        if self.source_handle:
            d["sourceHandle"] = self.source_handle
        if self.target_handle:
            d["targetHandle"] = self.target_handle
        return d


@dataclass
class Graph:
    """A complete workflow graph."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Untitled Workflow"
    description: str = ""
    created_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z"
    )
    updated_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z"
    )
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> "Graph":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data.get("name", "Untitled Workflow"),
            description=data.get("description", ""),
            created_at=data.get("created_at", datetime.utcnow().isoformat() + "Z"),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat() + "Z"),
            nodes=[GraphNode.from_dict(n) for n in data.get("nodes", [])],
            edges=[GraphEdge.from_dict(e) for e in data.get("edges", [])],
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
        }

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None

    def get_parents(self, node_id: str) -> list[str]:
        """Get IDs of all parent nodes (nodes with edges pointing to node_id)."""
        return [e.source for e in self.edges if e.target == node_id]

    def get_children(self, node_id: str) -> list[str]:
        """Get IDs of all child nodes (nodes with edges from node_id)."""
        return [e.target for e in self.edges if e.source == node_id]


@dataclass
class ValidationError:
    """A validation error for a specific node or the graph overall."""

    node_id: Optional[str]  # None for graph-level errors
    message: str
    field: Optional[str] = None  # Specific param field, if applicable

    def to_dict(self) -> dict:
        d = {"message": self.message}
        if self.node_id:
            d["node_id"] = self.node_id
        if self.field:
            d["field"] = self.field
        return d
