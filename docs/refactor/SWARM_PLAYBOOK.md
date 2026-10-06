# Swarm playbook

Applies to any host. Complements, never overrides, `AGENTS.md` and [`ROLES.md`](../agent-rules/ROLES.md).

## Roles

| Role | Does | Must not |
|---|---|---|
| Integrator (1) | Owns manifests, metadata, `course-quality.json`, shared components, merges, BASELINE/STATE updates | Write lesson prose in parallel with writers on the same file |
| Lesson writer (N) | Rewrites exactly one lesson per work unit | Touch other lessons, manifests, shared components |
| Model/playground engineer (few) | Builds/tests a playground + model test for a named need | Add a widget not requested by a unit |
| Independent verifier (N) | Re-derives every number/counterexample **without reading the writer's solution first**; checks spec checklist | Fix the lesson (reports defects; writer or a new unit fixes) |
| Source auditor | Replaces generic citations with claim-level anchors; logs unverifiable claims | Invent citations |

Writer and verifier of a unit must be different agents with fresh context.

## Work-unit protocol

1. Claim: add a line `CLAIMED <agent-id> <date>` next to the unit in `PILOT_BACKLOG.md` (or the course's backlog). One owner per unit; never edit a claimed unit.
2. Read: `AGENTS.md` → BASELINE/TASKS → `COURSE_STANDARD/WORK/PEDAGOGY/INTEGRITY/COMPONENTS` → the course repair contract section for the lesson → the exemplar lessons.
3. Write the lesson (and only files in its ownership list).
4. Self-check commands (narrowest): `python3 scripts/verify_lessons.py`, `python3 scripts/course_stats.py <course>`, `npm run test:course-integrity`, `npm run test:models` if models changed.
5. Produce an **evidence packet** (below) at `docs/refactor/packets/<course>/<lesson>.md`.
6. Hand to a verifier. Mark unit `REVIEW`; verifier marks `ACCEPTED` or `REJECTED` with defects. Only the integrator runs build/e2e/ux gates on batches.

### Evidence packet (keep < 1 page)
- Files changed.
- Outcome → where taught → where assessed (table).
- Every numeric/derived claim with independent recomputation (method + result).
- Counterexample(s) included and why they separate mechanisms.
- Explicit omissions and why.
- Sources added (claim → source/anchor).
- Executable evidence: what runs locally, what doesn't.
- Commands run + results; remaining doubts.

## File ownership
- Lesson: `src/content/lessons/<course>/<slug>.mdx` — writer of that unit.
- Shared (integrator only): `src/data/course-manifests/*`, `src/content/courses/*`, `src/data/course-quality.json`, `src/content/careers/*`, `src/components/**` (except playground files named in an engineer unit), `docs/curriculum/*`.
- Generated (nobody commits by hand): `dist/`, `reports/`, `test-results/`.

## Concurrency and Git
- Use one worktree/branch per writer (`refactor/<course>/<slug>`), integrator merges. Do not stage, commit, or push unless the unit says so; commit format `[Verb] Short description`.
- Do not run `check:e2e`/`check:ux`/`check:visual` concurrently on one checkout (shared `dist/`, ports, `reports/`).

## Anti-patterns (each was observed in this repo)
- Treating zero verifier errors as quality.
- Adding a Quiz/CaseStudy per lesson as a template rather than for a specific outcome.
- Exercises missing inputs; solutions never recomputed.
- Labs/protocols referencing fixtures or repos that don't exist.
- Generic landing-page citations.
- Adding breadth instead of depth; duplicating a topic across adjacent lessons.
- Writing prose that fills structure (see D-0004).

## Escalate to the owner when
- A unit requires deleting a lesson, changing the manifest order, or changing the path gates.
- A fixture/oracle for a lab can't be built inside the repo.
- Two verifiers disagree on a technical claim.
