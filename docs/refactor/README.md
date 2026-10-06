# Refactor hub (branch `refactor_230826`)

Single entry point for anyone (human or swarm) continuing the foundation-course refactor. Read in this order:

1. [`STATE.md`](STATE.md) — what exists, what was decided, what is broken. Evidence-backed snapshot (2026-10-06).
2. [`PLAN.md`](PLAN.md) — phases: perfect one pilot course → port to the other two → verify → mass-produce.
3. [`SWARM_PLAYBOOK.md`](SWARM_PLAYBOOK.md) — roles, work-unit format, file ownership, gates, anti-patterns.
4. [`PILOT_BACKLOG.md`](PILOT_BACKLOG.md) — claimable work units for the OS pilot; [`PORT_BACKLOG_ARCHITECTURE.md`](PORT_BACKLOG_ARCHITECTURE.md) for phase 4.
5. [`MATH_STRATEGY.md`](MATH_STRATEGY.md) — whether and how to add a mathematical foundation course.
6. [`CALCULUS_RECOVERY.md`](CALCULUS_RECOVERY.md) — recovered calculus staging and interactive-diagram pattern.
7. [`SWARM_SETUP.md`](SWARM_SETUP.md) — how to actually run the swarm with OpenRouter.
8. [`../curriculum/repair-contracts/`](../curriculum/repair-contracts/) — per-course audits (lesson-by-lesson dispositions, independently solved counterexamples). These were previously only in the git-ignored `reports/`; they are now tracked.

Standing rules still come from [`AGENTS.md`](../../AGENTS.md) and [`docs/agent-rules/`](../agent-rules/). Durable decisions go to [`../agent-context/DECISIONS.md`](../agent-context/DECISIONS.md) (see D-0007).
