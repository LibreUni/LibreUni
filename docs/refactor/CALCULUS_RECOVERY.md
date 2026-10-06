# Calculus recovery

Decision (owner, 2026-10-06): bring calculus back. Its interactive diagrams are to serve as a pattern for other courses.

## What the history actually contains
Source commit `aaee234^`, staged at [`archive/curriculum/2026-10-06-calculus-recovery/`](../../archive/curriculum/2026-10-06-calculus-recovery/README.md) (22 lessons, manifest, course JSON; not loaded by Astro).

- Manifest modules: single-variable (limits, derivatives, MVT, integration, FTC, applications) · series (sequences-series, taylor-series) · multivariable (multivariable, optimization, multiple-integration, vector-fields, Stokes, differential forms) · ODE/models (differential-equations, systems-odes, Laplace, PDEs) · analysis (complex, Fourier, functional, variational).
- Lesson length 123–239 lines. **Interactivity is narrower than remembered:** only six lessons have a playground — `limits` (EpsilonDelta), `derivatives` (Tangent), `integration` (Riemann), `multivariable` (Surface), `vector-fields` (VectorField), `fourier-analysis` (Fourier). The other 16 have a quiz and, for ~10, a TikZ/PythonDiagram figure.
- All six playground components still exist in `src/components/playgrounds/` (each ~15 lines) on the shared `InteractivePlayground` shell + `plot.tsx`.
- An earlier audit rated the Mathematical Foundations / Discrete Math sources as under-deep and Probability & Statistics had a broken Bayesian example. No quality audit of this calculus text was done; treat it as a draft.

## What the pattern is (worth copying)
Read `TangentPlayground.tsx`: one slider (`aria-label`), an SVG plot that redraws, a `status` string, **and a static twin** (`staticContent`/`staticCaption`) so book/PDF export carries the same figure at a fixed parameter. Each playground tests one claim ("secant limit → tangent", ε–δ window, Riemann refinement). That meets D-0005 (named lesson-specific playgrounds, accessible controls, static book representation).

Caveats before copying it everywhere:
- Sliders on a fixed function are *exploration*, not assessment. D-0005 still requires predict-then-reveal or counterexample tasks; a playground should pose a question the learner answers before moving the slider.
- Each playground needs a model/behaviour test (as for OS/DB `*.mjs` models), not just rendering.
- Don't add one per lesson as a template (observed failure mode).

## Scope (owner decided 2026-10-06): **Introduction to Calculus** (Calculus 1 level)

Single-variable only; narrow on purpose. Working title "Introduction to Calculus" (slug `calculus-intro`, to be confirmed at wiring).

| Unit | Source lesson | Playground | Notes |
|---|---|---|---|
| CAL-01 | limits | EpsilonDelta | keep ε–δ rigor but add intuition-first path |
| CAL-02 | derivatives | Tangent | add rules, linearization, error of linear approximation |
| CAL-03 | mean-value-theorem | none yet | candidate for a new MVT/Rolle visual |
| CAL-04 | integration | Riemann | |
| CAL-05 | fundamental-theorem | none yet | candidate: accumulation-function visual |
| CAL-06 | applications-integration | none | review for scope; add optimization/related-rates if absent (verify in source) |
| CAL-07 | taylor-series | none yet | **bridge lesson**, kept for approximation/error analysis used in computing; owner may drop it (it is Calc 2 territory and needs sequences/series convergence basics, which are deferred) |

Deferred (stay staged, not deleted): sequences-series, multivariable, optimization, multiple-integration, vector-fields, Stokes, differential forms, all ODE/PDE/Laplace, complex/Fourier/functional/variational analysis. Their playgrounds (Surface, VectorField, Fourier) remain in `src/components/playgrounds/` unused by active courses — leave them until a later multivariable course; do not delete.

Verify before writing: that `applications-integration` actually covers applications of the derivative (optimization, related rates, L'Hôpital) — the staged manifest has no lesson on derivative applications, which a Calculus 1 course normally needs. If missing, add unit `CAL-NEW1` for derivative applications (optimization, curve sketching, Newton's method as the computing link). This is the most likely content gap.

## Work plan
1. Phase 0 (integrator): confirm lesson table and course slug; confirm placement. Calculus is independent of the OS pilot, so it can run as a **parallel swarm track** after OS exemplars exist (or as the Phase 3 "new course from the pattern" test).
2. Spec: outcomes → lessons → assessment ceilings; prerequisites on Discrete Math (`MATH_STRATEGY.md`). Calculus does not block the trio; decide whether it sits in the same path or a separate "Mathematical foundations" path.
3. Per lesson (writer + independent verifier, per playbook): audit against current standard (COURSE_STANDARD, INTEGRITY, COMPONENTS); recompute every derivation/numeric; fix filler (D-0004); add solved exercises; keep or rebuild the playground with a prediction prompt and a model test; claim-level sources (e.g. OpenStax Calculus, MIT 18.01/18.02, Spivak/Apostol for rigor).
4. Wiring (integrator only, after owner approval): move accepted lessons from the staging dir to `src/content/lessons/<course-slug>/`, fix imports (`../../../components` depth is the same if placed one level under `lessons/`), add manifest, course JSON, curriculum note, crosswalk row, `course-quality.json`.
5. Gates: `check:content`, `check:build`, `check:e2e`, `check:ux`, visual inspection of every playground in both themes, PDF book check.
6. Extract the playground pattern into `docs/agent-rules/COURSE_COMPONENTS.md` once ≥2 other courses use it successfully.

## Units (draft; fill after option choice)
`CAL-S0` spec · `CAL-01…07` per table above (+ `CAL-NEW1` derivative applications if needed) · `CAL-E1…E6` playground model tests (EpsilonDelta, Tangent, Riemann, Surface, VectorField, Fourier) · `CAL-S1` sources · `CAL-S2` wiring.
