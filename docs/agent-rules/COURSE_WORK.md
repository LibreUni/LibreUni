# Course work

Use this document for creating, reviewing, researching, auditing, or repairing courses, modules, and lessons. It is a shared task rule for every host harness.

## Scope

- Course improvement or remake: inspect every lesson in the course and its manifest, then design a coherent revision.
- Module improvement: inspect the module and neighboring prerequisites.
- Lesson repair: inspect the target lesson and the assumptions it makes.
- New lesson or course: establish outcomes, prerequisites, learning arc, sources, and assessment before drafting.

“Improve course X” means a whole-course audit and substantive redesign. Do not satisfy it with banned-phrase cleanup, heading changes, spelling fixes, or other cosmetic edits.

## Modernization audit

When a request says to modernize, remake, refresh, or bring a course up to date, treat the existing course as a baseline to audit against the current LibreUni authoring surface. Do not assume that the feature set available when the course was written is still the best one.

After reading the complete course and manifest, inspect the current component guide and compare every lesson with the features now available. Explicitly evaluate whether each learning outcome would benefit from:

- the applicable diagram families: activity/flow, sequence, state, class/domain, component/deployment, use-case/context, mathematical/geometric, quantitative, and custom conceptual/network diagrams;
- the applicable interactive components: quizzes, code runners, code exercises, and case studies;
- the applicable rendered and authoring primitives: Math, PlantUML, TikZ, PythonDiagram, fenced code, tables, labeled blockquotes, collapsible disclosures, and `BookOnly`/`ScreenOnly` wrappers;
- clearer visual treatment for definitions, lemmas, theorems, proofs, warnings, examples, exercises, hints, solutions, and key takeaways; and
- newer platform behavior, accessibility requirements, responsive layout, print/PDF behavior, and validation expectations.

This is a coverage audit, not a widget quota. Use a feature when it improves a stated learning outcome, and record why an apparently relevant feature is not appropriate. A modernization is incomplete if it only updates prose or syntax while leaving avoidable walls of text, unvisualized relationships, weak practice, undisclosed solutions, or inconsistent emphasis structures. Preserve correct material only after checking that it still serves the revised learning arc.

For course-scale modernization, report the feature audit alongside substantive content findings: which diagrams and components were added or revised, which lessons were intentionally left unchanged, and which desired capability is not currently implemented.

## Required process

1. Identify the authoritative course metadata, manifest, and lesson files.
2. Read the relevant content before judging it. For course-scale work, read the complete course and manifest.
3. Read `COURSE_PEDAGOGY.md` and `RESEARCH.md` when research or lesson writing is involved.
4. Audit mathematical correctness, prerequisites, sequencing, worked reasoning, exercises, feedback, visual models, self-containedness, and sourcing. Rank findings by learner impact.
   - Run the course integrity audit. Treat repeated templates, filler, generic renamed diagrams, and uncovered substantive headings as defects, not acceptable coverage.
5. Draft and edit lessons by hand, one file at a time. Preserve correct material only when it serves the intended learning arc.
6. Use interactive components only when they serve a specific learning outcome. Read `COURSE_COMPONENTS.md` before adding or changing one.
7. Apply changes directly in the repository. Do not use a custom repository workflow or hidden staging area.
8. Re-read changed files and run the focused checks required by `VALIDATION.md`.

## Lesson contract

Lessons are self-contained, university level, and normally follow theory → example → exercise. Do not rely on chronological references to other lessons. State prerequisites explicitly. Every exercise must be solvable from the material provided and feedback should diagnose the likely reasoning gap, not merely reveal an answer.

## Course data

Lesson order and module grouping belong in `src/data/course-manifests/<course-id>.yml`. Do not encode course order in lesson frontmatter. Smoke-test data is descriptive inventory, not a pedagogical quality score.
