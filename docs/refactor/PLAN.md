# Refactor plan

Goal: one course at **reference-perfect** level → its pattern applied to the other two → independent verification → only then mass production of further courses (retired ones can be re-entered from `archive/`).

## Pilot choice (proposed; owner to confirm)

**Computer Architecture** (20 lessons). Reasons: first course in the path (no upstream dependency on the other two); smallest conceptual surface with checkable numerics (CPI, AMAT, Amdahl, encodings, translation walks), so correctness can be verified independently; its repair contract already gives a lesson-by-lesson disposition table; playgrounds for cache, Amdahl, and device I/O exist. OS (28 lessons, 0 authored interactions, lab fixtures missing) is the hardest and should be second/third.

If the owner picks another course, replace the backlog but keep the phases.

## Phases and exit gates

### Phase 0 — Baseline (1 agent, short)
- Run `npm run check:required`; record results in `docs/refactor/BASELINE.md`.
- Decide cleanup items from STATE.md (delete `backup.txt`, etc.). Commit separately.
- Gate: required checks green or every failure documented with owner.

### Phase 1 — Define "perfect" (human + 1 designer agent)
- Write `docs/refactor/LESSON_EXEMPLAR_SPEC.md`: a concrete checklist derived from `COURSE_STANDARD.md`, `COURSE_PEDAGOGY.md`, `COURSE_INTEGRITY.md`, and the repair contracts. Must be testable: per-section worked example/counterexample, solved exercises with all inputs, omission statement, claim-level sources, executable-evidence rule, static/book parity.
- Perfect **two exemplar lessons** by hand first (suggested: `cache-hierarchies`, `virtual-memory-hardware`) and have the owner approve them. They become the template for swarm output.
- Gate: owner approves the exemplars and spec.

### Phase 2 — Perfect the pilot (swarm, parallel by lesson)
- Execute `PILOT_BACKLOG.md` units using the playbook. One lesson = one work unit = one writer owner.
- Cross-cutting units (manifest/metadata, playground models + tests, sources, glossary/terminology consistency) are serialized, owned by a single integrator.
- Gate (course): every lesson passes the spec checklist by an **independent reviewer** (not the writer), independent calculation/counterexample re-derivation passes, `check:required` green, visual/UX inspection done, owner spot-checks ≥5 lessons.

### Phase 3 — Extract the pattern (1–2 agents)
- Produce `docs/refactor/COURSE_PATTERN.md`: what actually worked (lesson skeleton, component usage rules, review packet format, time per lesson, defect classes found in review). Fold stable rules into `docs/agent-rules/` (not here).
- Gate: pattern validated by applying it to one lesson of another course without help.

### Phase 4 — Port to Database Systems and Operating Systems (swarm)
- Same backlog mechanics, generated from each repair contract's disposition table. DB first (smaller); OS after the executable-lab policy question is answered.
- Gate: same as Phase 2 per course, plus cross-course consistency (terminology, prerequisites, learning-path gates in `systems-foundations.json`, crosswalk).

### Phase 5 — Verification of the trio
- Fresh-context reviewers run held-out tasks (see panel `quality_probe.py` and `agentic-runbook.md` for the evidence-packet idea), full `check:full`, accessibility and visual review, PDF export check.
- Gate: owner sign-off. Update `COURSE_CROSSWALK.md`, `STATE.md`, D-0007 status.

### Phase 6 — Mass production
- For each archived course: review lessons against the **current** standard (never restore wholesale), create a backlog from a new repair contract, run the Phase 2 mechanics. Only after Phase 5 sign-off.

## Rules that apply to every phase
- Mechanical checks (`verify_lessons`, smoke) are necessary, never sufficient.
- No lowering of university-level depth to make things easy; narrow scope explicitly instead.
- No claims of runnable labs without shipped fixtures.
- Record only stable decisions in `agent-context/DECISIONS.md`; progress goes in `docs/refactor/` and is deleted/merged when done.
