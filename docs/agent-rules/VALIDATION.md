# Testing And UX Pipeline

LibreUni has a production-style local pipeline for regressions, accessibility, and UX inspection. It builds the production site, serves `dist/` through the same static server used by tests, and writes reports under `reports/`.

## First-Time Setup

```bash
npm install
npm run test:install
```

`test:install` installs the Chromium browser Playwright uses locally and downloads/verifies `tools/plantuml.jar`. CI installs the same browser with system dependencies.

## Main Commands

```bash
npm run check:required
```

Runs the required pull-request and push gate:

- `npm run check:content` first verifies the router/package/CI contract, then runs lesson structure, course smoke, integrity unit, PlantUML diagnostics, and strict course-integrity checks.
- `npm run test:models`, included in the content gate, runs the architecture, OS, and database model regressions against the implementations used by their playgrounds.
- Active-course validators cover every manifest lesson's authoring and rendered output. Retired source under `archive/curriculum/` is not an active collection. The former data-structures component-count quotas are retired with that course; actual rendering and model behavior, not artifact counts, are release evidence.
- The contract check treats each course manifest as an exact ordered index: missing targets, duplicate slugs, and unlisted lesson files fail instead of silently falling into an `Overview` module. Adopted curriculum workloads may add a source-backed sum assertion.
- `npm run check:build` builds the production site and validates rendered lessons, course visuals, and PDFs.
- `npm run check:e2e` runs desktop and mobile Playwright smoke and accessibility checks.
- `npm run check:ux` creates the UX report and fails on hard UX blockers.

Use the complete local release gate before handoff when the change warrants it:

```bash
npm test
# Alias: npm run check:full
```

`check:full` runs `check:required` and Lighthouse. Lighthouse is intentionally a main-branch-only CI check; this is the only difference between the required PR gate and the local full gate.

Useful narrower commands:

```bash
npm run check:content
npm run check:build
npm run check:e2e
npm run check:ux
npm run check:lighthouse
npm run check:visual
npm run figures:preview
npm run test:report
```

### Mathematical Figure & Page Kind Validation

Mathematical figures and page contracts are verified on every test run:

- **Mathematical figure checks (`node --test tests/figures.test.mjs`, part of `check:content`):**
  - **A1:** Every figure spec defines accessible `alt` text (≥ 40 chars), non-empty `caption` whose KaTeX expressions compile cleanly, and valid curve definitions.
  - **A2:** Every plotted curve achieves ≥ 95% finite sample points across its interval while respecting exclusions at discontinuities/asymptotes.
  - **A3:** Analytic derivatives `curve.d` agree with central-difference numerical derivatives across the domain.
  - **A6:** Cartesian axes render the vertical axis line (`lu-fig-axis-y`) when zero lies within the x-domain.
  - **A7:** Fill order: Darboux sums and shaded area regions (`lu-fig-fills`) render underneath plotted curves (`lu-fig-curves`) in SVG z-order.
  - **A8:** Custom domain assertions in `spec.checks` all evaluate to `true`.
  - **A9:** Every `<Figure id>` reference in MDX resolves to an existing spec in the same course, and every spec is used.
  - **A10:** Rendered SVG text elements have no overlapping/colliding bounding boxes.
- **Figure preview contact sheets (`npm run figures:preview`):**
  - Generates standalone SVGs and contact sheet in `reports/figures/index.html`.
- **Platform consistency lint rules (`scripts/lint_platform_consistency.mjs` & `scripts/lint_extended.mjs`):**
  - `LINT-00`: Validates frontmatter by page `kind` (`lesson`, `lab`, `problems`, `recap`, `practice`).
  - `LINT-08`: Forbids hardcoded `number=` attributes on `<Exercise>`, `<Problem>`, and `<Figure>`.
  - `LINT-09`: Forbids fragile function plots in `<TikZ>` using `plot`, `controls`, or coordinate curves (both `code={...}` and children syntaxes).
  - `LINT-10`: Enforces that `<MathStatement>` is declared solely on `lesson` and `lab` pages.
  - `LINT-11`: Enforces bidirectional figure resolution (no missing specs, no orphaned specs).
  - `LINT-16`: Enforces GFM Markdown table column parity (excluding empty top-left corner cell in matrix tables), balanced cell `$` / backtick delimiters, and bans unescaped `|` inside table math (requiring `\lvert ... \rvert` or `\mid`).
  - `LINT-17`: Validates inline math delimiter parity, rejects `\(...\)` / `\[...\]` and raw TeX commands outside math, validates KaTeX strictly across JSX component props and frontmatter, and catches unescaped backslashes in JS string math props.
  - `LINT-18`: Enforces `[!blank!]`-to-`answers` arity parity across `<FillInExercise>` and `<CodeExercise>` and forbids splitting math expressions across `[!blank!]`.
  - `LINT-19`: Enforces D-0017 open digital learning terminology across MDX content (forbids classroom/university trope terms outside fenced code and MDX comments).
  - `LINT-20`: Requires `<ExerciseSet>` on `lesson`/`lab` pages and forbids list-splitting patterns inside JSX props.
  - `SITE-01` / `SITE-02`: Validates course metadata categories and site navigation consistency across content and pages.
  - `UI-LINT-01`–`UI-LINT-05`: Enforces explicit `<button type="...">`, safe `.innerHTML` escaping, WCAG/dark-mode Tailwind & SVG contrast classes, base-path-safe pathname parsing without JSX backticks or conflicting muted toggle classes, and `<InteractivePlayground onReset=...>` wrapping across TSX playgrounds.

- **Rendered lesson validator (`scripts/validate-rendered-lessons.mjs`, part of `check:build`):**
  - Verifies `.katex-error` absence, HTML table cell parity and clean cell rendering, `<template data-math-preview>` and visible prose freedom from leaked TeX commands/backticks, zero `#...html` mangled hrefs, and resolvable local file targets + `#id` anchors on `<Ref>` links and serialized `<astro-island>` blank-to-answer arity.

- **Local Playwright CPU cap (`playwright.config.mjs`):**
  - Caps local Chromium worker concurrency to at most `min(2, floor(cpus / 4))` (`>= 1`; configurable downward via `PLAYWRIGHT_WORKERS`, and `2` on CI) so local E2E/UX runs do not saturate host CPU cores.

The course integrity audit is intentionally separate from `course_stats.py`. Smoke tests answer “is the content mechanically valid?”; integrity checks answer “does the source show signs of padding, duplication, generic artifacts, or uncovered structured sections?” Neither command certifies pedagogical quality. A strict integrity failure must be investigated rather than bypassed by changing thresholds or adding placeholder text.

`test:report` opens the Playwright HTML report from the last run.

`test:visual` builds the app and captures representative interface states under `reports/visual/`. It covers the course catalog at desktop and mobile widths, a course overview, and a lesson across the available theme modes. Run it for every layout, styling, theme, interaction, or accessibility change; inspect the generated images for overlap, clipping, contrast, and responsive failures before handoff.

## What Gets Checked

The Playwright smoke tests verify that key routes render from production builds, browser console/page errors are surfaced, the main course filter works, and mobile navigation opens.

The axe tests scan key pages against WCAG A/AA tags and fail on serious or critical accessibility violations. Full axe details are attached to the Playwright report.

The custom UX audit writes `reports/ux/index.html` plus per-page JSON. It checks:

- Normal WCAG contrast and APCA readability estimates.
- Simulated protanopia, deuteranopia, tritanopia, and achromatopsia contrast risks.
- Interactive target sizes using WCAG 2.2's 24 px minimum and a 44 px recommendation.
- Gaps and overlaps between visible interactive elements.
- Horizontal overflow on desktop and mobile viewports.
- Visible heading sanity checks.

The Lighthouse audit writes reports to `reports/lighthouse` and enforces accessibility, core metadata, and conservative performance/best-practice budgets.

The visual capture test writes PNG files to `reports/visual/`. It is a review aid rather than a pixel-diff gate: agents must inspect its output when their work changes the interface.

## CI

The GitHub Actions workflow in `.github/workflows/quality.yml` invokes the same named `check:content`, `check:build`, `check:e2e`, and `check:ux` layers on pushes and pull requests. It runs `check:lighthouse` only on pushes to `main`, then uploads `reports/` and `test-results/` even when a check fails. This command-level parity is intentional: CI shows each layer separately while preserving the local `check:required` and `check:full` contracts.

## Adding Coverage

Add new high-value routes to:

- `tests/e2e/smoke.spec.mjs` for production smoke checks.
- `tests/e2e/accessibility.spec.mjs` for axe scans.
- `tests/ux/ux-report.spec.mjs` for visual/UX reports.
- `tests/visual/capture.spec.mjs` for representative screenshot coverage.
- `lighthouserc.cjs` for Lighthouse budgets.

Keep the route list small and representative. The goal is fast local signal, not crawling every lesson on every run.

## Theme and Appearance Testing Guidelines

When modifying theme-specific properties, themes (`modern`, `monochrome`), or color modes (`light`, `dark`, `auto`), follow this validation protocol:

### 1. Verification Checklist for Hydration and Reloads
* **Initial Page Mount**: Validate that the initial client-side mount matches the server-rendered theme and color mode. Verify there is no "flash of incorrect mode" or desync where the UI controls show "Light" while the actual elements render "Dark" (or vice versa).
* **Refresh Persistence**:
  1. Toggle to **Light** mode -> Refresh -> Verify mode remains Light.
  2. Toggle to **Dark** mode -> Refresh -> Verify mode remains Dark.
  3. Toggle to **Auto** mode -> Refresh -> Verify mode resolves to dark/light matching system preference (`prefers-color-scheme`).
* **Cross-Theme Token Parity**: Verify that `html[data-theme='...']` and `html.dark[data-theme='...']` selectors in `global.css` override variables consistently across light and dark modes without variable bleeding, and confirm `DevThemer` overrides match those CSS tokens when debugging on `/development`.

### 2. Automated Visual Audit
Run the visual regression suite to capture representative states under various width/mode parameters:
```bash
npm run test:visual
```
Inspect the output files in `reports/visual/` to ensure text readability, correct colors, and contrast compliance.
