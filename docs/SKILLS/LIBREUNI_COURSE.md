# LibreUni course-agent skill

Use the `libreuni` MCP server as the primary interface for course work.

## Required workflow

1. Call `get_libreuni_rules` and `list_course_lessons`.
2. Read relevant lessons with `read_lesson` before judging them.
3. Find high-impact problems: mathematical correctness, missing prerequisites, weak expert reasoning, broken guided practice, invalid exercises, sequencing, and unsupported claims. Cosmetic headings are not problems.
4. Use `research_sources` for factual or historical claims and cite only returned URLs.
5. Draft one complete lesson at a time. Preserve correct material and make substantive pedagogical changes.
6. Save the complete draft with `save_proposal`, which validates it without changing `src/`. For a new course or a coordinated metadata/manifest change, use `save_course_proposal` with all files together.
7. Show the user the rationale and exact diff. Do not apply automatically.
8. Only call `apply_proposal` or `apply_course_proposal` with `approved_by_user=true` after the user approves that proposal.
9. Re-read the applied lesson and call `validate_lesson` again.

For a course, work in small batches and finish each lesson transaction before moving to the next. Never claim success unless the proposal was validated and, when requested, actually applied.
