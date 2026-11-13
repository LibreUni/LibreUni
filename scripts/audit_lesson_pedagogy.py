#!/usr/bin/env python3
"""
Heuristic lesson inventory for manual pedagogical review.

Signals are keyword and source-pattern matches, not evidence that an example,
assessment, or omission is educationally adequate. Disclosures and diagrams
are counted as representations, not necessarily interactive retrieval.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "src" / "content" / "lessons"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
HEADING_RE = re.compile(r"^(#{2,3})\s+(.+?)\s*$", re.MULTILINE)
LESSON_INTERACTION_RE = re.compile(
    r"<(?:Quiz|CaseStudy|CodeExercise|CodeRunner|InterleavingPlayground|PageTablePlayground|EpsilonDeltaPlayground|TangentPlayground|RiemannPlayground|details|[A-Z][A-Za-z0-9]+Playground)\b|<PlantUML\b|<MathProof\b",
    re.MULTILINE,
)
PROBLEMS_INTERACTION_RE = re.compile(
    r"<(?:Problem|ExerciseSolution|Quiz|CaseStudy|CodeExercise|FillInExercise|CodeRunner|SqlRunner|Figure|[A-Z][A-Za-z0-9]+Playground)\b|<PlantUML\b",
    re.MULTILINE,
)
RECAP_ARTIFACT_RE = re.compile(
    r"<(?:Ref|Figure|PlantUML|TikZ|PythonDiagram)\b",
    re.MULTILINE,
)
PRACTICE_INTERACTION_RE = re.compile(
    r"<(?:PracticeGenerator|Quiz|CaseStudy|CodeExercise|FillInExercise|CodeRunner|SqlRunner|Figure|[A-Z][A-Za-z0-9]+Playground)\b",
    re.MULTILINE,
)


def split_frontmatter(content: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(content)
    if not m:
        return {}, content
    raw_yaml = m.group(1)
    try:
        parsed = yaml.safe_load(raw_yaml)
        fm = parsed if isinstance(parsed, dict) else {}
    except yaml.YAMLError:
        fm = {}
        for line in raw_yaml.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm, content[m.end():]


def has_nonempty_frontmatter_list(fm: dict, key: str) -> bool:
    val = fm.get(key)
    return isinstance(val, list) and len(val) > 0


def find_dense_prose_paragraphs(body: str, max_words: int = 150) -> list[str]:
    """Identify genuinely dense prose paragraphs on specialized D-0014 pages.

    Excludes fenced code blocks, display math blocks, headings, JSX tags, and
    Markdown tables, and evaluates list items individually so concise bullet
    lists or multi-equation derivations are not falsely summed as one paragraph.
    """
    cleaned = re.sub(r"^```[^\n]*\n.*?^```\s*$", "\n\n", body, flags=re.MULTILINE | re.DOTALL)
    cleaned = re.sub(r"\$\$.*?\$\$", "\n\n", cleaned, flags=re.DOTALL)

    dense: list[str] = []
    for block in re.split(r"\n\s*\n", cleaned):
        stripped = block.strip()
        if not stripped or stripped.startswith(("<", "#", "|")):
            continue

        lines = [line.strip() for line in stripped.splitlines() if line.strip()]
        if not lines or all(line.startswith("|") for line in lines):
            continue

        # Split bullet or numbered list items so each item is evaluated individually.
        chunks: list[list[str]] = []
        current: list[str] = []
        for line in lines:
            if line.startswith(("<", "#")):
                continue
            is_list_start = bool(re.match(r"^(?:[*+-]|\d+\.)\s+", line))
            if is_list_start and current:
                chunks.append(current)
                current = [line]
            else:
                current.append(line)
        if current:
            chunks.append(current)

        for chunk in chunks:
            text = " ".join(chunk)
            if len(text.split()) > max_words:
                dense.append(text)
    return dense


def audit_standard_lesson(fm: dict, body: str) -> tuple[int, int, bool, dict[str, bool], list[str]]:
    """Audit kind 'lesson' and 'lab' with the strict baseline heuristic rules."""
    paragraphs = [
        p.strip()
        for p in body.split("\n\n")
        if p.strip()
        and not p.strip().startswith("<")
        and not p.strip().startswith("```")
        and not p.strip().startswith("#")
    ]
    long_paragraphs = [p for p in paragraphs if len(p.split()) > 150]

    interaction_matches = list(LESSON_INTERACTION_RE.finditer(body))
    num_interactions = len(interaction_matches)

    body_len = len(body)
    interaction_positions = [m.start() / body_len for m in interaction_matches] if body_len else []

    blob_at_end = False
    if interaction_positions:
        first_interaction = min(interaction_positions)
        if first_interaction > 0.60:
            blob_at_end = True
    else:
        first_interaction = None

    has_counterexample = bool(
        re.search(r"\b(?:counterexample|failure mode|pathological|starve|stale|hazard)\b", body, re.IGNORECASE)
    )
    has_worked_example = bool(
        re.search(r"\b(?:worked trace|worked example|worked stride|derivation)\b", body, re.IGNORECASE)
    )
    has_predict_before_reveal = bool(
        re.search(r"\b(?:predict|answer before|reveal|prediction)\b", body, re.IGNORECASE)
    )
    has_omissions = bool(fm.get("omissions")) or bool(
        re.search(r"##\s+(?:Deliberate\s+Boundary|Deliberate\s+Omissions|Connections\s+and\s+Limits)", body, re.IGNORECASE)
    )

    score = 100
    findings: list[str] = []

    if num_interactions == 0:
        score -= 40
        findings.append("CRITICAL: Zero interactive elements or predict-then-reveal checkpoints found.")
    elif blob_at_end:
        score -= 25
        findings.append(
            f"WARNING: Interactivity is clustered at the end (first interaction at {first_interaction * 100:.0f}% of document). Weave retrieval practice throughout."
        )

    if long_paragraphs:
        score -= 10
        findings.append(
            f"ADVICE: {len(long_paragraphs)} paragraph(s) exceed 150 words. Break up dense prose with diagrams or checkpoints."
        )

    if not has_counterexample:
        score -= 15
        findings.append("DEFECT: Missing concrete counterexample, failure mode, or boundary breakdown.")

    if not has_worked_example:
        score -= 15
        findings.append("DEFECT: Missing step-by-step worked trace or numerical example.")

    if not has_predict_before_reveal:
        score -= 10
        findings.append("ADVICE: Add predict-then-reveal checkpoints (force commit before revealing solution).")

    if not has_omissions:
        score -= 10
        findings.append("DEFECT: Missing explicit deliberate omission / scope boundary statement.")

    flags = {
        "has_counterexample": has_counterexample,
        "has_worked_example": has_worked_example,
        "has_predict_before_reveal": has_predict_before_reveal,
    }
    return score, num_interactions, blob_at_end, flags, findings


def audit_problems_page(fm: dict, body: str) -> tuple[int, int, bool, dict[str, bool], list[str]]:
    """Audit D-0014 kind 'problems' (chapter problem sets)."""
    long_paragraphs = find_dense_prose_paragraphs(body)

    interaction_matches = list(PROBLEMS_INTERACTION_RE.finditer(body))
    num_interactions = len(interaction_matches)
    body_len = len(body)
    interaction_positions = [m.start() / body_len for m in interaction_matches] if body_len else []

    blob_at_end = False
    first_interaction = min(interaction_positions) if interaction_positions else None
    if first_interaction is not None and first_interaction > 0.60:
        blob_at_end = True

    problem_count = len(re.findall(r"<Problem\b", body))
    solution_count = len(re.findall(r"<ExerciseSolution\b", body))
    hint_count = len(re.findall(r'(?:slot=["\']hint["\']|\bhint\s*=)', body))
    transfer_synthesis_count = len(re.findall(r'\blevel=["\'](?:transfer|synthesis)["\']', body))
    challenge_count = len(re.findall(r'\bchallenge=\{true\}', body))
    has_problem_set = bool(re.search(r"<ProblemSet\b", body))
    has_math_stmt = bool(re.search(r"<MathStatement\b", body))

    has_counterexample = bool(
        re.search(
            r'\btype=["\'](?:example-or-impossible|negate)["\']'
            r"|\b(?:counterexamples?|failure(?:\s+modes?)?|flaw|pathological|non-integrable|not\s+(?:riemann\s+)?integrable|discontinu(?:ous|ity)|circular|contradict|fails?\b|violat|starve|stale|hazard)\b",
            body,
            re.IGNORECASE,
        )
    )
    has_worked_example = solution_count > 0 and solution_count >= problem_count
    has_predict_before_reveal = solution_count > 0 and hint_count > 0

    score = 100
    findings: list[str] = []

    if not has_nonempty_frontmatter_list(fm, "covers"):
        score -= 10
        findings.append("DEFECT: Problem set frontmatter must declare non-empty 'covers' list.")
    if not has_nonempty_frontmatter_list(fm, "outcomes"):
        score -= 10
        findings.append("DEFECT: Problem set frontmatter must declare non-empty 'outcomes' list.")
    if has_math_stmt:
        score -= 20
        findings.append("DEFECT: <MathStatement> is forbidden on 'problems' pages (D-0014); use <Ref> instead.")

    if num_interactions == 0 or not has_problem_set or problem_count == 0:
        score -= 40
        findings.append("CRITICAL: Missing <ProblemSet> or <Problem> checkpoints.")
    else:
        if blob_at_end:
            score -= 25
            findings.append(
                f"WARNING: Interactivity is clustered at the end (first interaction at {first_interaction * 100:.0f}% of document)."
            )
        if problem_count < 10:
            score -= 15
            findings.append(
                f"DEFECT: Problem set contains {problem_count} <Problem> item(s); D-0014 specifies 10-20 problems."
            )

    if long_paragraphs:
        score -= 10
        findings.append(
            f"ADVICE: {len(long_paragraphs)} prose paragraph(s) exceed 150 words. Break up dense prose with equations or steps."
        )

    if not has_worked_example:
        score -= 15
        findings.append(
            f"DEFECT: Only {solution_count}/{problem_count} <Problem> items pair with a worked <ExerciseSolution>."
        )

    if not has_predict_before_reveal:
        score -= 10
        findings.append("ADVICE: Add progressive hints (hint= or slot='hint') to <ExerciseSolution> disclosures.")

    if transfer_synthesis_count < 3:
        score -= 10
        findings.append(
            f"DEFECT: Found {transfer_synthesis_count} transfer/synthesis problem(s); COURSE_STRUCTURE §7 requires at least 3."
        )

    if challenge_count == 0:
        score -= 5
        findings.append("ADVICE: Include at least one challenge (★) problem with challenge={true}.")

    if not has_counterexample:
        score -= 15
        findings.append("DEFECT: Missing concrete counterexample, failure mode, or boundary breakdown.")

    flags = {
        "has_counterexample": has_counterexample,
        "has_worked_example": has_worked_example,
        "has_predict_before_reveal": has_predict_before_reveal,
    }
    return score, num_interactions, blob_at_end, flags, findings


def audit_recap_page(fm: dict, body: str) -> tuple[int, int, bool, dict[str, bool], list[str]]:
    """Audit D-0014 kind 'recap' (condensed chapter reference sheets)."""
    long_paragraphs = find_dense_prose_paragraphs(body)

    artifact_matches = list(RECAP_ARTIFACT_RE.finditer(body))
    num_artifacts = len(artifact_matches)
    ref_count = len(re.findall(r"<Ref\b", body))
    fig_count = len(re.findall(r"<Figure\b", body))

    has_math_stmt = bool(re.search(r"<MathStatement\b", body))
    has_exercises = bool(re.search(r"<(?:Quiz|Exercise|ExerciseSet|Problem|ProblemSet)\b", body))

    has_defs = bool(re.search(r"^##\s+Definitions\s+and\s+Results\b", body, re.MULTILINE | re.IGNORECASE))
    has_chooser = bool(re.search(r"^##\s+Method\s+Chooser\b", body, re.MULTILINE | re.IGNORECASE))
    has_checklist = bool(re.search(r"^##\s+Hypothesis\s+Checklist\b", body, re.MULTILINE | re.IGNORECASE))
    has_errors = bool(re.search(r"^##\s+Typical\s+Errors\b", body, re.MULTILINE | re.IGNORECASE))

    has_counterexample = bool(
        re.search(
            r"\b(?:counterexamples?|failure(?:\s+modes?)?|fails?\b|diverges?|unbounded|discontinu(?:ous|ity)|pathological|not\s+(?:riemann\s+)?integrable|non-differentiable|missing\s+continuity|missing\s+bounded|missing\s+closed)\b",
            body,
            re.IGNORECASE,
        )
    )

    score = 100
    findings: list[str] = []

    if not has_nonempty_frontmatter_list(fm, "covers"):
        score -= 15
        findings.append("DEFECT: Recap frontmatter must declare non-empty 'covers' list.")
    if has_math_stmt or has_exercises:
        score -= 20
        findings.append("DEFECT: Recap pages must not declare <MathStatement> or exercises (D-0014); use <Ref> instead.")

    if ref_count == 0 and fig_count == 0:
        score -= 30
        findings.append("CRITICAL: Zero <Ref> cross-references or <Figure> thumbnails found on recap sheet.")
    elif ref_count == 0:
        score -= 15
        findings.append("DEFECT: Recap sheet lacks <Ref id='...' /> links to covered statements.")

    missing_sections = [
        name
        for name, present in (
            ("Definitions and Results", has_defs),
            ("Method Chooser", has_chooser),
            ("Hypothesis Checklist", has_checklist),
            ("Typical Errors", has_errors),
        )
        if not present
    ]
    if missing_sections:
        score -= 15 * len(missing_sections)
        findings.append(f"DEFECT: Missing required D-0014 recap section(s): {', '.join(missing_sections)}.")

    if fig_count == 0:
        score -= 5
        findings.append("ADVICE: Consider adding thumbnail <Figure size='thumb' /> visuals for key concepts.")

    if long_paragraphs:
        score -= 10
        findings.append(
            f"ADVICE: {len(long_paragraphs)} prose paragraph(s) exceed 150 words. Condense recap prose into bullets or tables."
        )

    if not has_counterexample:
        score -= 15
        findings.append("DEFECT: Missing concrete counterexample or hypothesis failure case in Hypothesis Checklist.")

    flags = {
        "has_counterexample": has_counterexample,
        "has_worked_example": has_chooser,
        "has_predict_before_reveal": False,
    }
    return score, num_artifacts, False, flags, findings


def audit_practice_page(fm: dict, body: str) -> tuple[int, int, bool, dict[str, bool], list[str]]:
    """Audit D-0014/D-0017 kind 'practice' (algorithmic practice workshop pages)."""
    long_paragraphs = find_dense_prose_paragraphs(body)

    interaction_matches = list(PRACTICE_INTERACTION_RE.finditer(body))
    num_interactions = len(interaction_matches)

    gen_match = re.search(r"<PracticeGenerator\b([^>]*)/?>", body, re.DOTALL)
    has_math_stmt = bool(re.search(r"<MathStatement\b", body))
    has_refs = bool(re.search(r"^##+\s+(?:references|sources|bibliography|further reading)\b", body, re.MULTILINE | re.IGNORECASE))
    has_attempt_guidance = bool(
        re.search(
            r"\b(?:before\s+inspecting\s+hints|independently|on\s+paper)\b",
            body,
            re.IGNORECASE,
        )
    )
    has_verification_guidance = bool(
        re.search(
            r"\b(?:hypothesis|domain\s+restrictions?|invariants?|boundary|state\s+transitions?|worked\s+solution)\b",
            body,
            re.IGNORECASE,
        )
    )

    score = 100
    findings: list[str] = []

    if not has_nonempty_frontmatter_list(fm, "covers"):
        score -= 15
        findings.append("DEFECT: Practice workshop frontmatter must declare non-empty 'covers' list.")
    if has_math_stmt:
        score -= 20
        findings.append("DEFECT: <MathStatement> is forbidden on 'practice' pages (D-0014).")

    if not gen_match:
        score -= 40
        findings.append("CRITICAL: Missing <PracticeGenerator> interactive workshop component.")
    else:
        props = gen_match.group(1)
        if "client:load" not in props:
            score -= 15
            findings.append("DEFECT: <PracticeGenerator> is missing 'client:load'.")
        course_id_match = re.search(r'\bcourseId=["\']([^"\']+)["\']', props)
        if not course_id_match:
            score -= 15
            findings.append("DEFECT: <PracticeGenerator> is missing 'courseId' prop.")
        elif fm.get("course") and course_id_match.group(1) != fm.get("course"):
            score -= 15
            findings.append(
                f"DEFECT: <PracticeGenerator courseId='{course_id_match.group(1)}'> mismatches frontmatter course '{fm.get('course')}'."
            )

    if not has_attempt_guidance:
        score -= 15
        findings.append("ADVICE: Add workflow guidance instructing learners to derive solutions before inspecting hints.")

    if not has_verification_guidance:
        score -= 15
        findings.append("DEFECT: Missing guidance on verifying worked solutions against invariants/domain boundaries.")

    if not has_refs:
        score -= 10
        findings.append("DEFECT: Missing References & Further Reading section.")

    if long_paragraphs:
        score -= 10
        findings.append(
            f"ADVICE: {len(long_paragraphs)} prose paragraph(s) exceed 150 words. Keep workshop framing concise."
        )

    flags = {
        "has_counterexample": has_verification_guidance,
        "has_worked_example": bool(gen_match),
        "has_predict_before_reveal": has_attempt_guidance,
    }
    return score, num_interactions, False, flags, findings


def audit_lesson(file_path: Path) -> dict:
    content = file_path.read_text(encoding="utf-8")
    fm, body = split_frontmatter(content)

    words = re.findall(r"\b[A-Za-z0-9'-]+\b", body)
    total_words = len(words)
    total_chars = len(body)
    kind = fm.get("kind") or "lesson"

    if kind == "problems":
        score, num_interactions, blob_at_end, flags, findings = audit_problems_page(fm, body)
    elif kind == "recap":
        score, num_interactions, blob_at_end, flags, findings = audit_recap_page(fm, body)
    elif kind == "practice":
        score, num_interactions, blob_at_end, flags, findings = audit_practice_page(fm, body)
    else:
        score, num_interactions, blob_at_end, flags, findings = audit_standard_lesson(fm, body)

    return {
        "file": str(file_path.resolve().relative_to(ROOT.resolve())),
        "kind": kind,
        "title": fm.get("title", file_path.stem),
        "words": total_words,
        "chars": total_chars,
        "interactions": num_interactions,
        "score": max(0, score),
        "blob_at_end": blob_at_end,
        "has_counterexample": flags["has_counterexample"],
        "has_worked_example": flags["has_worked_example"],
        "has_predict_before_reveal": flags["has_predict_before_reveal"],
        "findings": findings,
    }


def main():
    parser = argparse.ArgumentParser(description="LibreUni Pedagogical & Cadence Auditor")
    parser.add_argument("target", nargs="?", default=None, help="Specific lesson path or course name")
    parser.add_argument("--min-score", type=int, default=70, help="Minimum passing pedagogical score")
    args = parser.parse_args()

    files = []
    if args.target:
        p = Path(args.target)
        if p.is_file():
            files = [p]
        elif (LESSONS_DIR / args.target).is_dir():
            files = list((LESSONS_DIR / args.target).glob("*.mdx"))
        else:
            files = list(LESSONS_DIR.glob(f"**/*{args.target}*.mdx"))
    else:
        files = list(LESSONS_DIR.glob("**/*.mdx"))

    if not files:
        print("No lesson files found matching target.")
        sys.exit(1)

    print(f"=== LibreUni heuristic lesson inventory ({len(files)} lessons) ===")
    print("Pattern scores are review aids, not a pedagogical standard or certification.\n")
    failed = 0
    for f in sorted(files):
        res = audit_lesson(f)
        status = "PASS" if res["score"] >= args.min_score else "FAIL"
        if status == "FAIL":
            failed += 1

        print(f"[{status}] {res['file']} (Score: {res['score']}/100 | {res['words']} words | {res['interactions']} interactions)")
        for finding in res["findings"]:
            print(f"       • {finding}")
        if res["findings"]:
            print()

    print(f"Heuristic summary: {len(files) - failed}/{len(files)} lessons meet the configured pattern threshold ({args.min_score}).")
    print("This result does not establish lesson quality, assessment validity, or creditworthiness; review the source and exercises.")
    if failed > 0:
        print(f"{failed} lesson(s) are below the pattern threshold and need review.")


if __name__ == "__main__":
    main()
