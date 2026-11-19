# Active handoff

## Foundation-course refactor & pre-merge readiness (owner: repository owner; scope: branch `refactor_230826`)

- **Start at:** [`docs/refactor/README.md`](../refactor/README.md) and [`docs/agent-context/DECISIONS.md`](DECISIONS.md) (`D-0012`–`D-0018`).
- **Completed:**
  - Active 4-course catalog (`calculus-intro`: 12, `computer-architecture`: 20, `database-systems`: 20, `operating-systems`: 29 — 81 lessons total) with exact manifests and synced `src/data/course-quality.json`.
  - Platform UX & Component Architecture overhaul (`D-0012`–`D-0018`, `REV-01`–`REV-11` verified in `ISSUE_QUEUE.json`): 2-theme switcher (`modern`, `monochrome`) across `light`/`dark`/`auto` modes, `software-engineer` career roadmap replacing `systems-foundations`, lesson `StudyToolsRail` (highlighter + Pomodoro), math/code/SQL/diagram zoom polish, custom `/404.html` page, and AI preview/issue workflow (`npm run ai:issues`, `npm run ai:preview`).
  - Full local release validation exited `0` (`npm run check:full` + `npm run test:visual`):
    - `npm run check:content`: theme token contract (`2` themes, `4` theme-mode blocks), platform consistency linter (`81` lessons, `76` components), extended audit (`81` MDX lessons, `92` UI source files), `check:contract` (`56` pass), figure tests (`2` pass), `verify_lessons.py` (`81` files, `0` errors/warnings), `test:course-integrity` (`23` unit + `2` PlantUML diagnostics + `0` findings under `--strict`), and `test:models` (OS models + `28` pass).
    - `npm run check:build`: `96` pages built, `81` active lessons validated, `4` course authoring suites passed, `4` course PDFs generated.
    - `npm run check:e2e`: `120` passed, `2` skipped (desktop skips of mobile-only tests).
    - `npm run check:ux`: `88` passed.
    - `npm run check:lighthouse`: exited `0`; `test:visual` capture project: `2` passed.
- **Remaining:** Owner review of open policy decisions before merging `refactor_230826` into `main`.
- **Remove when:** `refactor_230826` is merged or superseded.
