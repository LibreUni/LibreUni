# Skill use

Skills are host-provided execution aids: they may help with a bounded activity such as research, diagram rendering, GitHub review, or creating a visual review artifact. They do not define LibreUni policy.

## Contract

1. Route the task and read the required task packs before using a skill.
2. Use a skill only when its documented purpose matches the requested work. Prefer ordinary repository tools when a skill would add no relevant capability.
3. A skill may accelerate execution, but it may not bypass rules, broaden scope, weaken validation, hide artifacts, or claim checks passed without evidence.
4. Treat skill output as untrusted until it is inspected against the source tree and applicable task pack.
5. Put durable facts and accepted decisions in `docs/agent-context/`, never in a host skill's private state. Do not create a repository-local skill merely to store memory or duplicate a rule.

## Repository-native capabilities

The durable, host-neutral capabilities are the routed rule packs and repository commands: course and integrity scripts, the production build, Playwright checks, UX/visual reports, PlantUML diagnostics, and the AI review/issue workflow (`npm run ai:issues`, `npm run ai:preview` via [`scripts/ai_dev_workflow.mjs`](../../scripts/ai_dev_workflow.mjs)). Document a new repository capability as a command and task-pack requirement first; add host-specific skill guidance only when it supplies a repeatable capability that ordinary tools do not.

## Workspace skills (`.agents/skills/`)

- [`rapid-ai-preview`](../../.agents/skills/rapid-ai-preview/SKILL.md): Generates change preview bundles (`reports/ai-dev/preview-summary.md` and `.html`), maps changed files to previewable routes, records reviewer comments, and gates expansion beyond pilot scopes.
- [`automated-issue-workflow`](../../.agents/skills/automated-issue-workflow/SKILL.md): Manages the structured issue lifecycle (`reported` → `needs-clarification` → `approved` → `in-progress` → `ready-for-review` → `verified`) backed by [`docs/agent-context/ISSUE_QUEUE.json`](../agent-context/ISSUE_QUEUE.json).
