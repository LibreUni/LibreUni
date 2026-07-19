# Host harnesses

OpenCode, Codex, Gemini, Antigravity, Copilot, and similar tools are interchangeable hosts for LibreUni work. The repository policy is defined by [`AGENTS.md`](../../AGENTS.md), not by a host-specific course agent.

Host adapter files exist only because different tools look for different names:

- `AGENTS.md` is the canonical router.
- `CODEX.md` and `GEMINI.md` point back to it.
- `.github/copilot-instructions.md` points back to it.
- `opencode.json` injects `AGENTS.md` as OpenCode’s project instruction.

Do not add host-specific copies of course, research, UI, or validation rules. If a rule should apply to all agents, add it to the routed documents under `docs/agent-rules/`.

The repository does not require a custom MCP server, API key, proposal store, or agent runtime. Shared durable context is deliberately small, Git-reviewed documentation under [`docs/agent-context/`](../agent-context/README.md), not host memory or a hidden orchestration system. Harnesses use their ordinary file, shell, web, and review capabilities according to the same routed rules.
