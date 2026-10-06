# Mathematics strategy: add a fourth course?

## Your observation
The trio is systems-heavy (hardware, kernel, data). Database Systems already assumes "sets, predicates, relations, implication, simple proofs, asymptotics, basic probability" (`docs/curriculum/DATABASE_SYSTEMS.md`), and Architecture assumes Boolean algebra and elementary probability — with no course in the active catalog that teaches them. The gap is real, not just you.

## What history holds
Before the purge (`aaee234^`) there was a `math` lessons directory (93 files; modules from logic/proof/induction through sets, cardinality, number theory, up to category theory and homological algebra), a 10-lesson `math-stats`, and manifests for `math`, `math-algebra`, `math-calculus`, `math-stats`. The earlier audit also judged Discrete Mathematics "not yet persuasive evidence of a 10-ECTS foundation" and Probability & Statistics had a broken Bayesian example. Their lessons are **not** in `archive/` (only 7 other retired courses are); recover with `git show aaee234^:<path>`.

## Recommendation (needs your approval)
Add **one** course, not a math curriculum: **Discrete Mathematics & Proof for Computing**, as course 1 of the path, ahead of the trio.

Scope (taught as transfer skills, each with solved counterexamples): propositional/predicate logic, proof techniques and induction, sets/relations/functions (including relational algebra links), counting and recurrences, graphs, modular arithmetic, and discrete probability (expectation, independence, Bayes — enough for hashing, caching, queuing, and DB selectivity). Explicitly omit: category theory, homological algebra, Gödel, analysis/calculus, linear algebra (a later course if ML is ever re-entered).

Why this and not more: it supplies every prerequisite the three courses currently only assume, and uses the same mechanics as the trio (it is the cheapest course to verify because every claim is checkable). Calculus/linear algebra don't unblock the trio.

## Strategy
1. **Do not restore wholesale.** Mine the old `math` lessons for source material (logic, proof, induction, sets, number-theory basics, counting) and rewrite against the current standard.
2. **Sequence:** don't start until OS pilot Phase 1 exemplars are approved. The math course is a good *second* swarm track because it is independent of OS files; run it in parallel as a Phase-4 port test, or as the first "new course from scratch" test of the extracted pattern (Phase 3 gate).
3. **Before writing:** produce its repair-contract-style spec: outcomes → lessons → assessments → what trio lessons rely on it (back-reference table; the trio's "required preparation" should link to it).
4. **Wire-up (integrator, owner approval):** new manifest, course JSON, curriculum note, crosswalk row, path gate in `systems-foundations.json`; check `D-0006` (rename the path or scope: "three reference courses" becomes four).
5. **Size:** target ~20 lessons, same as the others. Quality over breadth.

## Decision needed
Approve the fourth course as described (and its name), or defer it until after the OS pilot is accepted. Recording it: add D-0008 once you decide.

## Update 2026-10-06: calculus is coming back
The owner chose to recover calculus (interactive-diagram pattern). Staged at `archive/curriculum/2026-10-06-calculus-recovery/`; plan in [`CALCULUS_RECOVERY.md`](CALCULUS_RECOVERY.md). This makes the math layer potentially two courses (Discrete Mathematics & Proof, Calculus); decide whether D-0006 grows to five courses or math becomes a separate "foundations" path. Discrete Math remains the stronger prerequisite for the trio.

Scope settled: **Introduction to Calculus** (Calculus 1 level, ~7–8 lessons); see `CALCULUS_RECOVERY.md` §Scope.
