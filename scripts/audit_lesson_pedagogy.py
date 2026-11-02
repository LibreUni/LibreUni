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

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "src" / "content" / "lessons"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
HEADING_RE = re.compile(r"^(#{2,3})\s+(.+?)\s*$", re.MULTILINE)
INTERACTION_RE = re.compile(
    r"<(?:Quiz|CaseStudy|CodeExercise|CodeRunner|InterleavingPlayground|PageTablePlayground|EpsilonDeltaPlayground|TangentPlayground|RiemannPlayground|details|[A-Z][A-Za-z0-9]+Playground)\b|<PlantUML\b|<MathProof\b",
    re.MULTILINE,
)


def split_frontmatter(content: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(content)
    if not m:
        return {}, content
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm, content[m.end():]


def audit_lesson(file_path: Path) -> dict:
    content = file_path.read_text(encoding="utf-8")
    fm, body = split_frontmatter(content)

    lines = body.splitlines()
    total_lines = len(lines)
    words = re.findall(r"\b[A-Za-z0-9'-]+\b", body)
    total_words = len(words)
    total_chars = len(body)

    # Paragraph length & wall-of-text check
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip() and not p.strip().startswith("<") and not p.strip().startswith("```") and not p.strip().startswith("#")]
    long_paragraphs = [p for p in paragraphs if len(p.split()) > 150]

    # Find positions of all interactive elements
    interaction_matches = list(INTERACTION_RE.finditer(body))
    num_interactions = len(interaction_matches)

    # Check interactivity distribution:
    # If all interactions occur in the last 25% of the file, flag "blob at the end".
    body_len = len(body)
    interaction_positions = [m.start() / body_len for m in interaction_matches]
    
    blob_at_end = False
    if interaction_positions:
        first_interaction = min(interaction_positions)
        if first_interaction > 0.60:
            blob_at_end = True
    else:
        first_interaction = None

    # Check pedagogical components
    has_math_stmt = bool(re.search(r"<MathStatement\b", body))
    has_counterexample = bool(re.search(r"\b(?:counterexample|failure mode|pathological|starve|stale|hazard)\b", body, re.IGNORECASE))
    has_worked_example = bool(re.search(r"\b(?:worked trace|worked example|worked stride|derivation)\b", body, re.IGNORECASE))
    has_predict_before_reveal = bool(re.search(r"\b(?:predict|answer before|reveal|prediction)\b", body, re.IGNORECASE))
    has_omissions = "omissions" in fm or bool(re.search(r"##\s+(?:Deliberate\s+Boundary|Deliberate\s+Omissions|Connections\s+and\s+Limits)", body, re.IGNORECASE))
    has_prereqs = "prerequisites" in fm or "Prerequisites" in body

    # Calculate Interactivity Distribution Score (0 to 100)
    score = 100
    findings = []

    if num_interactions == 0:
        score -= 40
        findings.append("CRITICAL: Zero interactive elements or predict-then-reveal checkpoints found.")
    elif blob_at_end:
        score -= 25
        findings.append(f"WARNING: Interactivity is clustered at the end (first interaction at {first_interaction*100:.0f}% of document). Weave retrieval practice throughout.")

    if long_paragraphs:
        score -= 10
        findings.append(f"ADVICE: {len(long_paragraphs)} paragraph(s) exceed 150 words. Break up dense prose with diagrams or checkpoints.")

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

    return {
        "file": str(file_path.resolve().relative_to(ROOT.resolve())),
        "title": fm.get("title", file_path.stem),
        "words": total_words,
        "chars": total_chars,
        "interactions": num_interactions,
        "score": max(0, score),
        "blob_at_end": blob_at_end,
        "has_counterexample": has_counterexample,
        "has_worked_example": has_worked_example,
        "has_predict_before_reveal": has_predict_before_reveal,
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
