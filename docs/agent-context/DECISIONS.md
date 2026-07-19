# Operating decisions

## D-0001 — Repository-native agent operating model

- **Status:** accepted · 2026-07-19
- **Decision:** LibreUni uses shared routed documentation, optional collaboration roles, durable Git-reviewed context, and ordinary host capabilities. It does not require a custom agent runtime, MCP server, API key, or proposal store.
- **Rationale:** The existing canonical router and thin host adapters already provide host-neutral entry. Explicit contracts improve consistency without introducing a second execution system.
- **Sources:** [`AGENTS.md`](../../AGENTS.md), [`docs/agent-rules/HOSTS.md`](../agent-rules/HOSTS.md), [`docs/agent-rules/ROLES.md`](../agent-rules/ROLES.md)

## D-0002 — Named quality-gate contract

- **Status:** accepted · 2026-07-19
- **Decision:** `check:contract`, `check:content`, `check:build`, `check:e2e`, `check:ux`, and `check:lighthouse` are the named quality layers. `check:required` is the PR/push contract; `check:full` and `npm test` add Lighthouse for local release verification. CI invokes the same named layers and documents Lighthouse as a main-branch-only exception.
- **Rationale:** A named contract prevents drift between package scripts, CI steps, and contributor documentation while retaining the existing main-branch Lighthouse cost policy.
- **Sources:** [`package.json`](../../package.json), [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml), [`docs/agent-rules/VALIDATION.md`](../agent-rules/VALIDATION.md)
