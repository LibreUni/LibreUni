# Active handoff

## Foundation-course refactor (owner: repository owner; scope: branch `refactor_230826`)

- **Start at:** [`docs/refactor/README.md`](../refactor/README.md).
- **Completed:**
  - Active 4-course survivor catalog (`calculus-intro`, `computer-architecture`, `operating-systems`, `database-systems` — 75 lessons total) with exact manifests and synced `src/data/course-quality.json`.
  - Platform UX & Component Architecture overhaul (D-0012): removed exam-reveal anti-features; implemented 3-tier card design system, modern theme default, AST linter (`scripts/lint_platform_consistency.mjs`), remark lesson structure plugin, and standardized interactive components (`ExerciseSolution`, `Quiz`, `CaseStudy`, `CodeExercise`, `CodeRunner`, `SqlRunner`, `MathStatement`, `MathProof`).
  - All 75 MDX lessons migrated to 100% compliance with zero raw `<details>`, zero duplicate H1s, and clean import structures.
  - Track E executable OS lab models (`src/lib/osLabModels.mjs`), pinned `fixtures/xv6-riscv/` reference anchors (`7d7adbb1b0acbd67c9766a20d0f9900fef2789fa`), and automated model tests across all shipped playgrounds (`npm run test:models`).
  - All 75 lessons pass `python3 scripts/course_integrity.py --strict` with **0 findings** (0 blocking, 0 non-blocking) and `python3 scripts/audit_lesson_pedagogy.py` with **75/75 passing** and **0 defects**.
  - All named quality gates pass: `npm run check:content`, `npm run check:build` (with 4 generated course PDFs), `npm run check:e2e` (62 Playwright tests green with 0 axe violations), and `npm run check:ux` (29 Playwright UX tests green).
  - Worktree and branch hygiene restored (stale `swarm/*` worktrees/branches, `backup.txt`, `apps/`, `.venv311`, and world-writable permissions cleaned up).
- **Remaining:** None blocking. Optional Lighthouse release audit (`npm run check:lighthouse`) or merge of `refactor_230826`.
- **Remove when:** `refactor_230826` is merged or superseded.
