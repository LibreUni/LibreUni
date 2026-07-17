#!/usr/bin/env python3
"""Course inventory and smoke tests.

This command deliberately does not rate pedagogy. Counts are diagnostics, not
quality scores. A passing result means that the checks below did not find a
broken course; it does not mean that the teaching is good.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "src" / "content" / "lessons"
QUALITY_OUTPUT_PATH = ROOT / "src" / "data" / "course-quality.json"
RENDER_ERROR_LOGS = [
    ROOT / "puml-errors.log",
    ROOT / "python-diagram-errors.log",
    ROOT / "tikz-errors.log",
]

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
FENCE_RE = re.compile(r"^```([\w+#.-]*)\s*\n(.*?)^```\s*$", re.MULTILINE | re.DOTALL)
COMPONENT_RE = re.compile(r"<(Quiz|CodeRunner|CodeExercise|CaseStudy)\b(.*?)/>", re.DOTALL)
ALLOWED_PROPS = {
    "Quiz": {"question", "options", "correctIndex", "explanation", "questions", "title", "client:load"},
    "CodeRunner": {"code", "output", "language", "title", "client:load"},
    "CodeExercise": {"code", "answers", "explanation", "title", "client:load"},
    "CaseStudy": {"scenario", "question", "options", "correctIndex", "explanation", "title", "client:load"},
}


def split_frontmatter(content):
    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}, content
    data = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip('"').strip("'")
    return data, content[match.end():]


def analyze_lesson(path):
    content = path.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(content)
    components = {name: len(re.findall(rf"<{name}\b", body)) for name in ALLOWED_PROPS}
    return {
        "name": path.name,
        "path": str(path.relative_to(ROOT)),
        "courseId": frontmatter.get("course", "").strip() or path.parent.name,
        "words": len(re.findall(r"\w+", body)),
        "characters": len(body),
        "headings": len(re.findall(r"^#{1,3}\s+", body, re.MULTILINE)),
        "codeBlocks": len(FENCE_RE.findall(body)),
        "components": components,
        "interactiveCount": sum(components.values()),
    }


def lessons_by_course():
    grouped = {}
    for path in sorted(LESSONS_DIR.glob("*/*.mdx")):
        lesson = analyze_lesson(path)
        grouped.setdefault(lesson["courseId"], []).append(lesson)
    return grouped


def extract_code(text):
    """Extract the simple string form used by CodeRunner's MDX props."""
    match = re.search(r"\bcode\s*=\s*\{?([`\"'])(.*?)\1", text, re.DOTALL)
    return match.group(2) if match else None


def run_source(source, language, path, line):
    """Check a runnable block using the toolchain named by its language."""
    aliases = {"py": "python", "js": "javascript", "ts": "typescript", "c++": "cpp"}
    language = aliases.get(language.lower(), language.lower())
    commands = {
        "python": ("python3", ".py", ["python3", "-m", "py_compile"]),
        "javascript": ("node", ".mjs", ["node", "--check"]),
        "typescript": ("tsc", ".ts", ["tsc", "--noEmit", "--skipLibCheck"]),
        "rust": ("rustc", ".rs", ["rustc"]),
        "c": ("gcc", ".c", ["gcc", "-std=c11", "-Wall", "-Wextra"]),
        "cpp": ("g++", ".cpp", ["g++", "-std=c++17", "-Wall", "-Wextra"]),
        "java": ("javac", ".java", ["javac"]),
        "go": ("go", ".go", ["go", "tool", "compile"]),
        "bash": ("bash", ".sh", ["bash", "-n"]),
    }
    if language not in commands:
        return f"{path}:{line}: CodeRunner declares unsupported language '{language}'"
    executable, suffix, command = commands[language]
    if shutil.which(executable) is None:
        return f"{path}:{line}: CodeRunner language '{language}' requires missing tool '{executable}'"
    # MDX CodeRunner strings commonly encode newlines as ``\\n``.
    source = source.replace("\\n", "\n").replace("\\t", "\t").replace("\\r", "\r")
    if language == "javascript":
        suffix = ".mjs"
    output_path = None
    with tempfile.NamedTemporaryFile("w", suffix=suffix, encoding="utf-8", delete=False) as handle:
        handle.write(source)
        temp_path = handle.name
    try:
        if language in {"rust", "c", "cpp"}:
            output_path = temp_path + ".bin"
            command += [temp_path, "-o", output_path]
        elif language == "java":
            temp_dir = str(Path(temp_path).parent)
            source_path = Path(temp_path).with_name("Main.java")
            source_path.write_text(source, encoding="utf-8")
            Path(temp_path).unlink(missing_ok=True)
            temp_path = str(source_path)
            command += [temp_path]
        else:
            command += [temp_path]
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=15)
        if result.returncode:
            output = (result.stderr or result.stdout).strip()
            lines = output.splitlines()
            detail = next((line.strip() for line in lines if re.search(r"(?:syntaxerror|error:|fatal error)", line, re.IGNORECASE)), lines[-1] if lines else "non-zero exit")
            return f"{path}:{line}: {language} block failed: {detail}"
        if output_path:
            result = subprocess.run([output_path], cwd=ROOT, capture_output=True, text=True, timeout=15)
            if result.returncode:
                detail = (result.stderr or result.stdout).strip().splitlines()[-1] if (result.stderr or result.stdout).strip() else "non-zero exit"
                return f"{path}:{line}: {language} block failed at runtime: {detail}"
        return None
    except subprocess.TimeoutExpired:
        return f"{path}:{line}: {language} block timed out after 15 seconds"
    finally:
        Path(temp_path).unlink(missing_ok=True)
        if output_path:
            Path(output_path).unlink(missing_ok=True)


def component_props(component, props):
    """Read only attribute-looking lines; do not treat code contents as props."""
    names = []
    allowed = ALLOWED_PROPS[component]
    for line in props.splitlines():
        match = re.match(r"\s*([A-Za-z][\w:-]*)(?=\s*(?:=|$))", line)
        if match and match.group(1) in allowed:
            names.append(match.group(1))
    return names


def language_mismatch(source, declared):
    """Catch the common mistake where a runner silently defaults to Python."""
    declared = declared.lower()
    signatures = {
        "rust": [r"\bfn\s+main\s*\(", r"\blet\s+mut\b", r"String::from"],
        "c": [r"#include\s*<", r"\bprintf\s*\("],
        "cpp": [r"#include\s*<iostream>", r"\bcout\s*<<"],
        "javascript": [r"\b(const|let|var)\s+\w+\s*=", r"console\.log\s*\("],
        "java": [r"public\s+static\s+void\s+main", r"System\.out\.println"],
        "go": [r"package\s+main", r"fmt\.Print"],
    }
    # C and C++ deliberately overlap; do not report a false mismatch between
    # those two languages. The important failure is a runner silently using
    # Python (the component's default) for another language.
    if declared in {"python", "py"}:
        for language, patterns in signatures.items():
            if language != "javascript" and any(re.search(pattern, source) for pattern in patterns):
                return language
    elif any(re.search(pattern, source) for pattern in [r"^\s*def\s+\w+\s*\(", r"^\s*from\s+\w+\s+import\s+", r"^\s*import\s+\w+"]):
        return "python"
    return None


def render_errors_by_course():
    """Read renderer failures emitted during the build and attach them to courses."""
    failures = {}
    seen = set()
    for log_path in RENDER_ERROR_LOGS:
        if not log_path.exists():
            continue
        text = log_path.read_text(encoding="utf-8", errors="replace")
        for block in re.split(r"\n(?=\[\d{4}-\d{2}-\d{2}T)", text):
            page = re.search(r"PAGE:\s*(/(?:lessons|courses)/([^/]+)(?:/|\.html))", block)
            if not page:
                continue
            error = re.search(r"ERROR:\s*(.+)", block)
            detail = error.group(1).strip() if error else f"renderer failure in {log_path.name}"
            page_path = page.group(1)
            message = f"{page_path}: {log_path.name}: {detail}"
            if message not in seen:
                failures.setdefault(page.group(2), []).append(message)
                seen.add(message)
    return failures


def smoke_lesson(path):
    content = path.read_text(encoding="utf-8")
    _, body = split_frontmatter(content)
    errors = []
    if not split_frontmatter(content)[0].get("title"):
        errors.append(f"{path.relative_to(ROOT)}: missing frontmatter title")
    for component, props in COMPONENT_RE.findall(body):
        if "client:load" not in props:
            errors.append(f"{path.relative_to(ROOT)}: <{component}> is missing client:load")
        for prop in component_props(component, props):
            if prop not in ALLOWED_PROPS[component]:
                errors.append(f"{path.relative_to(ROOT)}: <{component}> uses non-canonical prop {prop}")

    for match in FENCE_RE.finditer(body):
        language, source = match.group(1).lower(), match.group(2)
        # Fenced blocks are often fragments. Validate the languages with a
        # reliable syntax checker here; CodeRunner blocks below are stricter.
        if language not in {"python", "py", "javascript", "js", "typescript", "ts"}:
            continue
        error = run_source(source, language, path.relative_to(ROOT), body[:match.start()].count("\n") + 1)
        if error:
            errors.append(error)

    # CodeRunner is the explicitly executable course component. Its supported
    # local languages are smoke-tested; C/C++/shell runners remain build/UI
    # checks because the browser component currently displays their declared output.
    for match in COMPONENT_RE.finditer(body):
        if match.group(1) != "CodeRunner":
            continue
        code = extract_code(match.group(2))
        language_match = re.search(r"\blanguage\s*=\s*[\{\"']?([\w+-]+)", match.group(2))
        if not code:
            errors.append(f"{path.relative_to(ROOT)}: CodeRunner must declare code")
            continue
        language = language_match.group(1).lower() if language_match else "python"
        mismatch = language_mismatch(code, language)
        if mismatch:
            errors.append(f"{path.relative_to(ROOT)}: CodeRunner declares '{language}' but its code looks like {mismatch}")
        error = run_source(code, language, path.relative_to(ROOT), body[:match.start()].count("\n") + 1)
        if error and error not in errors:
            errors.append(error)

    # Visible Technical Comments Check
    # Strip code blocks, inline code, and JSX to avoid false positives
    clean_body = re.sub(r"^```[^\n]*\n.*?^```\s*$", " ", body, flags=re.MULTILINE | re.DOTALL)
    clean_body = re.sub(r"`[^`]*`", " ", clean_body)
    
    # Strip JSX braces recursively
    prev_len = -1
    while len(clean_body) != prev_len:
        prev_len = len(clean_body)
        clean_body = re.sub(r"\{[^{}]*\}", " ", clean_body)
        
    # Strip HTML-like JSX tags
    clean_body = re.sub(r"<[^>]+>", " ", clean_body)
    
    # Check for visible block comments /* and */
    if "/*" in clean_body:
        errors.append(f"{path.relative_to(ROOT)}: Contains visible block comment start '/*' (must be wrapped in curly braces: '{{/* comment */}}')")
    if "*/" in clean_body:
        errors.append(f"{path.relative_to(ROOT)}: Contains visible block comment end '*/' (must be wrapped in curly braces: '{{/* comment */}}')")
        
    # Check for visible single-line comments //
    for line_idx, line in enumerate(clean_body.splitlines(), start=1):
        stripped_line = line.strip()
        if stripped_line.startswith("//"):
            if not re.match(r"^//\S+\.\S+", stripped_line):
                errors.append(f"{path.relative_to(ROOT)}: Contains visible single-line comment '//' (line {line_idx}: '{stripped_line}')")

    # Diagnostic solutions are ordinary Markdown. Literal quote wrappers and
    # quote-only separator lines render as visible artifacts instead of
    # paragraphs, so reject them in the solution section.
    diagnostic = re.search(
        r"^#{2,3}\s+Diagnostic solutions\s*$\n(.*?)(?=^#{1,3}\s|\Z)",
        body,
        flags=re.IGNORECASE | re.MULTILINE | re.DOTALL,
    )
    if diagnostic:
        for line_idx, line in enumerate(diagnostic.group(1).splitlines(), start=1):
            stripped_line = line.strip()
            if stripped_line == "''" or re.fullmatch(r"'\d+\..*'", stripped_line):
                errors.append(
                    f"{path.relative_to(ROOT)}: Diagnostic solutions contain literal quote wrapper (line {line_idx})"
                )

    return errors


def course_record(course_id, lessons, errors):
    counts = {name: sum(l["components"][name] for l in lessons) for name in ALLOWED_PROPS}
    return {
        "courseId": course_id,
        "lessonCount": len(lessons),
        "codeBlockCount": sum(l["codeBlocks"] for l in lessons),
        "componentCounts": counts,
        "smokeTest": {
            "status": "passed" if not errors else "failed",
            "meaning": "No detected broken course structure or supported code syntax." if not errors else "At least one smoke test failed; this says nothing about pedagogical quality.",
            "errors": errors,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Inventory courses and run non-pedagogical course smoke tests.")
    parser.add_argument("course_id", nargs="?", help="Optional course id to check")
    parser.add_argument("--write-quality", action="store_true", help="Write smoke-test records to src/data/course-quality.json")
    parser.add_argument("--quality-output", type=Path, default=QUALITY_OUTPUT_PATH)
    args = parser.parse_args()
    grouped = lessons_by_course()
    if args.course_id and args.course_id not in grouped:
        raise SystemExit(f"Course not found: {args.course_id}")
    selected = {args.course_id: grouped[args.course_id]} if args.course_id else grouped
    records = {}
    all_errors = []
    render_failures = render_errors_by_course()
    for course_id, lessons in sorted(selected.items()):
        errors = [error for lesson in lessons for error in smoke_lesson(ROOT / lesson["path"])]
        errors.extend(render_failures.get(course_id, []))
        records[course_id] = course_record(course_id, lessons, errors)
        print(f"{course_id:25} {len(lessons):3} lessons  {records[course_id]['codeBlockCount']:3} code blocks  smoke: {records[course_id]['smokeTest']['status']}")
        all_errors.extend(errors)
    if args.write_quality:
        args.quality_output.parent.mkdir(parents=True, exist_ok=True)
        output_records = records
        if args.course_id and args.quality_output.exists():
            try:
                output_records = json.loads(args.quality_output.read_text(encoding="utf-8"))
                output_records.update(records)
            except json.JSONDecodeError:
                output_records = records
        args.quality_output.write_text(json.dumps(output_records, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"Wrote {len(output_records)} smoke-test records to {args.quality_output.relative_to(ROOT)}")
    if all_errors:
        print("\nSmoke-test failures:", file=sys.stderr)
        print("\n".join(f"- {error}" for error in all_errors), file=sys.stderr)
        return 1
    print("\nSmoke tests passed. This is a brokenness check, not a course-quality rating.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
