# Refactor state snapshot — 2026-10-06

Branch `refactor_230826`, HEAD `5fc49c7 [Refactor] Refactor proposal Sep 2026` (previous: `aaee234 Purge for CS/SWE focus`). Worktree clean at snapshot time.

## What the refactor did

- Purged the catalog from 10 CS/SWE courses (238 lessons) to **3 reference courses**; 7 retired courses, their manifests, and 3 former career paths are kept (including uncommitted state) in [`archive/curriculum/2026-09-14/`](../../archive/curriculum/2026-09-14/README.md). Archive is a recovery source, never loaded by Astro.
- Rewrote the 3 courses ground-up; added one learning path (`src/content/careers/systems-foundations.json`).
- Reworked lesson shell (compact brief + sequence navigator; no generic injected quizzes), `Quiz`/`CaseStudy` semantics, named playgrounds, quality gates, PDF/book export.
- Added curriculum notes per course in [`docs/curriculum/`](../curriculum/) and a crosswalk.

## The three courses

| Course | Lessons | Authored interactions (per `course-quality.json`) | Notes |
|---|---|---|---|
| computer-architecture | 20 | Quiz 20, CaseStudy 20, 0 CodeExercise/Runner; 8 code blocks | Foundation of the path. Repair contract exists. |
| database-systems | 20 | CodeExercise 4; no Quiz/CaseStudy | Playgrounds exist (FD, B-tree, quorum, etc.). |
| operating-systems | 28 | **None** authored (79 code blocks) | Largest; labs claim assets that don't exist (xv6 etc.). |

## Verified baseline (this session)

- `npm run check:content`: contract tests, lesson verifier (0 errors, **460 warnings** over 68 files), course stats, integrity, and 12 model tests all pass.
- Not re-run this session: `check:build`, `check:e2e`, `check:ux`, `check:lighthouse`. Run them before claiming a green baseline.
- The 460 warnings are almost all "section has no code block/example signal" and "lesson does not end with an interactive/exercise component". Per project rules these are review triggers, **not** proof of quality either way.

## Why it "failed" (diagnosis, source-backed)

The structure and tooling are good; the **teaching content does not yet meet the standard it declares**. From the repair contracts:

1. Sections are exposition without an adjacent worked example, counterexample, or practice; a single opening quiz is not outcome assessment.
2. Outcome claims ("proof, transfer, design under changed parameters") exceed assessments; some exercises are **under-specified or wrong** (cache AMAT lacks inputs; VM exercise lacks PFN; OS SJF starvation example is invalid for non-preemptive SJF; capstone "68 operations" mixes multiplies/adds).
3. Labs promise runnable fixtures/oracles/xv6 repos that are not shipped. Rule: a protocol or rubric is not a runnable experiment unless a fixture/data path exists.
4. Sources are generic course landing pages, not claim-level anchors.
5. Breadth exceeds depth: specialist topics are named but not taught (see each contract's "deliberate narrowing").
6. Interaction parity is uneven: OS has 0 authored interactions; DB has no assessments; CA has stock Quiz/CaseStudy on every lesson (likely template-shaped — audit before treating as strength).
7. Structure checks pass (`verify_lessons`, smoke) so they hide the above. Do not use them as the finish line.

## Decisions in force

See [`../agent-context/DECISIONS.md`](../agent-context/DECISIONS.md): D-0001…D-0007 (D-0003 superseded). Key operational ones: D-0005 (lesson framing/interaction rules), D-0006 (three reference courses), D-0007 (pilot-then-port process, added with this hand-off).

## Known mess / cleanup candidates (not removed — owner decision)

- `backup.txt` — tracked, **0 bytes**; safe to delete.
- `CODEX.md` — tracked host adapter; keep unless `HOSTS.md` says otherwise.
- `test-results/`, `dist/`, `reports/` — generated; `reports/` is git-ignored (62 MB). Anything valuable there must be copied to `docs/` (done for the three repair contracts).
- `src/components/playgrounds/` still contains playgrounds for retired courses (Fourier, Birthday bound, Epsilon-delta, Automaton…). Prune or move to archive when the pilot stabilizes; check imports first.
- `docs/agent-experiments/lesson-quality-panel/` — an experimental multi-agent review panel with runbook and `quality_probe.py`. Reuse ideas (evidence packets, held-out challenges), but its proposed `operation/` directory was never created.
- The last commit added many screenshot/JSON baselines (visual/ux reports; size not measured) (visual/ux baselines); consider whether they belong in Git.

## Open questions for the owner

1. Confirm pilot course (recommended: **Computer Architecture**, see PLAN §Pilot choice).
2. Are xv6-style external checkouts acceptable for OS labs, or must every lab be executable inside the repo?
3. Is the 10-ECTS-level depth target still the bar? (Contracts assume university-level depth must not be lowered.)
