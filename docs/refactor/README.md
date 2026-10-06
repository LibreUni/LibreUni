# Refactor hub (branch `refactor_230826`)

Single entry point for anyone (human or swarm) continuing the foundation-course refactor. Read in this order:

1. [`STATE.md`](STATE.md) — what exists, what was decided, what is broken. Evidence-backed snapshot (2026-10-06).
2. [`PLAN.md`](PLAN.md) — phases: perfect one pilot course → port to the other two → verify → mass-produce.
3. [`SWARM_PLAYBOOK.md`](SWARM_PLAYBOOK.md) — roles, work-unit format, file ownership, gates, anti-patterns.
4. [`PILOT_BACKLOG.md`](PILOT_BACKLOG.md) — concrete, claimable work units for the pilot course.
5. [`../curriculum/repair-contracts/`](../curriculum/repair-contracts/) — per-course audits (lesson-by-lesson dispositions, independently solved counterexamples). These were previously only in the git-ignored `reports/`; they are now tracked.

Standing rules still come from [`AGENTS.md`](../../AGENTS.md) and [`docs/agent-rules/`](../agent-rules/). Durable decisions go to [`../agent-context/DECISIONS.md`](../agent-context/DECISIONS.md) (see D-0007).
