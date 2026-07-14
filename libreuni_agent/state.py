from typing import Any, Literal, TypedDict


class WorkflowState(TypedDict, total=False):
    run_id: str
    target: str
    target_kind: Literal["course", "module", "lesson"]
    objective: str
    root: str
    phase: str
    inventory: dict[str, Any]
    rules: str
    sources: list[dict[str, Any]]
    plan: dict[str, Any]
    drafts: dict[str, str]
    findings: list[dict[str, Any]]
    review: dict[str, Any]
    revision_count: int
    revision_cursor: int
    checks: dict[str, Any]
    history: list[dict[str, Any]]
    status: Literal["running", "approved", "blocked", "failed"]
    error: str
