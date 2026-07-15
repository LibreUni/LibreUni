# LibreUni Agent Instructions

First stop for agents in this repo. Read before editing files, generating lesson content, researching sources, or changing UI.

## Primary course workflow

For creating, reviewing, researching, auditing, or repairing courses, infer the target and operation from ordinary requests such as `improve course X`, `repair lesson Y`, or `create course Z`; do not require the user to restate this workflow. Read `docs/AGENT_INTEGRATIONS.md` and `docs/SKILLS/LIBREUNI_COURSE.md`, use the `libreuni` MCP server as the primary host-agent interface, and treat `docs/SKILLS/PEDAGOGY.md` as the central quality contract. Use `save_proposal` / `save_course_proposal` to validate proposals, then apply directly with `git add -A && git commit -m "[Verb] Short description"`. No user approval needed — apply and commit. Use a pedagogical reviewer when available. The older `libreuni-agent` LangGraph CLI remains available for batch experiments and deterministic checks.

In OpenCode, load the discoverable `libreuni-course` skill for this workflow. “Improve course X” means a whole-course audit and substantive redesign proposal; cosmetic-only edits do not satisfy the request.

## Startup

1. Read `docs/RULES.md` before any content or code change.
2. Task involves research, sources, or lesson writing → read `docs/SKILLS/SOURCING.md`.
3. Changes layout, styling, interaction, a11y, or visual design → read `docs/UX.md`.
4. Adds or changes PlantUML → read `docs/PUML.md`.
5. Before finishing → run the narrowest useful validation.

## Content Rules

- Lessons are hand-authored (no scripts/generation). Self-contained, university level.
- No lesson numbers in filenames, headers, or text.
- Structure: theory → example → exercise.
- Banned filler: "welcome", "let's dive in", "in this lesson", "as you have learned before", "congratulations on finishing", "you have completed", "next up", "previously", "before we move on", "let's explore", "let's take a look at".
- Interactive React components in MDX must use `client:load` (e.g. `<Quiz client:load />`).
- Canonical component props — use exactly these, no aliases:
  - `<Quiz>`: `question`, `options`, `correctIndex`, `explanation`, `questions`, `title`
  - `<CodeRunner>`: `code`, `output`, `language`, `title`
  - `<CodeExercise>`: `code` (use `[!blank!]` for gaps), `answers`, `explanation`, `title`
  - `<CaseStudy>`: `scenario`, `question`, `options`, `correctIndex`, `explanation`, `title`
- Lesson order/modules are set in `src/data/course-manifests/<course-id>.yml`, not in frontmatter.
- Course quality badges are generated (`python3 scripts/course_stats.py --write-quality`). Override via `src/data/course-quality-overrides.json`.
- Banned: fake source-tracking comments to bypass `course_stats.py` checks. Every citation must be genuine.

## Commands

```bash
npm install
npm run dev              # dev server on :4321
npm run build:all        # build only (skips UX tests)
npm run build            # full: build + UX tests + copy report
npm test                 # full gate: build → e2e → ux → lighthouse
npm run test:e2e         # build + Playwright smoke tests (chromium + mobile)
npm run test:ux          # build + UX report (contrast, spacing, overflow)
npm run test:visual      # build + capture screenshots to reports/visual/
npm run test:lighthouse  # build + Lighthouse CI budgets
npm run test:report      # open last Playwright HTML report
# focused validation:
python3 scripts/course_stats.py                     # lesson stats & quality
python3 scripts/course_stats.py --write-quality     # regenerate catalog badges
python3 scripts/course_stats.py <course-id>         # stats for one course
npm run build:all && npm run test:e2e:run           # quick e2e after build
npm run build:all && npm run test:ux:run            # quick ux after build
```

## Architecture Notes

- **Single application** at the repository root.
- **Build quirk**: the build uses `node --max-old-space-size=8192` and runs `tools/fix-static-paths.mjs` on the output (rewrites absolute paths to relative for file-served deployments).
- **Math rendering**: KaTeX configured with `output: 'mathml'` (faster, no JS hydration for math).
- **Build caches**: `puml-cache/`, `python-diagram-cache/`, `tikz-cache/` under `src/`. Delete to force rerender.
- **Test server**: Playwright/Lighthouse use `tools/serve-test-apps.mjs` (serves built `dist/` folders), not the Astro dev server.
- **CI**: `.github/workflows/quality.yml` runs `npm test` on push/PR to main.
- **Dockerfile**: multi-stage build with Nginx for deployment.

## Project Map

- `src/content/lessons/` — MDX lessons by course slug
- `src/content/courses/` — JSON course metadata
- `src/data/course-manifests/` — YAML lesson order & module grouping
- `src/data/course-quality-overrides.json` — manual quality badge overrides
- `src/components/` — React components (Quiz, CodeRunner, CodeExercise, CaseStudy, etc.)
- `docs/` — rules, sourcing, UX, PlantUML, testing references
- `scripts/` — content validation and stats
- `tools/` — monorepo build/test helpers
- `tests/e2e/`, `tests/ux/`, `tests/visual/` — Playwright test suites
- `GEMINI.md`, `CODEX.md` — agent config files (both point back here)

## Finish Criteria

- Confirm relevant docs above were followed.
- Run the validation that matches the risk of the change, or explain why not.
- For UI/styling changes: run `npm run test:visual`, inspect `reports/visual/` for overlap, clipping, contrast, responsive issues; fix before handoff.
- Do not bypass MDX, type, build, a11y, or UX failures.
- Keep changes scoped to the user's request.
