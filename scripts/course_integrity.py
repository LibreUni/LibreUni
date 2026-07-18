#!/usr/bin/env python3
"""Detect course-content padding and structural quality anomalies.

This is deliberately separate from course_stats.py.  course_stats checks that
content is mechanically valid; this audit looks for suspicious repetition,
placeholder prose, generic diagrams, and uncovered substantive headings.  It
does not assign a pedagogical quality score.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "src" / "content" / "lessons"

HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
ARTIFACT_RE = re.compile(
    r"<(?:PlantUML|PythonDiagram|TikZ|Quiz|CodeRunner|CodeExercise|CaseStudy|MathStatement|MathProof|StructureDiagram|StructureExercise|details)\b|^```|^>\s*\*\*(?:Definition|Lemma|Theorem|Proposition|Example|Warning|Remark|Proof)\.",
    re.MULTILINE,
)
PLANTUML_RE = re.compile(r"<PlantUML\b.*?code=\{`(.*?)`\}\s*/>", re.DOTALL)
FENCE_RE = re.compile(r"^```.*?^```\s*$", re.MULTILINE | re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>|\{[^{}]*\}", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`]*`")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9'-]*")

FILLER_PHRASES = (
    "lorem ipsum",
    "placeholder text",
    "insert text here",
    "todo: write",
    "content goes here",
    "this paragraph explains the concept",
)
GENERIC_DIAGRAM_LABELS = {
    "concept", "mechanism", "observation", "input", "output", "transformation",
    "claim", "evidence", "consequence", "workload", "resource model", "measurement",
    "actor", "state", "event", "outcome", "representation", "operation", "result",
}


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def paragraph_blocks(body: str) -> list[str]:
    """Return prose blocks, excluding code, JSX, headings, and list fragments."""
    body = FENCE_RE.sub("\n", body)
    body = TAG_RE.sub("\n", body)
    blocks = []
    for block in re.split(r"\n\s*\n", body):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines or any(line.startswith(("#", "- ", "* ", ">", "|")) for line in lines):
            continue
        text = " ".join(lines)
        if len(WORD_RE.findall(text)) >= 12:
            blocks.append(text)
    return blocks


def heading_sections(body: str) -> list[tuple[str, str]]:
    matches = list(HEADING_RE.finditer(body))
    sections = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        sections.append((match.group(1), body[match.end():end]))
    return sections


def artifact_in_section(section: str) -> bool:
    return bool(ARTIFACT_RE.search(section))


def plantuml_fingerprint(code: str) -> str:
    """Normalize diagram topology while retaining meaningful edge semantics."""
    code = re.sub(r"!theme\s+\w+", "", code, flags=re.IGNORECASE)
    code = re.sub(r'"[^"]*"', '"<label>"', code)
    code = re.sub(r"\s+", " ", code).strip().lower()
    return hashlib.sha256(code.encode("utf-8")).hexdigest()[:16]


def diagram_labels(code: str) -> set[str]:
    return {normalize_text(label) for label in re.findall(r'"([^"]+)"', code)}


def analyze_lesson(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    body = re.sub(r"^---.*?^---\s*", "", content, flags=re.MULTILINE | re.DOTALL)
    findings = []
    relative = str(path.relative_to(ROOT))

    lowered = normalize_text(body)
    for phrase in FILLER_PHRASES:
        if phrase in lowered:
            findings.append({"kind": "filler-phrase", "severity": "error", "message": f"contains '{phrase}'"})

    paragraphs = paragraph_blocks(body)
    paragraph_hashes = Counter(hashlib.sha256(normalize_text(p).encode()).hexdigest() for p in paragraphs)
    repeated = sum(count - 1 for count in paragraph_hashes.values() if count > 1)
    if repeated:
        findings.append({"kind": "duplicate-prose", "severity": "error", "message": f"{repeated} repeated prose block(s)"})

    ignorable_headings = re.compile(r"^(?:Exercises?|References?(?:\s+&\s+Further Reading)?|Diagnostic solutions?|Solutions?|Answer key|Rubric and self-check)$", re.IGNORECASE)
    uncovered = [
        title for title, section in heading_sections(body)
        if not ignorable_headings.fullmatch(title.strip()) and not artifact_in_section(section)
    ]
    if uncovered:
        findings.append({"kind": "uncovered-heading", "severity": "review", "message": "no adjacent teaching artifact: " + "; ".join(uncovered)})

    diagrams = []
    for match in PLANTUML_RE.finditer(body):
        code = match.group(1)
        generic = sorted(diagram_labels(code) & GENERIC_DIAGRAM_LABELS)
        diagrams.append({"fingerprint": plantuml_fingerprint(code), "genericLabels": generic})
        if len(generic) >= 2:
            findings.append({"kind": "generic-diagram", "severity": "review", "message": f"uses generic labels: {', '.join(generic)}"})

    return {
        "path": relative,
        "courseId": path.parent.name,
        "wordCount": len(WORD_RE.findall(body)),
        "paragraphCount": len(paragraphs),
        "headingCount": len(HEADING_RE.findall(body)),
        "artifactCount": len(ARTIFACT_RE.findall(body)),
        "diagrams": diagrams,
        "findings": findings,
    }


def audit(course_id: str | None = None) -> dict:
    paths = sorted(LESSONS_DIR.glob(f"{course_id}/*.mdx")) if course_id else sorted(LESSONS_DIR.glob("*/*.mdx"))
    lessons = [analyze_lesson(path) for path in paths]
    by_course = defaultdict(list)
    for lesson in lessons:
        by_course[lesson["courseId"]].append(lesson)

    for course, course_lessons in by_course.items():
        fingerprints = Counter(
            diagram["fingerprint"]
            for lesson in course_lessons
            for diagram in lesson["diagrams"]
        )
        for fingerprint, count in fingerprints.items():
            if count >= 3:
                for lesson in course_lessons:
                    if any(d["fingerprint"] == fingerprint for d in lesson["diagrams"]):
                        lesson["findings"].append({
                            "kind": "repeated-diagram-structure",
                            "severity": "error",
                            "message": f"diagram topology repeats {count} times in course '{course}'",
                        })

    return {"courses": dict(sorted(by_course.items()))}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit courses for padding, duplication, generic artifacts, and heading coverage.")
    parser.add_argument("course_id", nargs="?", help="Optional course id")
    parser.add_argument("--json", dest="json_path", type=Path, help="Write the complete audit report to this path")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when findings are present")
    args = parser.parse_args()
    report = audit(args.course_id)
    if args.json_path:
        args.json_path.parent.mkdir(parents=True, exist_ok=True)
        args.json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    finding_count = 0
    blocking_count = 0
    for course, lessons in report["courses"].items():
        findings = [f"{lesson['path']}: {item['severity']}: {item['kind']}: {item['message']}" for lesson in lessons for item in lesson["findings"]]
        finding_count += len(findings)
        blocking_count += sum(1 for lesson in lessons for item in lesson["findings"] if item["severity"] == "error")
        print(f"{course:25} {len(lessons):3} lessons  findings: {len(findings):3}")
        for finding in findings:
            print(f"  - {finding}")
    print(f"\nIntegrity audit found {finding_count} finding(s), including {blocking_count} blocking finding(s).")
    if args.strict and blocking_count:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
