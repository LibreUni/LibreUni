"""Small, durable MVP path: author once, review once, validate, apply."""
import json
import uuid
from pathlib import Path

from .audit import audit_text
from .graph import _target_files
from .llm import ModelClient
from .rules import load_rules


def run_mvp(settings, target: str, kind: str, objective: str, apply_changes: bool) -> tuple[str, str, Path]:
    if kind != "lesson":
        raise ValueError("MVP mode currently supports one lesson; use the full workflow for courses/modules.")
    files = _target_files(settings.root, target, kind)
    if len(files) != 1:
        raise FileNotFoundError(f"Expected one lesson for {target!r}")
    path = files[0]
    relative = str(path.relative_to(settings.root))
    run_id = uuid.uuid4().hex
    workspace = settings.artifacts / "runs" / run_id
    workspace.mkdir(parents=True, exist_ok=True)
    baseline = path.read_text(encoding="utf-8")
    (workspace / "baseline.mdx").write_text(baseline, encoding="utf-8")
    rules = load_rules(settings.root)
    writer = ModelClient(settings.model, settings.api_timeout_seconds, min(settings.max_output_tokens, 14000), settings.reasoning_effort)
    writer_prompt = """You are the primary LibreUni lesson author. Rewrite the supplied lesson only where a hostile expert panel would find a real learning problem. Use the loaded pedagogical standard: I do, We do, You do; question -> attempt -> obstacle -> insight -> formalization -> transfer. Fix prerequisites, misconceptions, worked reasoning, exercise solvability and feedback. Preserve correct mathematics and useful material. Never make cosmetic heading changes. Return JSON exactly {\"content\":\"complete MDX file\",\"rationale\":\"short substantive changes\"}."""
    draft = writer.json(writer_prompt + "\nRULES:\n" + rules, json.dumps({"path": relative, "objective": objective, "lesson": baseline}, ensure_ascii=False), repair_invalid=False)
    content = draft.get("content", "")
    if not content:
        raise RuntimeError("MVP author returned no lesson content")
    (workspace / "draft.mdx").write_text(content, encoding="utf-8")
    reviewer = ModelClient(settings.reviewer_model, settings.api_timeout_seconds, min(settings.max_output_tokens, 5000), settings.reasoning_effort)
    review = reviewer.json("""You are the final hostile LibreUni review panel. Check mathematics, prerequisites, I-do/We-do/You-do progression, guided exploration, exercise transfer, feedback, sourcing, and MDX. Cosmetic concerns do not count. Return JSON exactly {\"approved\":bool,\"findings\":[{\"severity\":\"error|warning\",\"issue\":\"specific problem\",\"fix\":\"specific repair\"}]} . Approve only if no serious problem remains.""" + "\nRULES:\n" + rules, json.dumps({"path": relative, "draft": content}, ensure_ascii=False), repair_invalid=False)
    check = audit_text(content, relative)
    manifest = {"run_id": run_id, "mode": "mvp", "target": relative, "review": review, "check": check, "rationale": draft.get("rationale", ""), "applied": False}
    approved = bool(review.get("approved")) and not check["errors"] and not any(f.get("severity") == "error" for f in review.get("findings", []))
    if approved and apply_changes:
        path.write_text(content, encoding="utf-8")
        manifest["applied"] = True
    (workspace / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return ("approved" if approved else "blocked"), run_id, workspace
