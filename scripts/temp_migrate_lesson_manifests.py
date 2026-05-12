#!/usr/bin/env python3
"""
Temporary migration for moving lesson order/module metadata into per-course manifests.

The script reads existing MDX frontmatter, writes a course.yml manifest in each
course folder, and removes the now-derived `order` and `module` fields from
lesson frontmatter.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "apps" / "main" / "src" / "content" / "lessons"
MANIFESTS_DIR = ROOT / "apps" / "main" / "src" / "data" / "course-manifests"
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(block: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip().strip('"').strip("'")
    return fields


def yaml_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def remove_frontmatter_keys(block: str, keys: set[str]) -> str:
    kept_lines: list[str] = []
    for line in block.splitlines():
        key = line.split(":", 1)[0].strip() if ":" in line else ""
        if key not in keys:
            kept_lines.append(line)
    return "\n".join(kept_lines).rstrip() + "\n"


def migrate_course(course_dir: Path) -> bool:
    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = MANIFESTS_DIR / f"{course_dir.name}.yml"
    if manifest_path.exists():
        return False

    lessons = []

    for lesson_path in sorted(course_dir.glob("*.mdx")):
        content = lesson_path.read_text(encoding="utf-8")
        match = FRONTMATTER_RE.match(content)
        if not match:
            raise ValueError(f"Missing frontmatter: {lesson_path}")

        frontmatter_block = match.group(1)
        frontmatter = parse_frontmatter(frontmatter_block)
        order = float(frontmatter.get("order", "0"))
        module = frontmatter.get("module", "Overview") or "Overview"
        slug = lesson_path.stem

        lessons.append((order, module, slug))

        new_frontmatter = remove_frontmatter_keys(frontmatter_block, {"order", "module"})
        new_content = f"---\n{new_frontmatter}---\n{content[match.end():]}"
        lesson_path.write_text(new_content, encoding="utf-8")

    lessons.sort(key=lambda item: (item[0], item[2]))

    lines = [
        "# Lesson order and module grouping for this course.",
        "# Slugs refer to sibling .mdx files without the extension.",
        "modules:",
    ]

    current_module: str | None = None
    for _, module, slug in lessons:
        if module != current_module:
            lines.append(f"  - title: {yaml_string(module)}")
            lines.append("    lessons:")
            current_module = module
        lines.append(f"      - {slug}")

    manifest_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return True


def main() -> None:
    for course_dir in sorted(path for path in LESSONS_DIR.iterdir() if path.is_dir()):
        action = "migrated" if migrate_course(course_dir) else "skipped"
        print(f"{action} {course_dir.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
