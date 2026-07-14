from pathlib import Path


REQUIRED_DOCS = ("docs/RULES.md", "docs/SKILLS/SOURCING.md", "docs/SKILLS/COURSE_REPAIR.md", "docs/SKILLS/PEDAGOGY.md")


def load_rules(root: Path) -> str:
    parts = []
    for relative in REQUIRED_DOCS:
        path = root / relative
        if not path.exists():
            raise FileNotFoundError(f"Required instruction file is missing: {relative}")
        parts.append(f"\n===== {relative} =====\n{path.read_text(encoding='utf-8')}")
    return "".join(parts)
