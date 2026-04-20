#!/usr/bin/env python3
"""
Prop migration: standardize component prop names across all MDX lesson files.

Replacements:
  Global (CodeRunner + CodeExercise):
    initialCode=  →  code=

  Within <Quiz ...> blocks only:
    answers=      →  options=
    answerIndex=  →  correctIndex=

  Within <CaseStudy ...> blocks only:
    description=  →  scenario=
    task=         →  question=
    solution=     →  explanation=

Dry-run by default; pass --apply to write changes.
"""

import os
import re
import sys

LESSONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'lessons')
DRY_RUN = '--apply' not in sys.argv


def replace_in_component_blocks(content: str, component: str, replacements: list[tuple[str, str]]) -> str:
    """Replace prop names only inside <ComponentName ...> blocks."""
    lines = content.split('\n')
    result = []
    in_block = False

    for line in lines:
        if re.search(rf'<{component}\b', line):
            in_block = True

        if in_block:
            for old, new in replacements:
                line = line.replace(old, new)

        result.append(line)

        # A self-closing tag ends the block; look for /> not inside a string.
        # Simple heuristic: if the line contains /> and we're in a block, end it.
        if in_block and re.search(r'/>', line):
            in_block = False

    return '\n'.join(result)


def migrate_file(filepath: str) -> bool:
    with open(filepath, encoding='utf-8') as f:
        original = f.read()

    content = original

    # 1. Global: initialCode= → code=  (CodeRunner + CodeExercise)
    content = content.replace('initialCode=', 'code=')

    # 2. Quiz-specific prop renames
    content = replace_in_component_blocks(content, 'Quiz', [
        ('answers=', 'options='),
        ('answerIndex=', 'correctIndex='),
    ])

    # 3. CaseStudy-specific prop renames
    content = replace_in_component_blocks(content, 'CaseStudy', [
        ('description=', 'scenario='),
        ('task=', 'question='),
        ('solution=', 'explanation='),
    ])

    if content == original:
        return False

    if not DRY_RUN:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    return True


def main():
    changed = []
    for root, _, files in os.walk(LESSONS_DIR):
        for fname in sorted(files):
            if fname.endswith('.mdx'):
                path = os.path.join(root, fname)
                if migrate_file(path):
                    changed.append(os.path.relpath(path))

    mode = 'DRY RUN' if DRY_RUN else 'APPLIED'
    print(f'[{mode}] {len(changed)} files would be changed:')
    for p in changed:
        print(f'  {p}')
    if DRY_RUN:
        print('\nRun with --apply to write changes.')


if __name__ == '__main__':
    main()
