# Known constraints

## Quality pipeline

- **Verified 2026-07-19:** Browser checks require Playwright Chromium. Run `npm run test:install` locally; CI installs Chromium with system dependencies. Source: [`docs/agent-rules/VALIDATION.md`](../agent-rules/VALIDATION.md).
- **Verified 2026-07-19:** Lighthouse runs on pushes to `main`, not pull requests, because it is the intentional exception to the required PR gate. Source: [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml).

## Content and rendering

- **Verified 2026-07-19:** Course smoke checks and strict integrity checks are distinct signals; neither certifies pedagogy. Source: [`docs/agent-rules/COURSE_INTEGRITY.md`](../agent-rules/COURSE_INTEGRITY.md).
- **Verified 2026-07-19:** PlantUML renders locally by default; remote rendering is opt-in with `LIBREUNI_PLANTUML_REMOTE=1`. Source: [`docs/agent-rules/PLANTUML.md`](../agent-rules/PLANTUML.md).
