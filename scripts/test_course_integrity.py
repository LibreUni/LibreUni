#!/usr/bin/env python3
"""Focused regression tests for course_integrity.py's deterministic checks."""

import unittest

from scripts.course_integrity import (
    GENERIC_DIAGRAM_LABELS,
    heading_sections,
    paragraph_blocks,
    plantuml_fingerprint,
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

    def test_generic_label_set_is_explicit(self):
        self.assertIn("concept", GENERIC_DIAGRAM_LABELS)
        self.assertIn("measurement", GENERIC_DIAGRAM_LABELS)


if __name__ == "__main__":
    unittest.main()
