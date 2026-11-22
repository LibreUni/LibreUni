# Known constraints

## Quality pipeline

- **Verified 2026-07-19:** Browser checks require Playwright Chromium. Run `npm run test:install` locally; CI installs Chromium with system dependencies. Source: [`docs/agent-rules/VALIDATION.md`](../agent-rules/VALIDATION.md).
- **Verified 2026-07-19:** Lighthouse runs on pushes to `main`, not pull requests, because it is the intentional exception to the required PR gate. Source: [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml).

## Content and rendering

- **Verified 2026-07-19:** Course smoke checks and strict integrity checks are distinct signals; neither certifies pedagogy. Source: [`docs/agent-rules/COURSE_INTEGRITY.md`](../agent-rules/COURSE_INTEGRITY.md).
- **Verified 2026-11-01:** PlantUML renders locally by default; remote rendering is opt-in with `LIBREUNI_PLANTUML_REMOTE=1`. Local rendering searches `LIBREUNI_PLANTUML_JAR`, `tools/plantuml.jar`, or standard system paths; CI pins and caches the PlantUML jar, diagram renders, and system dependencies (Java, Graphviz, LaTeX/dvisvgm). Sources: [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml), [`src/components/PlantUML.astro`](../../src/components/PlantUML.astro), [`docs/agent-rules/PLANTUML.md`](../agent-rules/PLANTUML.md).
