import argparse
import json
import os
from pathlib import Path

from .config import Settings
from .graph import build_workflow, initial_state
from .mvp import run_mvp


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an evidence-driven LibreUni course workflow")
    parser.add_argument("target", nargs="?", help="course slug, manifest slug, or lesson slug/path")
    parser.add_argument("--kind", choices=("course", "module", "lesson"), default=os.getenv("LIBREUNI_KIND", "course"))
    parser.add_argument("--objective", default=os.getenv("LIBREUNI_OBJECTIVE", "Audit and improve the target while preserving its intent."))
    parser.add_argument("--apply", action="store_true", default=os.getenv("LIBREUNI_APPLY", "").lower() in ("1", "true", "yes"), help="Write approved proposals into the repository (or set LIBREUNI_APPLY=1)")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--check-config", action="store_true", help="Check local configuration without starting a workflow")
    parser.add_argument("--resume", metavar="RUN_ID", help="Resume a checkpointed run after a timeout or interruption")
    parser.add_argument("--mvp", action="store_true", help="Use the small two-call author/reviewer MVP path")
    args = parser.parse_args()
    settings = Settings.from_root(args.root.resolve())
    if args.check_config:
        print(f"openrouter_api_key={'configured' if settings.api_key_configured else 'missing'}")
        print(f"model={settings.model}")
        print(f"reviewer_model={settings.reviewer_model}")
        print(f"artifacts={settings.artifacts}")
        return 0 if settings.api_key_configured else 3
    if not args.resume and not args.target:
        parser.error("TARGET is required unless --check-config or --resume is used")
    if args.mvp:
        try:
            status, run_id, workspace = run_mvp(settings, args.target, args.kind, args.objective, args.apply)
        except Exception as exc:
            print(f"status=failed error={exc}")
            return 2
        print(f"status={status} run_id={run_id}")
        print(f"workspace={workspace}")
        return 0 if status == "approved" else 2
    graph = build_workflow(settings, apply_changes=args.apply)
    state = initial_state(settings, args.target, args.kind, args.objective)
    try:
        if args.resume:
            state = {"run_id": args.resume}
            resume_config = {"configurable": {"thread_id": args.resume}}
            current = graph.get_state(resume_config)
            if not current.next:
                snapshots = list(graph.get_state_history(resume_config))
                actionable = [snapshot for snapshot in snapshots if snapshot.next and not any(node in ("blocked", "final_checks") for node in snapshot.next)]
                if actionable:
                    resume_config = actionable[0].config
            result = graph.invoke(None, resume_config)
        else:
            result = graph.invoke(state, {"configurable": {"thread_id": state["run_id"]}})
    except Exception as exc:
        settings.artifacts.mkdir(parents=True, exist_ok=True)
        (settings.artifacts / f"{state['run_id']}-failed.json").write_text(json.dumps({"run_id": state["run_id"], "target": args.target, "status": "failed", "error": str(exc)}, indent=2), encoding="utf-8")
        print(f"status=failed run_id={state['run_id']}")
        print(f"error={exc}")
        print(f"artifacts={settings.artifacts}")
        return 2
    print(f"status={result.get('status', 'unknown')} run_id={state['run_id']}")
    print(f"artifacts={settings.artifacts}")
    return 0 if result.get("status") == "approved" else 2


if __name__ == "__main__":
    raise SystemExit(main())
