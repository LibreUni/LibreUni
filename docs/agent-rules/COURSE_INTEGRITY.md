# Course Integrity Audit

`scripts/course_stats.py` is a mechanical smoke test. It checks broken structure, component props, code syntax, and renderer failures. It is not a pedagogical score.

`scripts/course_integrity.py` is an anomaly detector for course padding and coverage gaps. It checks:

- filler and placeholder phrases;
- repeated prose blocks;
- substantive headings without an adjacent teaching artifact;
- generic diagrams whose labels do not express domain concepts;
- repeated diagram topology within a course.

The audit reports findings rather than assigning a quality score. A finding is a review trigger; a clean report is not proof that the teaching is good. Findings marked `error` (filler, duplicate prose, or repeated diagram topology) make `--strict` fail. Findings marked `review` (generic artifacts or uncovered headings) require human/agent review and are reported without pretending that a threshold proves quality.

Counts are inventory only. Never optimize for lesson length, character count, component count, or artifact count. Repeated structure with renamed labels is duplication, not coverage. A coverage matrix must be checked against the actual lesson files, and every artifact must be specific to the learning unit it follows.

## Required course-review evidence

For course-scale work, provide or review:

1. a generated heading and paragraph inventory;
2. a coverage matrix linking each learning unit to its artifact and learning outcome;
3. duplicate and generic-artifact findings;
4. a sample review from every module;
5. intentional prose-only units with a pedagogical justification.

Do not use a manually written report, source-tracking comment, renamed placeholder, or generated filler to make the audit pass. If the audit catches an existing course defect, report it honestly and repair the content or explain the external blocker.
