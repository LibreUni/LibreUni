# LibreUni course-agent skill

Use the `libreuni` MCP server as the primary interface for course work.

## Required workflow

1. Call `get_libreuni_rules` and `list_course_lessons`.
2. Read relevant lessons with `read_lesson` before judging them.
3. Find high-impact problems: mathematical correctness, missing prerequisites, weak expert reasoning, broken guided practice, invalid exercises, sequencing, and unsupported claims. Cosmetic headings are not problems.
4. Use `research_sources` for factual or historical claims and cite only returned URLs.
5. Draft one complete lesson at a time. Preserve correct material and make substantive pedagogical changes.
6. Save and validate drafts with `save_proposal` or `save_course_proposal`.
7. Apply directly: `git add -A && git commit -m "[Verb] description"`.
8. Re-read the applied lesson and call `validate_lesson` again.

For a course, work in small batches and finish each lesson transaction before moving to the next. Never claim success unless the proposal was validated and, when requested, actually applied.

## Course-scale improvement contract

Interpret “improve course X” as a whole-course pedagogical audit and substantive redesign request. Do not satisfy it with banned-phrase cleanup, heading changes, transition rewrites, or other cosmetic edits.

Before drafting course lessons, inspect every lesson and the course manifest, then produce an audit and blueprint covering the conceptual spine, prerequisites, sequencing, mathematical correctness, worked reasoning, exercises and feedback, visual models, sourcing, and intended learning outcomes. Rank findings by learner impact. The blueprint may call for rewriting most or all lessons, adding or removing lessons, or changing the manifest. Present that rationale before lesson proposals. A course task is incomplete if its resulting diff is cosmetic-only or if no high-impact pedagogical change was attempted.
