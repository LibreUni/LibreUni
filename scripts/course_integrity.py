#!/usr/bin/env python3
"""Detect course-content padding and structural quality anomalies.

This is deliberately separate from course_stats.py.  course_stats checks that
content is mechanically valid; this audit looks for suspicious repetition,
placeholder prose, generic diagrams, and uncovered substantive headings.  It
does not assign a pedagogical quality score.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "src" / "content" / "lessons"
MANIFESTS_DIR = ROOT / "src" / "data" / "course-manifests"

HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
ARTIFACT_RE = re.compile(
    r"<(?:PlantUML|PythonDiagram|TikZ|Quiz|CodeRunner|CodeExercise|FillInExercise|CaseStudy|MathStatement|MathProof|SqlRunner|ExerciseSolution|PracticeGenerator|Figure|[A-Z][A-Za-z0-9]+Playground|details)\b|^```|^\*\*(?:Worked|Example|Counterexample|Definition|Lemma|Theorem|Proposition|Corollary|Invariant|Claim|Remark|Warning|Proof|Trace|Algorithm)\b|^>\s*\*\*(?:Definition|Lemma|Theorem|Proposition|Corollary|Invariant|Claim|Example|Warning|Remark|Proof)\.",
    re.MULTILINE,
)
ACTIVE_COMPONENT_RE = re.compile(
    r"<(?:Quiz|CaseStudy|CodeRunner|CodeExercise|FillInExercise|SqlRunner|PracticeGenerator|[A-Z][A-Za-z0-9]+Playground)\b"
)
PASSIVE_COMPONENT_RE = re.compile(r"<(?:details|ExerciseSolution)\b")
ASSESSMENT_RE = re.compile(r"<(Quiz|CaseStudy)\b(.*?)/>", re.DOTALL)
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
GENERIC_ASSESSMENT_TITLES = {"midpoint application"}


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


def extract_array_prop(block: str, prop: str = "options") -> str | None:
    """Extract a JavaScript array prop while respecting quoted brackets."""
    marker = re.search(rf"\b{re.escape(prop)}\s*=\s*\{{\s*\[", block)
    if not marker:
        return None
    start = block.find("[", marker.start())
    depth = 0
    quote = None
    escaped = False
    for index in range(start, len(block)):
        character = block[index]
        if escaped:
            escaped = False
            continue
        if quote:
            if character == "\\":
                escaped = True
            elif character == quote:
                quote = None
            continue
        if character in {'"', "'", "`"}:
            quote = character
        elif character == "[":
            depth += 1
        elif character == "]":
            depth -= 1
            if depth == 0:
                return block[start:index + 1]
    return None


def is_code_all_comments(code: str) -> bool:
    if not code:
        return True
    lines = [line.strip() for line in code.splitlines() if line.strip()]
    if not lines:
        return True
    in_block = False
    for line in lines:
        if in_block:
            if "*/" in line or "-->" in line:
                in_block = False
            continue
        if line.startswith("/*"):
            if "*/" not in line:
                in_block = True
            continue
        if line.startswith("<!--"):
            if "-->" not in line:
                in_block = True
            continue
        if line.startswith(("#", "//", "--", ";", "%", "*")):
            continue
        return False
    return True


def evaluate_assessments(body: str) -> list[dict]:
    """Extract and analyze options and correct answers for all Quiz and CaseStudy components."""
    assessments = []
    for component in ASSESSMENT_RE.finditer(body):
        kind, block = component.groups()
        options = []

        # 1. Object options: { id: ..., text: ..., isCorrect: ... }
        obj_matches = list(re.finditer(
            r"\{\s*id:\s*['\"][^'\"]+['\"],\s*text:\s*(?:['\"]([^'\"]+)['\"]|`([^`]+)`)[^}]*?isCorrect:\s*(true|false)",
            block,
            re.DOTALL
        ))
        if obj_matches:
            for m in obj_matches:
                text = m.group(1) or m.group(2) or ""
                is_correct = m.group(3) == "true"
                options.append({"text": text, "isCorrect": is_correct})
        else:
            # 2. String array options: options={["...", "..."]} with correctIndex={N}
            source = extract_array_prop(block, "options")
            index_match = re.search(r"\b(?:correctIndex|answer)\s*=\s*\{(\d+)\}", block)
            if source and index_match and "`" not in source:
                try:
                    raw_options = ast.literal_eval(source)
                    if isinstance(raw_options, list) and all(isinstance(opt, str) for opt in raw_options):
                        correct_idx = int(index_match.group(1))
                        options = [
                            {"text": opt, "isCorrect": (i == correct_idx)}
                            for i, opt in enumerate(raw_options)
                        ]
                except (SyntaxError, ValueError):
                    pass

        if len(options) < 2:
            continue

        correct_options = [opt for opt in options if opt["isCorrect"]]
        distractor_options = [opt for opt in options if not opt["isCorrect"]]
        if not correct_options or not distractor_options:
            continue

        correct_lengths = [len(WORD_RE.findall(opt["text"])) for opt in correct_options]
        distractor_lengths = [len(WORD_RE.findall(opt["text"])) for opt in distractor_options]
        max_distractor = max(distractor_lengths)
        max_correct = max(correct_lengths)

        is_length_cue = any(
            c_len >= max_distractor * 1.5 and c_len - max_distractor >= 3
            for c_len in correct_lengths
        )

        assessments.append({
            "component": kind,
            "options": options,
            "correctCount": len(correct_options),
            "isSingleCorrect": len(correct_options) == 1,
            "isLengthCue": is_length_cue,
            "correctWords": max_correct,
            "distractorMaxWords": max_distractor,
        })

    return assessments


def assessment_length_cues(body: str) -> list[dict]:
    """Find assessments whose correct choice is conspicuously longest."""
    return [a for a in evaluate_assessments(body) if a["isLengthCue"]]


def load_course_modules(course_id: str) -> list[dict]:
    manifest_path = MANIFESTS_DIR / f"{course_id}.yml"
    if not manifest_path.exists():
        return []
    try:
        data = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        return data.get("modules", []) or []
    except Exception:
        return []


def strip_frontmatter(content: str) -> str:
    """Remove only leading frontmatter, preserving Markdown horizontal rules."""
    match = re.match(r"\A---[ \t]*\r?\n.*?\r?\n---[ \t]*(?:\r?\n|\Z)", content, re.DOTALL)
    return content[match.end():] if match else content


def analyze_lesson(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    body = strip_frontmatter(content)
    findings = []
    relative = str(path.relative_to(ROOT))

    lowered = normalize_text(body)
    for phrase in FILLER_PHRASES:
        if phrase in lowered:
            findings.append({"kind": "filler-phrase", "severity": "error", "message": f"contains '{phrase}'"})

    code_exercise_re = re.compile(r"<CodeExercise\b(.*?)/>", re.DOTALL)
    for match in code_exercise_re.finditer(body):
        block = match.group(1)
        code_match = re.search(r"\bcode=\{(?:String\.raw)?`([\s\S]*?)`\}|\bcode=\{['\"]([\s\S]*?)['\"]\}", block)
        if code_match:
            raw_code = code_match.group(1) or code_match.group(2) or ""
            if is_code_all_comments(raw_code):
                findings.append({
                    "kind": "code-exercise-all-comments",
                    "severity": "error",
                    "message": "<CodeExercise> code consists entirely of comments; use <FillInExercise> for non-code prompts",
                })

    assessments = evaluate_assessments(body)
    for cue in assessments:
        if cue["isLengthCue"]:
            findings.append({
                "kind": "answer-length-cue",
                "severity": "review",
                "message": f"{cue['component']} correct choice has {cue['correctWords']} words; longest distractor has {cue['distractorMaxWords']}",
            })

    if len(assessments) >= 2:
        cue_count = sum(1 for a in assessments if a["isLengthCue"])
        if cue_count >= 2 and cue_count / len(assessments) >= 0.5:
            findings.append({
                "kind": "excessive-answer-length-cues",
                "severity": "review",
                "message": f"{cue_count}/{len(assessments)} exercises have conspicuously longest correct answers; suggests answer-length cueing or wrong exercise type choice",
            })

    generic_titles = [
        title for title in re.findall(r"\btitle\s*=\s*['\"]([^'\"]+)['\"]", body)
        if normalize_text(title) in GENERIC_ASSESSMENT_TITLES
    ]
    if generic_titles:
        findings.append({
            "kind": "generic-assessment-template",
            "severity": "review",
            "message": f"contains {len(generic_titles)} generic assessment title(s): {', '.join(sorted(set(generic_titles)))}",
        })

    paragraphs = paragraph_blocks(body)
    paragraph_hashes = Counter(hashlib.sha256(normalize_text(p).encode()).hexdigest() for p in paragraphs)
    repeated = sum(count - 1 for count in paragraph_hashes.values() if count > 1)
    if repeated:
        findings.append({"kind": "duplicate-prose", "severity": "error", "message": f"{repeated} repeated prose block(s)"})

    ignorable_headings = re.compile(
        r"^(?:Exercises?|References?(?:\s+&\s+Further Reading)?|Diagnostic solutions?|"
        r"Solutions?|Answer key|Rubric and self-check|"
        r"(?:Deliberate\s+)?Omissions?(?:\s*&.*)?|(?:Course\s+)?Scope Boundaries?(?:\s*&.*)?|"
        r"Deliberate (?:Omissions?\s*&.*|Boundary.*)|Connections and limits|"
        r"Assessment standard|Lab tasks|Proof obligations|"
        r"Definitions and Results|Method Chooser|Hypothesis Checklist|Typical Errors)$",
        re.IGNORECASE,
    )
    uncovered = [
        title for title, section in heading_sections(body)
        if not ignorable_headings.fullmatch(title.strip()) and not artifact_in_section(section)
    ]
    if uncovered:
        findings.append({"kind": "uncovered-heading", "severity": "review", "message": "no adjacent teaching artifact: " + "; ".join(uncovered)})

    # Disclosure-only practice is still passive: the learner can reveal an
    # answer without committing to one. Assessment briefs and capstones are
    # evidence specifications rather than teaching units, so they are exempt.
    is_evidence_brief = bool(re.search(r"(?:^|[-])(?:assessment|capstone|review)$", path.stem))
    if not is_evidence_brief and PASSIVE_COMPONENT_RE.search(body) and not ACTIVE_COMPONENT_RE.search(body):
        findings.append({
            "kind": "passive-only-interaction",
            "severity": "review",
            "message": "practice is disclosure-only; add a committed retrieval or executable check where the outcome warrants it",
        })

    diagrams = []
    for match in PLANTUML_RE.finditer(body):
        code = match.group(1)
        generic = sorted(diagram_labels(code) & GENERIC_DIAGRAM_LABELS)
        diagrams.append({"fingerprint": plantuml_fingerprint(code), "genericLabels": generic})
        if len(generic) >= 2:
            findings.append({"kind": "generic-diagram", "severity": "review", "message": f"uses generic labels: {', '.join(generic)}"})

    return {
        "path": relative,
        "slug": path.stem,
        "courseId": path.parent.name,
        "wordCount": len(WORD_RE.findall(body)),
        "paragraphCount": len(paragraphs),
        "headingCount": len(HEADING_RE.findall(body)),
        "artifactCount": len(ARTIFACT_RE.findall(body)),
        "diagrams": diagrams,
        "assessments": assessments,
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

        modules = load_course_modules(course)
        lesson_by_slug = {lesson["slug"]: lesson for lesson in course_lessons}

        for mod in modules:
            mod_title = mod.get("title", "Untitled Module")
            mod_slugs = mod.get("lessons", [])
            mod_lessons = [lesson_by_slug[s] for s in mod_slugs if s in lesson_by_slug]
            if not mod_lessons:
                continue

            mod_assessments = [a for l in mod_lessons for a in l.get("assessments", [])]
            mod_mc = [a for a in mod_assessments if a["component"] == "Quiz"]
            single_correct_mc = sum(1 for a in mod_mc if a["isSingleCorrect"])
            length_cues = sum(1 for a in mod_assessments if a["isLengthCue"])

            if len(mod_assessments) >= 2 and length_cues >= 2 and (length_cues / len(mod_assessments) >= 0.4 or length_cues >= 3):
                mod_lessons[0]["findings"].append({
                    "kind": "excessive-answer-length-cues",
                    "severity": "review",
                    "message": f"module '{mod_title}' has {length_cues}/{len(mod_assessments)} exercises where the correct answer is conspicuously longest; suggests answer-length cueing or wrong exercise type choice",
                })

            if len(mod_mc) >= 3 and (single_correct_mc / len(mod_mc) >= 0.8):
                mod_lessons[0]["findings"].append({
                    "kind": "uniform-single-correct-choice",
                    "severity": "review",
                    "message": f"module '{mod_title}' has {single_correct_mc}/{len(mod_mc)} multiple-choice exercises with only one correct answer; suggests a wrong exercise type choice (Quiz should evaluate multi-claim classification or consider FillInExercise / derivation)",
                })

        course_assessments = [a for l in course_lessons for a in l.get("assessments", [])]
        course_mc = [a for a in course_assessments if a["component"] == "Quiz"]
        course_single = sum(1 for a in course_mc if a["isSingleCorrect"])
        course_cues = sum(1 for a in course_assessments if a["isLengthCue"])

        if len(course_mc) >= 5 and (course_single / len(course_mc) >= 0.85):
            course_lessons[0]["findings"].append({
                "kind": "uniform-single-correct-choice",
                "severity": "review",
                "message": f"course '{course}' has {course_single}/{len(course_mc)} multiple-choice exercises with only one correct answer; suggests a wrong exercise type choice",
            })
        if len(course_assessments) >= 5 and course_cues >= 3 and (course_cues / len(course_assessments) >= 0.25):
            course_lessons[0]["findings"].append({
                "kind": "excessive-answer-length-cues",
                "severity": "review",
                "message": f"course '{course}' has {course_cues}/{len(course_assessments)} exercises where the correct answer is conspicuously longest; suggests answer-length cueing pattern",
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
