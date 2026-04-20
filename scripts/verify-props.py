#!/usr/bin/env python3
"""
Verify that no deprecated component prop aliases remain in lesson MDX files.
Run after migrate-props.py to confirm the migration was complete.
Exit 1 if any violations found.
"""

import os
import re
import sys

LESSONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'lessons')

# Prop aliases that must NOT appear (old names that were migrated away)
BANNED_GLOBAL = [
    'initialCode=',  # → code=
]

BANNED_IN_QUIZ = [
    'answerIndex=',  # → correctIndex=
    # 'answers=' is intentionally NOT banned globally: CodeExercise still uses it.
    # Detecting "answers= inside Quiz" requires context — rely on migrate-props.py for that.
]

# In CaseStudy blocks
BANNED_IN_CASESTUDY = [
    'description=',  # → scenario=
    'task=',         # → question=
    'solution=',     # → explanation=
]


def check_file(filepath: str) -> list[str]:
    violations = []
    with open(filepath, encoding='utf-8') as f:
        lines = f.readlines()

    in_quiz = False
    in_casestudy = False

    for i, line in enumerate(lines, 1):
        if re.search(r'<Quiz\b', line):
            in_quiz = True
        if re.search(r'<CaseStudy\b', line):
            in_casestudy = True

        for banned in BANNED_GLOBAL:
            if banned in line:
                violations.append(f'  Line {i}: {banned!r} → {line.rstrip()}')

        if in_quiz:
            for banned in BANNED_IN_QUIZ:
                if banned in line:
                    violations.append(f'  Line {i} (in Quiz): {banned!r} → {line.rstrip()}')

        if in_casestudy:
            for banned in BANNED_IN_CASESTUDY:
                if banned in line:
                    violations.append(f'  Line {i} (in CaseStudy): {banned!r} → {line.rstrip()}')

        if '/>' in line:
            in_quiz = False
            in_casestudy = False

    return violations


def main():
    all_violations: dict[str, list[str]] = {}

    for root, _, files in os.walk(LESSONS_DIR):
        for fname in sorted(files):
            if fname.endswith('.mdx'):
                path = os.path.join(root, fname)
                v = check_file(path)
                if v:
                    all_violations[os.path.relpath(path)] = v

    if all_violations:
        print(f'FAIL: {len(all_violations)} file(s) contain deprecated prop aliases:\n')
        for filepath, violations in all_violations.items():
            print(f'{filepath}:')
            for v in violations:
                print(v)
            print()
        sys.exit(1)
    else:
        total = sum(1 for r, _, fs in os.walk(LESSONS_DIR) for f in fs if f.endswith('.mdx'))
        print(f'OK: {total} lesson files checked — no deprecated prop aliases found.')


if __name__ == '__main__':
    main()
