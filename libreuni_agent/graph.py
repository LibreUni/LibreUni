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


def _batches(items: list[str], size: int) -> list[list[str]]:
    return [items[index:index + max(1, size)] for index in range(0, len(items), max(1, size))]


def _compact_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"title": source.get("title", ""), "url": source.get("url", ""), "snippet": source.get("snippet", "")[:1000], "text": source.get("text", "")[:3000]} for source in sources]


def _revision_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"title": source.get("title", ""), "url": source.get("url", ""), "snippet": source.get("snippet", "")[:600]} for source in sources]


def _compact_inventory(inventory: dict[str, Any]) -> dict[str, Any]:
    return {"files": inventory.get("files", []), "contents": {path: content[:2000] for path, content in inventory.get("contents", {}).items()}}


def _normalize_review(findings: list[dict[str, Any]], sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    urls = [source.get("url", "") for source in sources if source.get("url")]
    normalized = []
    for finding in findings:
        item = dict(finding)
        evidence = str(item.get("evidence", ""))
        issue = str(item.get("issue", ""))
        source_claim = re.search(r"source|citation|claim|fabricat|unsupported|historical", issue, re.I)
        has_url = any(url in evidence for url in urls)
        has_rule = bool(re.search(r"docs/|RULES\.md|SOURCING\.md", evidence, re.I))
        if item.get("severity") in ("blocker", "error") and (not has_url and (source_claim or not has_rule)):
            item["severity"] = "warning"
            item["normalization"] = "Reviewer severity downgraded because its evidence did not cite a fetched URL or repository rule."
        normalized.append(item)
    return normalized


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
        client = ModelClient(settings.model, settings.api_timeout_seconds, min(settings.max_output_tokens, 4000), settings.reasoning_effort)
        prompt = """Create a concrete improvement plan for the target. Return JSON with keys `rationale`, `files`, and `checks`. `files` is an array of objects with `path`, `goal`, and `claims_to_support`. Do not invent sources; use only the evidence bundle. Preserve existing intent and do not propose mass mechanical rewrites."""
        inventory = state["inventory"]
        # Keep planning bounded for whole courses. Detailed lesson text is
        # supplied later to the deterministic auditor, reviewer, and editor;
        # the planner only needs the file inventory, objective, and evidence.
        plan_input = {"target": state["target"], "objective": state["objective"], "files": inventory.get("files", []), "sources": _compact_sources(state.get("sources", []))}
        response = client.json(prompt + "\nPROJECT RULES:\n" + state["rules"], json.dumps(plan_input, ensure_ascii=False))
        return {"phase": "plan", "plan": response, "history": _record(state, "plan")}

    def draft(state: WorkflowState) -> WorkflowState:
        planned = [item.get("path") for item in state["plan"].get("files", []) if item.get("path") in state["inventory"]["contents"]]
        paths = planned or list(state["inventory"]["contents"])
        drafts = {path: state["inventory"]["contents"][path] for path in paths}
        return {"phase": "draft", "drafts": drafts, "history": _record(state, "draft", files=len(drafts), mode="existing_content_baseline")}

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
        client = ModelClient(settings.reviewer_model, settings.api_timeout_seconds, min(settings.max_output_tokens, 6000), settings.reasoning_effort)
        prompt = """Act as an adversarial academic editor. Inspect the proposed files against every rule and cited source. Return compact JSON `{\"approved\":bool,\"findings\":[{\"path\":\"...\",\"severity\":\"blocker|error|warning\",\"issue\":\"short issue\",\"evidence\":\"short rule or URL\",\"fix\":\"short repair\"}]}`. Return at most five highest-priority findings per call. Never use long quotations or commentary. Never approve based on the author's claims. Flag unsupported claims, fabricated citations, copied wording, missing prerequisites, weak exercises, and MDX/component errors."""
        findings = list(state.get("findings", []))
        approved = True
        paths = list(state.get("drafts", {}))
        batches = _batches(paths, settings.files_per_call)
        for batch in batches:
            response = client.json(prompt + "\nRULES:\n" + state["rules"], json.dumps({"drafts": {path: state["drafts"][path] for path in batch}, "sources": _compact_sources(state.get("sources", [])), "deterministic": [finding for finding in findings if finding.get("path") in batch]}, ensure_ascii=False))
            reviewer_findings = _normalize_review([{**finding, "path": finding.get("path") or batch[0]} for finding in response.get("findings", [])], state.get("sources", []))
            approved = approved and not any(finding.get("severity") in ("blocker", "error") for finding in reviewer_findings)
            findings.extend(reviewer_findings)
        return {"phase": "review", "review": {"approved": approved}, "findings": findings, "history": _record(state, "adversarial_review", approved=approved, batches=len(batches))}

    def revise(state: WorkflowState) -> WorkflowState:
        client = ModelClient(settings.model, settings.api_timeout_seconds, min(settings.max_output_tokens, 8000) if settings.revision_mode == "edits" else settings.max_output_tokens, settings.reasoning_effort)
        if settings.revision_mode == "edits":
            paths = sorted({finding.get("path") for finding in state.get("findings", []) if finding.get("path") in state.get("drafts", {}) and finding.get("severity") in ("blocker", "error")}) or list(state.get("drafts", {}))
            drafts = dict(state.get("drafts", {}))
            batches = _batches(paths, settings.files_per_call)
            applied = 0
            failed = []
            prompt = """Return compact JSON exactly as {\"edits\":[{\"old\":\"exact existing substring\",\"new\":\"replacement substring\"}]}. Repair only the listed hard findings in the supplied MDX file. Each `old` string must occur exactly once. Keep edits small and preserve all unrelated content. Do not return full files, markdown, or commentary. Return an empty edits array only if no safe evidence-backed edit exists."""
            for batch in batches:
                for path in batch:
                    hard_findings = [finding for finding in state.get("findings", []) if finding.get("path") == path and finding.get("severity") in ("blocker", "error")]
                    content = drafts[path]
                    # Small finding groups keep the edit contract tractable for cheap models.
                    path_applied = 0
                    for finding_group in _batches(hard_findings[:20], 5) or [[]]:
                        response = client.json(prompt + "\nRELEVANT RULES:\n" + state["rules"][:6000], json.dumps({"path": path, "draft": content, "findings": finding_group, "sources": _revision_sources(state.get("sources", []))}, ensure_ascii=False))
                        for edit in response.get("edits", []):
                            old, new = edit.get("old"), edit.get("new")
                            if isinstance(old, str) and isinstance(new, str) and old and content.count(old) == 1:
                                content = content.replace(old, new)
                                applied += 1
                                path_applied += 1
                    if not path_applied:
                        failed.append(path)
                    drafts[path] = content
            findings = [{"severity": "blocker", "issue": "No safe edits were returned for revision", "path": path, "evidence": path} for path in failed]
            return {"phase": "revise", "drafts": drafts, "findings": findings, "revision_count": state.get("revision_count", 0) + 1, "history": _record(state, "revision", count=state.get("revision_count", 0) + 1, mode="edits", batches=len(batches), applied=applied, failed=len(failed))}
        prompt = """Repair every blocker and error in the proposed files. Return the same JSON file format. Make only evidence-backed changes. Preserve all good material and include complete file contents."""
        paths = sorted({finding.get("path") for finding in state.get("findings", []) if finding.get("path") in state.get("drafts")}) or list(state.get("drafts", {}))
        drafts = dict(state.get("drafts", {}))
        empty_batches = []
        batches = _batches(paths, settings.files_per_call)
        for batch in batches:
            focused_prompt = """Return exactly one complete corrected MDX file as JSON: {\"files\":[{\"path\":\"EXACT_PATH\",\"content\":\"FULL_FILE\"}]}. Use the exact path provided. Repair only the listed hard findings. Do not return an empty files array, a patch, markdown fences, or commentary."""
            hard_findings = [finding for finding in state.get("findings", []) if finding.get("path") in batch and finding.get("severity") in ("blocker", "error")]
            focused = client.json(focused_prompt + "\nRELEVANT RULES:\n" + state["rules"][:6000], json.dumps({"path": batch[0], "draft": drafts[batch[0]], "findings": hard_findings[:20], "sources": _revision_sources(state.get("sources", []))}, ensure_ascii=False), repair_invalid=False)
            returned = {}
            for item in focused.get("files", []):
                item_path = item.get("path") or batch[0]
                if item.get("content") and item_path == batch[0]:
                    returned[item_path] = item["content"]
            if not returned:
                retry = client.json(focused_prompt + "\nRELEVANT RULES:\n" + state["rules"][:6000], json.dumps({"path": batch[0], "draft": drafts[batch[0]], "findings": hard_findings[:5]}, ensure_ascii=False), repair_invalid=False)
                for item in retry.get("files", []):
                    item_path = item.get("path") or batch[0]
                    if item.get("content") and item_path == batch[0]:
                        returned[item_path] = item["content"]
            if not returned:
                empty_batches.append(batch)
            drafts.update(returned)
        new_findings = [{"severity": "blocker", "issue": "Writer returned no files for revision batch", "evidence": ", ".join(batch), "path": batch[0]} for batch in empty_batches]
        return {"phase": "revise", "drafts": drafts, "findings": new_findings, "revision_count": state.get("revision_count", 0) + 1, "history": _record(state, "revision", count=state.get("revision_count", 0) + 1, batches=len(batches), empty_batches=len(empty_batches))}

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
        (settings.artifacts / f"{state['run_id']}-blocked.json").write_text(json.dumps({"target": state["target"], "findings": state.get("findings", []), "drafts": state.get("drafts", {}), "sources": state.get("sources", []), "history": state.get("history", [])}, indent=2), encoding="utf-8")
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
    return {"run_id": uuid.uuid4().hex, "root": str(settings.root), "target": target, "target_kind": target_kind, "objective": objective, "revision_count": 0, "revision_cursor": 0, "findings": [], "history": [], "status": "running"}
