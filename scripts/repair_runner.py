#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "apps" / "main" / "src" / "content" / "lessons"
TEMP_DIR = ROOT / ".temp"
STATE_FILE = TEMP_DIR / "repair_state.json"

def run_command(cmd, args=[]):
    result = subprocess.run([cmd] + args, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def get_broken_files(course):
    print("Scanning for files with errors or warnings...")
    verify_script = str(ROOT / "scripts" / "verify_lessons.py")
    ret, out, err = run_command(sys.executable, [verify_script, course])
    
    # Parse the audit output to find files with problems
    # Format: [AUDIT] path/to/file.mdx followed by - ERROR: or - WARNING:
    lines = out.splitlines()
    files_with_issues = []
    current_file = None
    current_issues = []
    
    for line in lines:
        if line.startswith("[AUDIT]"):
            if current_file:
                files_with_issues.append({"path": current_file, "issues": current_issues})
            current_file = line.replace("[AUDIT]", "").strip()
            current_issues = []
        elif line.strip().startswith("- ERROR:") or line.strip().startswith("- WARNING:"):
            current_issues.append(line.strip())
            
    if current_file:
        files_with_issues.append({"path": current_file, "issues": current_issues})
        
    return files_with_issues

def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"course": None, "current_index": 0, "files": []}

def save_state(state):
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(description="Step-by-step Lesson Repair Orchestrator")
    parser.add_argument("course", nargs="?", help="Course name to repair")
    parser.add_argument("--status", action="store_true", help="Show current repair progress")
    parser.add_argument("--reset", action="store_true", help="Reset repair state")
    parser.add_argument("--validate", action="store_true", help="Validate current file and advance if clean")
    args = parser.parse_args()

    state = load_state()

    if args.reset:
        if STATE_FILE.exists():
            STATE_FILE.unlink()
        print("Repair state reset.")
        sys.exit(0)

    if args.status:
        if not state.get("course"):
            print("No active repair session.")
        else:
            print(f"Active session: {state['course']}")
            print(f"Progress: {state['current_index']}/{len(state['files'])} files.")
            if state['current_index'] < len(state['files']):
                current = state['files'][state['current_index']]
                print(f"Current target file: {current['path']}")
                print("Issues to resolve:")
                for iss in current['issues']:
                    print(f"  {iss}")
        sys.exit(0)

    if args.validate:
        if not state.get("course") or state['current_index'] >= len(state['files']):
            print("No active file to validate.")
            sys.exit(1)
            
        current = state['files'][state['current_index']]
        file_rel_path = current['path'] # e.g. apps/main/src/content/lessons/operating-systems/intro-to-os.mdx
        file_abs_path = ROOT / file_rel_path
        
        # Run verify_lessons on this specific file
        print(f"Validating {file_rel_path}...")
        verify_script = str(ROOT / "scripts" / "verify_lessons.py")
        # Extract course-relative path, e.g. operating-systems/intro-to-os.mdx
        course_rel_path = str(file_abs_path.relative_to(LESSONS_DIR))
        
        ret, out, err = run_command(sys.executable, [verify_script, course_rel_path])
        if ret != 0:
            print("\n❌ Validation Failed! Remaining errors/warnings:")
            print(out)
            sys.exit(1)
            
        # Also run astro build to catch compile issues
        print("Running build verification (npm run build)...")
        build_ret, build_out, build_err = run_command("npm", ["run", "build"])
        if build_ret != 0:
            print("\n❌ Build Verification Failed!")
            print(build_err or build_out)
            sys.exit(1)
            
        # Also run python3 scripts/course_stats.py for the active course
        print(f"Running course stats verification for {state['course']}...")
        stats_ret, stats_out, stats_err = run_command(sys.executable, [str(ROOT / "scripts" / "course_stats.py"), state['course']])
        if stats_ret != 0:
            output_to_check = stats_out + stats_err
            # Normalize path slashes for comparison
            normalized_file_path = file_rel_path.replace("\\", "/")
            if normalized_file_path in output_to_check.replace("\\", "/"):
                print("\n❌ Course Stats Verification Failed: Current file is still reported as missing sources!")
                print(output_to_check)
                sys.exit(1)
            elif "FATAL ERROR: 100% SOURCE COVERAGE REQUIRED" not in output_to_check:
                print("\n❌ Course Stats Verification Failed with a different error:")
                print(output_to_check)
                sys.exit(1)
            else:
                print("Course stats checked. (Note: other files in the course are still missing sources, which is expected during file-by-file migration.)")

        print("\n✅ Verification Successful! File is clean and passes all builds.")
        state['current_index'] += 1
        save_state(state)
        
        if state['current_index'] < len(state['files']):
            next_file = state['files'][state['current_index']]
            print(f"\nNext target file loaded: {next_file['path']}")
            # Query sources for it
            auto_source_script = str(ROOT / "scripts" / "auto_source.py")
            next_course_rel = str((ROOT / next_file['path']).relative_to(LESSONS_DIR))
            _, s_out, _ = run_command(sys.executable, [auto_source_script, next_course_rel])
            print("\nSuggested Sources:")
            print(s_out)
        else:
            print("\n🎉 All files repaired in this course session!")
        sys.exit(0)

    # Initialize a new session
    if not args.course:
        print("Error: Please specify a course name to start repair (e.g. operating-systems)")
        sys.exit(1)

    files_with_issues = get_broken_files(args.course)
    if not files_with_issues:
        print(f"No issues found in course '{args.course}'! Everything is clean.")
        sys.exit(0)

    state = {
        "course": args.course,
        "current_index": 0,
        "files": files_with_issues
    }
    save_state(state)
    
    current = files_with_issues[0]
    print(f"\nSession initialized for '{args.course}'. Found {len(files_with_issues)} files needing repair.")
    print(f"\n[TARGET 1/{len(files_with_issues)}] {current['path']}")
    print("Issues to resolve:")
    for iss in current['issues']:
        print(f"  {iss}")
        
    # Run auto_source for it
    auto_source_script = str(ROOT / "scripts" / "auto_source.py")
    course_rel_path = str((ROOT / current['path']).relative_to(LESSONS_DIR))
    _, s_out, _ = run_command(sys.executable, [auto_source_script, course_rel_path])
    print("\nSuggested Sources:")
    print(s_out)
    
    print("\n👉 Actions for Agent:")
    print("1. Review and edit the lesson file to resolve issues.")
    print(f"2. Run: python3 scripts/repair_runner.py --validate")

if __name__ == "__main__":
    main()
