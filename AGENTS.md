# LibreUni agent router

This is the repository entrypoint for every coding host. Codex, OpenCode, Gemini, Antigravity, Copilot, and human contributors follow the same workflow. Host adapters must point here and must not add competing policy.

## Every task

1. Read [`docs/agent-rules/BASELINE.md`](docs/agent-rules/BASELINE.md).
2. Use [`docs/agent-rules/TASKS.md`](docs/agent-rules/TASKS.md) to read the task pack for every affected surface.
3. Inspect the relevant files and existing changes before editing. Preserve unrelated dirty-worktree changes.
4. For non-trivial work, read the relevant durable context under [`docs/agent-context/`](docs/agent-context/README.md). Treat it as a verified index, never as a substitute for inspecting source.
5. Make the scoped change directly in the repository. Use [`docs/agent-rules/VALIDATION.md`](docs/agent-rules/VALIDATION.md) to select and run the narrowest useful checks.
6. Re-read the changed files, report evidence actually gathered, and update durable context only for stable, source-backed facts or decisions.

## Routing contract

- **Course, module, lesson, manifest, assessment, or course component:** read [`GENERAL.md`](docs/agent-rules/GENERAL.md), then mandatory [`COURSE_STANDARD.md`](docs/agent-rules/COURSE_STANDARD.md) and [`COURSE_WORK.md`](docs/agent-rules/COURSE_WORK.md). Add the packs selected by `TASKS.md`, including pedagogy, integrity, repair, components, research, UI, and PlantUML where applicable.
- **Research, factual material, explanations, or citations:** read [`RESEARCH.md`](docs/agent-rules/RESEARCH.md).
- **Layout, styling, interaction, accessibility, or visual design:** read [`UI.md`](docs/agent-rules/UI.md).
- **PlantUML:** read [`PLANTUML.md`](docs/agent-rules/PLANTUML.md).
- **Agent-process or host-adapter documentation:** read [`HOSTS.md`](docs/agent-rules/HOSTS.md).
- **Build scripts, CI, tests, deployment, or validation tooling:** read [`VALIDATION.md`](docs/agent-rules/VALIDATION.md), plus the subject documentation for the affected system.

When several categories apply, read their combined packs. No host, agent role, skill, or automation may bypass a task pack.

## Collaboration and durable context

[`docs/agent-rules/ROLES.md`](docs/agent-rules/ROLES.md) defines optional responsibilities for collaboration. [`docs/agent-rules/SKILLS.md`](docs/agent-rules/SKILLS.md) defines how host-provided skills fit into the repository contract. Neither introduces a required agent runtime or persistent personas. Do not delegate merely because a role exists; use parallel work only when scopes are independent and handoffs are explicit.

[`docs/agent-context/README.md`](docs/agent-context/README.md) governs persistent repository memory. It may contain only concise, reviewed, non-sensitive facts that remain useful across tasks. Do not put prompts, transcripts, credentials, speculative notes, or ordinary task logs there.

## Change and commit policy

Make requested repository changes directly. Keep changes scoped; do not stage, commit, push, open issues, or alter unrelated work unless asked. When committing, use `[Verb] Short description`.
