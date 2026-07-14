from libreuni_agent.audit import audit_text, split_frontmatter
from libreuni_agent.graph import _batches, _normalize_review


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


def test_audit_does_not_parse_embedded_code_as_component_props():
    text = GOOD + """

<CodeRunner client:load title="Example" code={`for x in values:
    if x > 2:
        print(x)
`} />
"""
    result = audit_text(text, "code.mdx")
    assert not any("CodeRunner" in error and "non-canonical" in error for error in result["errors"])


def test_audit_does_not_parse_quiz_expression_as_props():
    text = GOOD + """

<Quiz client:load question="Which set?" options={["H = {1}", "x = 0"]} correctIndex={0} explanation="A set."} />
"""
    result = audit_text(text, "quiz.mdx")
    assert not any("Quiz" in error and "non-canonical" in error for error in result["errors"])


def test_workflow_batches_and_downgrades_unsupported_reviewer_claims():
    assert _batches(["a", "b", "c"], 2) == [["a", "b"], ["c"]]
    result = _normalize_review([{"severity": "blocker", "issue": "claim", "evidence": "model opinion"}], [{"url": "https://example.org/source"}])
    assert result[0]["severity"] == "warning"
