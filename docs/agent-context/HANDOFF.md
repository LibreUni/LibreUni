# Active handoff

## Foundation-course refactor & pre-merge readiness (owner: repository owner; scope: branch `refactor_230826`)

- **Start at:** [`docs/agent-context/DECISIONS.md`](DECISIONS.md) (`D-0010`, `D-0012`–`D-0018`) and [`docs/curriculum/COURSE_CROSSWALK.md`](../curriculum/COURSE_CROSSWALK.md).
- **Completed:**
  - Active 4-course catalog (`calculus-intro`: 12, `computer-architecture`: 20, `database-systems`: 20, `operating-systems`: 29 — 81 lessons total) with exact manifests and synced `src/data/course-quality.json`.
  - Platform UX & Component Architecture overhaul (`D-0012`–`D-0018`, `REV-01`–`REV-11` verified in `ISSUE_QUEUE.json`): 2-theme switcher (`modern`, `monochrome`) across `light`/`dark`/`auto` modes, `software-engineer` career roadmap replacing `systems-foundations`, lesson `StudyToolsRail` (highlighter + Pomodoro), math/code/SQL/diagram zoom polish, custom `/404.html` page, and AI preview/issue workflow (`npm run ai:issues`, `npm run ai:preview`).
  - Pre-merge policy resolution complete: removed `archive/`, `docs/refactor/`, and `docs/curriculum/repair-contracts/` (recoverable from Git history); sanitized `plugins/libreuni-work/`; wired `/development/ux` serving for dev/preview/Docker builds; accepted `D-0010`; downgraded `LINT-04` to warning; resolved `D-0005`/`D-0012` (`Quiz` `"I don't know"` + always-unlocked Verify); migrated residual `D-0017` SQL fixtures (`service_pool`/`S101`–`S301`) and copy; pruned the 17 unused playground `.tsx` files.
- **Remaining:** Run the full release gate (`npm run check:required` or `npm run check:full`) and visual check (`npm run test:visual`) before merging `refactor_230826` into `main`.
- **Remove when:** `refactor_230826` is merged or superseded.
