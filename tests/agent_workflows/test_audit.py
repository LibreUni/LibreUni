from libreuni_agent.audit import audit_text, split_frontmatter


GOOD = """---
title: A sound topic
course: demo
description: A self-contained description.
---
# A sound topic

Theory explains the definition.

## Example

An example demonstrates the definition.

## Exercise

Try the exercise using the explanation above.

## References & Further Reading

- [Python documentation](https://docs.python.org/3/)
"""


def test_frontmatter_is_parsed():
    frontmatter, body = split_frontmatter(GOOD)
    assert frontmatter["course"] == "demo"
    assert body.startswith("# A sound topic")


def test_audit_accepts_sourced_lesson():
    result = audit_text(GOOD, "demo.mdx")
    assert result["passed"] is True
    assert result["errors"] == []


def test_audit_rejects_banned_filler():
    text = GOOD.replace("An example demonstrates", "Welcome, let's dive in. An example demonstrates")
    result = audit_text(text, "bad.mdx")
    assert any("banned" in error for error in result["errors"])

