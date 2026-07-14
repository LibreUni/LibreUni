import json
import re
import sqlite3
import uuid
from pathlib import Path
from typing import Any

from .audit import audit_text, run_repo_checks, split_frontmatter
from .config import Settings
from .llm import ModelClient
from .research import research
from .rules import load_rules
from .state import WorkflowState


def _target_files(root: Path, target: str, kind: str) -> list[Path]:
    lessons = root / "src" / "content" / "lessons"
    if kind == "lesson":
        candidate = Path(target) if target.endswith(".mdx") else next(lessons.glob(f"*/{target}.mdx"), None)
        return [candidate] if candidate and candidate.exists() else []
    if kind == "course":
        matches = []
        for path in sorted(lessons.glob("*/*.mdx")):
            frontmatter, _ = split_frontmatter(path.read_text(encoding="utf-8"))
            if frontmatter.get("course") == target:
                matches.append(path)
        return matches or sorted((lessons / target).glob("*.mdx"))
    manifest = root / "src" / "data" / "course-manifests" / f"{target}.yml"
    if not manifest.exists():
        return []
    import yaml
    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    names = [lesson for module in data.get("modules", []) for lesson in module.get("lessons", [])]
    return sorted(path for name in names if (path := next(lessons.glob(f"*/{name}.mdx"), None)))


def _record(state: WorkflowState, event: str, **details: Any) -> list[dict[str, Any]]:
    return [*state.get("history", []), {"event": event, **details}]


def build_workflow(settings: Settings, apply_changes: bool = False):
    try:
        from langgraph.graph import END, START, StateGraph
        from langgraph.checkpoint.memory import MemorySaver
    except ImportError as exc:
        raise RuntimeError("Install the workflow dependencies with: pip install -e '.[test]'") from exc

    def inventory(state: WorkflowState) -> WorkflowState:
        root = Path(state["root"])
        files = _target_files(root, state["target"], state["target_kind"])
        if not files:
            raise FileNotFoundError(f"No lessons found for {state['target_kind']} '{state['target']}'")
        return {"phase": "inventory", "rules": load_rules(root), "inventory": {"files": [str(p.relative_to(root)) for p in files], "contents": {str(p.relative_to(root)): p.read_text(encoding="utf-8") for p in files}}, "history": _record(state, "inventory", files=len(files))}

    def source_research(state: WorkflowState) -> WorkflowState:
        query = f"{state['target']} university education authoritative documentation open educational resources"
        try:
            sources = research(query, settings.max_sources)
        except Exception as exc:
            return {"phase": "research", "findings": [{"severity": "blocker", "issue": "Online research failed", "evidence": str(exc)}], "history": _record(state, "research_failed", query=query, error=str(exc))}
        if not sources:
            return {"phase": "research", "findings": [{"severity": "blocker", "issue": "No verifiable sources could be fetched", "evidence": query}], "history": _record(state, "research_failed", query=query)}
        return {"phase": "research", "sources": sources, "history": _record(state, "research", sources=len(sources))}

    def research_gate(state: WorkflowState) -> str:
        return "blocked" if not state.get("sources") else "plan"

    def plan(state: WorkflowState) -> WorkflowState:
        client = ModelClient(settings.model)
        prompt = """Create a concrete improvement plan for the target. Return JSON with keys `rationale`, `files`, and `checks`. `files` is an array of objects with `path`, `goal`, and `claims_to_support`. Do not invent sources; use only the evidence bundle. Preserve existing intent and do not propose mass mechanical rewrites."""
        response = client.json(prompt + "\nPROJECT RULES:\n" + state["rules"], json.dumps({"target": state["target"], "objective": state["objective"], "inventory": state["inventory"], "sources": state.get("sources", [])}, ensure_ascii=False))
        return {"phase": "plan", "plan": response, "history": _record(state, "plan")}

    def draft(state: WorkflowState) -> WorkflowState:
        client = ModelClient(settings.model)
        prompt = """Write the planned LibreUni files. Return JSON `{\"files\":[{\"path\":\"...\",\"content\":\"complete MDX content\"}]}`. Content must be self-contained, university level, theory → example → exercise, and include genuine visible references with URLs from the evidence bundle. Do not add fake tracking comments. Keep unchanged files out of the response. You are proposing content, not certifying it."""
        response = client.json(prompt + "\nPROJECT RULES:\n" + state["rules"], json.dumps({"plan": state["plan"], "existing": state["inventory"]["contents"], "sources": state.get("sources", [])}, ensure_ascii=False))
        drafts = {item["path"]: item["content"] for item in response.get("files", []) if item.get("path") and item.get("content")}
        return {"phase": "draft", "drafts": drafts, "history": _record(state, "draft", files=len(drafts))}

    def deterministic_audit(state: WorkflowState) -> WorkflowState:
        root = Path(state["root"])
        checks = {path: audit_text(content, path) for path, content in state.get("drafts", {}).items()}
        findings = []
        if not checks:
            findings.append({"severity": "blocker", "issue": "Writer returned no proposed files", "evidence": "draft response"})
        for path, result in checks.items():
            findings.extend({"path": path, "severity": "error", "issue": error} for error in result["errors"])
            findings.extend({"path": path, "severity": "warning", "issue": warning} for warning in result["warnings"])
        return {"phase": "deterministic_audit", "checks": checks, "findings": findings, "history": _record(state, "deterministic_audit", findings=len(findings))}

    def adversarial_review(state: WorkflowState) -> WorkflowState:
        client = ModelClient(settings.reviewer_model)
        prompt = """Act as an adversarial academic editor. Inspect the proposed files against every rule and every cited source. Return JSON `{\"approved\":bool,\"findings\":[{\"path\":\"...\",\"severity\":\"blocker|error|warning\",\"issue\":\"...\",\"evidence\":\"specific quote, rule, or source URL\",\"fix\":\"precise repair\"}]}`. Never approve based on the author's claims. Flag unsupported claims, fabricated citations, copied wording, missing prerequisites, weak exercises, and MDX/component errors."""
        response = client.json(prompt + "\nRULES:\n" + state["rules"], json.dumps({"drafts": state.get("drafts", {}), "sources": state.get("sources", []), "deterministic": state.get("findings", [])}, ensure_ascii=False))
        findings = [*state.get("findings", []), *response.get("findings", [])]
        return {"phase": "review", "review": response, "findings": findings, "history": _record(state, "adversarial_review", approved=response.get("approved", False))}

    def revise(state: WorkflowState) -> WorkflowState:
        client = ModelClient(settings.model)
        prompt = """Repair every blocker and error in the proposed files. Return the same JSON file format. Make only evidence-backed changes. Preserve all good material and include complete file contents."""
        response = client.json(prompt + "\nRULES:\n" + state["rules"], json.dumps({"drafts": state.get("drafts", {}), "findings": state.get("findings", []), "sources": state.get("sources", [])}, ensure_ascii=False))
        drafts = {item["path"]: item["content"] for item in response.get("files", []) if item.get("path") and item.get("content")}
        return {"phase": "revise", "drafts": drafts, "revision_count": state.get("revision_count", 0) + 1, "history": _record(state, "revision", count=state.get("revision_count", 0) + 1)}

    def gate(state: WorkflowState) -> str:
        hard = [f for f in state.get("findings", []) if f.get("severity") in ("blocker", "error")]
        if not hard and state.get("review", {}).get("approved") and all(v.get("passed") for v in state.get("checks", {}).values()):
            return "final_checks"
        if state.get("revision_count", 0) >= settings.max_revisions:
            return "blocked"
        return "revise"

    def final_checks(state: WorkflowState) -> WorkflowState:
        root = Path(state["root"])
        check = run_repo_checks(root, state["target"], state["target_kind"], list(state.get("inventory", {}).get("files", []))) if state["target_kind"] != "lesson" else {"passed": all(item["passed"] for item in state["checks"].values()), "commands": []}
        status = "approved" if check["passed"] else "blocked"
        settings.artifacts.mkdir(parents=True, exist_ok=True)
        manifest = {"run_id": state["run_id"], "target": state["target"], "status": status, "revisions": state.get("revision_count", 0), "sources": state.get("sources", []), "plan": state.get("plan", {}), "review": state.get("review", {}), "findings": state.get("findings", []), "history": state.get("history", []), "checks": check}
        (settings.artifacts / f"{state['run_id']}.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        if status == "approved":
            for relative, content in state.get("drafts", {}).items():
                proposal = settings.artifacts / state["run_id"] / relative
                proposal.parent.mkdir(parents=True, exist_ok=True)
                proposal.write_text(content, encoding="utf-8")
                if apply_changes:
                    (root / relative).write_text(content, encoding="utf-8")
        return {"phase": "final", "status": status, "checks": {"repo": check}, "history": _record(state, "final", status=status)}

    def blocked(state: WorkflowState) -> WorkflowState:
        settings.artifacts.mkdir(parents=True, exist_ok=True)
        (settings.artifacts / f"{state['run_id']}-blocked.json").write_text(json.dumps({"target": state["target"], "findings": state.get("findings", []), "history": state.get("history", [])}, indent=2), encoding="utf-8")
        return {"phase": "blocked", "status": "blocked", "history": _record(state, "blocked", reason="quality gate did not pass")}

    graph = StateGraph(WorkflowState)
    for name, node in (("inventory", inventory), ("research", source_research), ("plan", plan), ("draft", draft), ("deterministic_audit", deterministic_audit), ("adversarial_review", adversarial_review), ("revise", revise), ("final_checks", final_checks), ("blocked", blocked)):
        graph.add_node(name, node)
    graph.add_edge(START, "inventory")
    graph.add_edge("inventory", "research")
    graph.add_conditional_edges("research", research_gate, {"plan": "plan", "blocked": "blocked"})
    graph.add_edge("plan", "draft")
    graph.add_edge("draft", "deterministic_audit")
    graph.add_edge("deterministic_audit", "adversarial_review")
    graph.add_conditional_edges("adversarial_review", gate, {"revise": "revise", "final_checks": "final_checks", "blocked": "blocked"})
    graph.add_edge("revise", "deterministic_audit")
    graph.add_edge("final_checks", END)
    graph.add_edge("blocked", END)
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        settings.artifacts.mkdir(parents=True, exist_ok=True)
        checkpointer = SqliteSaver(sqlite3.connect(settings.artifacts / "runs.sqlite", check_same_thread=False))
    except ImportError:
        checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


def initial_state(settings: Settings, target: str, target_kind: str, objective: str) -> WorkflowState:
    return {"run_id": uuid.uuid4().hex, "root": str(settings.root), "target": target, "target_kind": target_kind, "objective": objective, "revision_count": 0, "findings": [], "history": [], "status": "running"}
