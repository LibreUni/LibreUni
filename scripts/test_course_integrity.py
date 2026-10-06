#!/usr/bin/env python3
"""Focused regression tests for course_integrity.py's deterministic checks."""

import unittest

from scripts.course_integrity import (
    artifact_in_section,
    GENERIC_DIAGRAM_LABELS,
    assessment_length_cues,
    heading_sections,
    paragraph_blocks,
    plantuml_fingerprint,
)
from scripts.verify_lessons import find_filler_violations


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

    def test_generic_label_set_is_explicit(self):
        self.assertIn("concept", GENERIC_DIAGRAM_LABELS)
        self.assertIn("measurement", GENERIC_DIAGRAM_LABELS)

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
