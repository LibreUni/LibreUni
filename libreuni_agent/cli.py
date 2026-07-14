import argparse
from pathlib import Path

from .config import Settings
from .graph import build_workflow, initial_state


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an evidence-driven LibreUni course workflow")
    parser.add_argument("target", nargs="?", help="course slug, manifest slug, or lesson slug/path")
    parser.add_argument("--kind", choices=("course", "module", "lesson"), default="course")
    parser.add_argument("--objective", default="Audit and improve the target while preserving its intent.")
    parser.add_argument("--apply", action="store_true", help="Write approved proposals into the repository")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--check-config", action="store_true", help="Check local configuration without starting a workflow")
    args = parser.parse_args()
    settings = Settings.from_root(args.root.resolve())
    if args.check_config:
        print(f"openrouter_api_key={'configured' if settings.api_key_configured else 'missing'}")
        print(f"model={settings.model}")
        print(f"reviewer_model={settings.reviewer_model}")
        print(f"artifacts={settings.artifacts}")
        return 0 if settings.api_key_configured else 3
    if not args.target:
        parser.error("TARGET is required unless --check-config is used")
    graph = build_workflow(settings, apply_changes=args.apply)
    state = initial_state(settings, args.target, args.kind, args.objective)
    result = graph.invoke(state, {"configurable": {"thread_id": state["run_id"]}})
    print(f"status={result.get('status', 'unknown')} run_id={state['run_id']}")
    print(f"artifacts={settings.artifacts}")
    return 0 if result.get("status") == "approved" else 2


if __name__ == "__main__":
    raise SystemExit(main())
