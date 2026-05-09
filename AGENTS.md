# LibreUni Agent Instructions

This file is the first stop for AI agents working in this repository. Read it before editing files, generating lesson content, researching sources, or changing UI.

## Mandatory Startup Checklist

1. Read `docs/RULES.md` before making any content or code change.
2. If the task involves research, sources, explanations, new concepts, or lesson writing, read and follow `docs/SKILLS/SOURCING.md` before drafting.
3. If the task changes layout, styling, interaction, accessibility, or visual design, read `docs/UX.md`.
4. If the task adds or changes PlantUML, read `docs/PUML.md`.
5. Before finishing, run the narrowest useful validation. For broad changes, use the commands in `docs/TESTING.md`.

## Non-Negotiable Content Rules

- Lessons are hand-authored. Do not generate lessons with scripts.
- Lessons must be self-contained and university level.
- Do not use lesson numbers in filenames, headers, or lesson text.
- Use the theory -> example -> exercise structure.
- Keep lesson prose direct and rigorous. Avoid banned filler phrases listed in `docs/RULES.md`, including "welcome", "let's dive in", and "in this lesson".
- Use interactive components when they add real learning value.
- In Astro/MDX, interactive React components must use `client:load`.
- Use canonical component props exactly as defined in `docs/RULES.md`.
- Cite and track sources according to `docs/SKILLS/SOURCING.md`.

## Project Map

- `apps/main/` - main Astro application and lesson content.
- `apps/main/src/content/lessons/` - MDX lessons by course slug.
- `apps/main/src/content/courses/` - course metadata.
- `apps/main/src/components/` - React components used by lessons and pages.
- `apps/lang/` - language-focused static app.
- `apps/history/` - history-focused static app.
- `docs/` - rules, sourcing instructions, UX, PlantUML, and testing references.
- `scripts/` - content and maintenance utilities.
- `tools/` - shared monorepo helpers.

## Common Commands

```bash
npm install
npm run dev
npm run build
npm run build:all
python3 scripts/course_stats.py
npm test
```

Use narrower commands when appropriate:

```bash
npm run build:main
npm run build:lang
npm run build:history
npm run test:e2e
npm run test:ux
npm run test:lighthouse
```

## Finish Criteria

Before handing work back:

- Confirm that the relevant docs above were followed.
- Run the validation that matches the risk of the change, or explicitly explain why it was not run.
- Do not bypass MDX, type, build, accessibility, or UX failures.
- Keep changes scoped to the user's request.
