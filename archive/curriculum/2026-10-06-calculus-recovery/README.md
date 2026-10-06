# Calculus recovery staging (2026-10-06)

Source: commit `aaee234^` (`src/content/lessons/math/*`, `math-calculus` manifest and course JSON), 22 lessons. Staged here, **not published**: Astro and checks do not load `archive/`. Frontmatter and imports are unchanged (relative `../../../components` imports, so these files are not independently buildable here).

Reusable assets that still exist in `src/components/playgrounds/`: `EpsilonDelta`, `Tangent`, `Riemann`, `Surface`, `VectorField`, `Fourier` playgrounds (shared `InteractivePlayground` shell + `plot.tsx`).

Per the archive rule, do not restore wholesale: review each lesson against the current standard, then move it back with manifest and quality metadata. See `docs/refactor/CALCULUS_RECOVERY.md`.
