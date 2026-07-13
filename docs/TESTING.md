# Testing And UX Pipeline

LibreUni has a production-style local pipeline for regressions, accessibility, and UX inspection. It builds every app, serves their `dist/` folders through the same static server used by tests, and writes reports under `reports/`.

## First-Time Setup

```bash
npm install
npm run test:install
```

`test:install` installs the Chromium browser Playwright uses locally. CI installs the same browser with system dependencies.

## Main Commands

```bash
npm test
```

Runs the full quality gate:

- `npm run test:build` builds `main`, `lang`, and `history`.
- `npm run test:e2e:run` runs desktop and mobile Playwright smoke tests.
- `npm run test:ux:run` creates the UX report and fails on hard UX blockers.
- `npm run test:lighthouse:run` runs Lighthouse CI budgets.

Useful narrower commands:

```bash
npm run test:e2e
npm run test:ux
npm run test:lighthouse
npm run test:visual
npm run test:report
```

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

The Lighthouse CI run writes reports to `reports/lighthouse` and enforces accessibility, core metadata, and conservative performance/best-practice budgets.

The visual capture test writes PNG files to `reports/visual/`. It is a review aid rather than a pixel-diff gate: agents must inspect its output when their work changes the interface.

## CI

The GitHub Actions workflow in `.github/workflows/quality.yml` runs `npm test` on pushes and pull requests, then uploads `reports/` and `test-results/` as artifacts even when a check fails.

## Adding Coverage

Add new high-value routes to:

- `tests/e2e/smoke.spec.mjs` for production smoke checks.
- `tests/e2e/accessibility.spec.mjs` for axe scans.
- `tests/ux/ux-report.spec.mjs` for visual/UX reports.
- `tests/visual/capture.spec.mjs` for representative screenshot coverage.
- `lighthouserc.cjs` for Lighthouse budgets.

Keep the route list small and representative. The goal is fast local signal, not crawling every lesson on every run.

## Theme and Appearance Testing Guidelines

When modifying theme-specific properties, color modes (Light, Dark, Auto), or interactive styling customizers, follow this validation protocol:

### 1. Verification Checklist for Hydration and Reloads
* **Initial Page Mount**: Validate that the initial client-side mount matches the server-rendered color mode. Verify there is no "flash of incorrect mode" or desync where the UI controls show "Light" while the actual elements render "Dark" (or vice versa).
* **Refresh Persistence**:
  1. Toggle to **Light** mode -> Refresh -> Verify mode remains Light.
  2. Toggle to **Dark** mode -> Refresh -> Verify mode remains Dark.
  3. Toggle to **Auto** mode -> Refresh -> Verify mode resolves to dark/light matching system preference (or time-of-day logic).
* **Cross-Theme CSS paste check**: Verify that the selector block copied from the customizer (`html[data-theme='...']`, `html.dark[data-theme='...']`) matches the target selector in `global.css` exactly, preventing variable bleeding between light and dark modes.

### 2. Automated Visual Audit
Run the visual regression suite to capture representative states under various width/mode parameters:
```bash
npm run test:visual
```
Inspect the output files in `reports/visual/` to ensure text readability, correct colors, and contrast compliance.
