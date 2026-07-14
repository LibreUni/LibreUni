"""Deterministic checks. These are deliberately independent of the language model."""
import re
import subprocess
from pathlib import Path
from typing import Any


BANNED = [
    "welcome", "let's dive in", "in this lesson", "as you have learned before",
    "congratulations on finishing", "you have completed", "next up", "previously",
    "before we move on", "let's explore", "let's take a look",
]
COMPONENTS = {
    "Quiz": {"question", "options", "correctIndex", "explanation", "questions", "title", "client:load"},
    "CodeRunner": {"code", "output", "language", "title", "client:load"},
    "CodeExercise": {"code", "answers", "explanation", "title", "client:load"},
    "CaseStudy": {"scenario", "question", "options", "correctIndex", "explanation", "title", "client:load"},
}


def split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not match:
        return {}, text
    values = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values, text[match.end():]


def audit_text(text: str, label: str = "<draft>") -> dict[str, Any]:
    frontmatter, body = split_frontmatter(text)
    errors: list[str] = []
    warnings: list[str] = []
    for field in ("title", "course"):
        if not frontmatter.get(field):
            errors.append(f"Missing '{field}' in frontmatter")
    for phrase in BANNED:
        if re.search(r"\b" + re.escape(phrase) + r"\b", body, re.IGNORECASE):
            errors.append(f"Contains banned filler phrase: '{phrase}'")
    sections = re.split(r"^##\s+", body, flags=re.MULTILINE)
    if len(sections) == 1:
        warnings.append("No ## subheadings found")
    for section in sections[1:]:
        if not re.search(r"```[\w+-]+|\b(example|case|demonstrat|scenario)\b", section, re.I):
            warnings.append(f"Section '{section.splitlines()[0].strip()}' has no clear example signal")
    for component, allowed in COMPONENTS.items():
        for match in re.finditer(rf"<{component}\b([^>]*)/?>", body, re.DOTALL):
            props = match.group(1)
            if "client:load" not in props:
                errors.append(f"<{component}> is missing client:load")
            for prop in re.findall(r"\b([a-zA-Z][\w:-]*)(?=\s*=)", props):
                if prop not in allowed:
                    errors.append(f"<{component}> uses non-canonical prop '{prop}'")
    has_refs = bool(re.search(r"^##+\s+(references|sources|bibliography|further reading)\b", body, re.I | re.M))
    urls = re.findall(r"https?://[^\s)\]]+", body)
    if not has_refs and not urls:
        errors.append("No visible references section or source URL")
    if re.search(r"\{\/\*.*(?:placeholder|bypass|fake|requires review).*\*\/\}", body, re.I | re.S):
        errors.append("Suspicious or fake source-tracking comment detected")
    return {"path": label, "errors": errors, "warnings": warnings, "passed": not errors}


def audit_lesson(path: Path, check_links: bool = False) -> dict[str, Any]:
    result = audit_text(path.read_text(encoding="utf-8"), str(path))
    if check_links and re.findall(r"https?://[^\s)\]]+", path.read_text(encoding="utf-8")):
        root = next((parent for parent in path.parents if (parent / "scripts" / "verify_lessons.py").exists()), path.parents[0])
        completed = subprocess.run(["python3", "scripts/verify_lessons.py", str(path), "--check-links"], cwd=root, capture_output=True, text=True)
        if completed.returncode:
            result["errors"].append("Reference link check failed; see verifier output")
            result["passed"] = False
    return result


def run_repo_checks(root: Path, target: str, target_kind: str = "course", files: list[str] | None = None) -> dict[str, Any]:
    commands = [["python3", "scripts/course_stats.py", target]]
    if target_kind in ("course", "module") and files:
        commands.extend([["python3", "scripts/verify_lessons.py", str(root / path)] for path in files])
    else:
        commands.append(["python3", "scripts/verify_lessons.py", target])
    results = []
    for command in commands:
        completed = subprocess.run(command, cwd=root, capture_output=True, text=True)
        results.append({"command": " ".join(command), "returncode": completed.returncode, "output": (completed.stdout + completed.stderr)[-8000:]})
    return {"passed": all(item["returncode"] == 0 for item in results), "commands": results}
