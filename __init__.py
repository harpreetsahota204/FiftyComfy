"""
FiftyComfy — Visual, node-based workflow editor for FiftyOne.

A hybrid FiftyOne plugin (React frontend + Python backend) that provides
a drag-and-drop canvas for composing FiftyOne operations as a DAG.
"""

from .panel import FiftyComfyPanel, ExecuteGraphOperator, ValidateGraphOperator


def register(p):
    p.register(FiftyComfyPanel)
    p.register(ExecuteGraphOperator)
    p.register(ValidateGraphOperator)
