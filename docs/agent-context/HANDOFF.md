# Active handoff

## Foundation-course refactor & UX polish (owner: repository owner; scope: branch `refactor_230826`)

- **Start at:** [`docs/refactor/README.md`](../refactor/README.md) and [`docs/agent-context/DECISIONS.md`](DECISIONS.md) (`D-0012`–`D-0018`).
- **Completed:**
  - Active 4-course catalog (`calculus-intro`: 12, `computer-architecture`: 20, `database-systems`: 20, `operating-systems`: 29 — 81 lessons total) with exact manifests and synced `src/data/course-quality.json`.
  - Platform UX & Component Architecture overhaul (`D-0012`–`D-0018`, `REV-01`–`REV-11` verified in `ISSUE_QUEUE.json`): 3-theme switcher (`modern`, `light`, `monochrome`), `software-engineer` career roadmap replacing `systems-foundations`, lesson `StudyToolsRail` (highlighter + Pomodoro), math/code/SQL/diagram zoom polish, and AI preview/issue workflow (`npm run ai:issues`, `npm run ai:preview`).
  - Full local release validation exited `0` (`npm run check:full` + `--project=visual`):
    - `npm run check:content`: theme token contract (3 themes), platform consistency linter (`81` lessons, `76` components), `check:contract` (`35` pass), figure tests (`2` pass), `verify_lessons.py` (`81` files, `0` errors/warnings), `test:course-integrity` (`0` findings under `--strict`), and `test:models` (`19` pass).
    - `npm run check:build`: `95` pages built, `81` active lessons validated, `4` course PDFs generated.
    - `npm run check:e2e`: `90` passed, `2` skipped (desktop skips of mobile-only tests).
    - `npm run check:ux`: `80` passed.
    - `npm run check:lighthouse`: exited `0`; `visual` capture project: `2` passed.
- **Remaining:** None blocking. Merge `refactor_230826` into `main` when ready.
- **Remove when:** `refactor_230826` is merged or superseded.
