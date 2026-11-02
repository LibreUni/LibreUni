#!/usr/bin/env python3
"""Focused regression tests for course_integrity.py's deterministic checks."""

import unittest

from scripts.course_integrity import (
    ACTIVE_COMPONENT_RE,
    PASSIVE_COMPONENT_RE,
    artifact_in_section,
    GENERIC_DIAGRAM_LABELS,
    assessment_length_cues,
    heading_sections,
    paragraph_blocks,
    plantuml_fingerprint,
    strip_frontmatter,
)
from scripts.verify_lessons import (
    component_prop_names,
    find_filler_violations,
    section_is_structural,
    structure_warnings,
)


class CourseIntegrityTests(unittest.TestCase):
    def test_diagram_fingerprint_ignores_renamed_labels(self):
        first = 'rectangle "Sorting" as A\nrectangle "Input" as B\nA --> B : feeds'
        second = 'rectangle "Routing" as A\nrectangle "Data" as B\nA --> B : feeds'
        self.assertEqual(plantuml_fingerprint(first), plantuml_fingerprint(second))

    def test_diagram_fingerprint_preserves_different_relationships(self):
        first = 'rectangle "Sorting" as A\nrectangle "Input" as B\nA --> B : feeds'
        second = 'rectangle "Sorting" as A\nrectangle "Input" as B\nB --> A : feeds'
        self.assertNotEqual(plantuml_fingerprint(first), plantuml_fingerprint(second))

    def test_heading_sections_are_bounded_by_next_heading(self):
        sections = heading_sections("## One\nText\n## Two\nMore")
        self.assertEqual([title for title, _ in sections], ["One", "Two"])
        self.assertEqual(sections[0][1].strip(), "Text")

    def test_paragraph_blocks_ignore_code_and_lists(self):
        body = "A real instructional paragraph with enough domain-specific words to be considered meaningful course content for this deterministic test.\n\n- a list item\n\n```python\nprint('placeholder')\n```"
        blocks = paragraph_blocks(body)
        self.assertEqual(len(blocks), 1)
        self.assertIn("meaningful course content", blocks[0])

    def test_frontmatter_stripping_preserves_horizontal_rule_sections(self):
        content = (
            "---\ntitle: Test\n---\n\n# Lesson\n\nFirst section.\n\n---\n\n"
            "<Quiz client:load question=\"Q\" options={[\"A\"]} correctIndex={0} />\n"
        )
        body = strip_frontmatter(content)
        self.assertIn("First section.", body)
        self.assertIn("<Quiz", body)
        self.assertTrue(ACTIVE_COMPONENT_RE.search(body))

    def test_disclosure_only_practice_is_distinguished_from_committed_check(self):
        self.assertTrue(PASSIVE_COMPONENT_RE.search('<details><summary>Show hint</summary></details>'))
        self.assertFalse(ACTIVE_COMPONENT_RE.search('<ExerciseSolution hint="Try again.">Answer</ExerciseSolution>'))
        self.assertTrue(ACTIVE_COMPONENT_RE.search('<SqlRunner client:load schema={`SELECT 1;`} />'))
        self.assertTrue(ACTIVE_COMPONENT_RE.search('<PageTablePlayground client:load />'))

    def test_invariant_and_sql_runner_count_as_teaching_artifacts(self):
        self.assertTrue(artifact_in_section("> **Invariant.** A durable log prefix orders writes."))
        self.assertTrue(artifact_in_section('<SqlRunner client:load schema={`SELECT 1;`} />'))
        self.assertFalse(artifact_in_section("$$\nAMAT = t_h + m t_p\n$$"))
        self.assertFalse(artifact_in_section("| Label | Value |\n| --- | --- |\n| a | b |"))
        self.assertTrue(artifact_in_section("**Worked example.** Trace the frame layout."))

    def test_generic_label_set_is_explicit(self):
        self.assertIn("concept", GENERIC_DIAGRAM_LABELS)
        self.assertIn("measurement", GENERIC_DIAGRAM_LABELS)

    def test_prop_parser_ignores_object_literal_contents(self):
        props = """ client:load title="Check $x$"
          question="What is $\\delta$?"
          options={[
            { id: '1', text: 'No, $x$ is wrong', isCorrect: false },
            { id: '2', text: 'Yes', isCorrect: true }
          ]}
          correctIndex={1}
          explanation="Because $x$" """
        self.assertEqual(
            component_prop_names(props),
            ["client:load", "title", "question", "options", "correctIndex", "explanation"],
        )

    def test_structural_sections_do_not_need_teaching_artifacts(self):
        for title in (
            "References & Further Reading",
            "Scope Boundaries & Deliberate Omissions",
            "Deliberate Omissions",
            "Connections and deliberate boundary",
            "Deliverable contract",
            "Lab tasks",
        ):
            self.assertTrue(section_is_structural(title), title)
        for title in ("Forwarding and interlocks", "Milestone A — isolate negotiation", "Task scheduling"):
            self.assertFalse(section_is_structural(title), title)

    def test_structure_warnings_ignore_reference_tail(self):
        body = (
            "## A real concept\n\n"
            "> **Definition.** A precise claim.\n\n"
            "**Worked example.** Trace the result.\n\n"
            "## References & Further Reading\n\n"
            "* A source.\n"
        )
        self.assertEqual(structure_warnings(body), [])

    def test_structure_warnings_still_flag_unjustified_prose_section(self):
        body = (
            "## A real concept\n\n"
            "**Worked example.** Trace the result.\n\n"
            "## Bare prose\n\n"
            "A paragraph with no artifact at all.\n"
        )
        warnings = structure_warnings(body)
        self.assertEqual(len(warnings), 2)
        self.assertIn("Bare prose", warnings[0])

    def test_diagram_or_math_counts_as_a_teaching_artifact(self):
        body = (
            "## A real concept\n\n"
            "**Worked example.** Trace the result.\n\n"
            "$$\n x = y\n$$\n"
        )
        warnings = structure_warnings(body)
        # The closing-practice warning remains; the artifact warning does not.
        self.assertEqual(warnings, ["Lesson does not conclude with an interactive/exercise component."])

    def test_assessment_lint_detects_length_leakage(self):
        body = '''<Quiz
          question="Which claim is valid?"
          options={["No", "The valid claim names every assumption and the complete boundary condition", "Never", "Maybe"]}
          correctIndex={1}
        />'''
        cues = assessment_length_cues(body)
        self.assertEqual(len(cues), 1)
        self.assertEqual(cues[0]["component"], "Quiz")

    def test_assessment_lint_accepts_balanced_choices(self):
        body = '''<CaseStudy
          options={["Preserve the invariant", "Measure the baseline", "Reject the request", "Trace the failure"]}
          correctIndex={0}
        />'''
        self.assertEqual(assessment_length_cues(body), [])

    def test_named_playground_counts_as_stateful_artifact(self):
        self.assertTrue(artifact_in_section("<AmdahlPlayground client:load />"))

    def test_filler_lint_rejects_conversational_navigation(self):
        violations = find_filler_violations("In the next module, we'll explore cache replacement.")
        self.assertTrue(violations)

    def test_filler_lint_ignores_code_comments(self):
        violations = find_filler_violations("```c\n// Let's explore this branch in a debugger.\n```")
        self.assertEqual(violations, [])

    def test_filler_lint_rejects_marketing_language(self):
        violations = find_filler_violations("This deep-dive makes the system incredibly fast.")
        self.assertTrue(violations)


if __name__ == "__main__":
    unittest.main()
