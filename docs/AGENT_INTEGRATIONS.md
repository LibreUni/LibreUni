# LibreUni agent integrations

LibreUni exposes its course workflow through a local MCP server. The host agent—OpenCode, Codex, Gemini/Antigravity, or another MCP-compatible client—does the reasoning. The server provides bounded repository operations and deterministic checks.

## Install once

From the repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
```

The server reads `LIBREUNI_ROOT` or uses its current working directory. It does not require an API key: the host agent supplies the model and may use its own web tools. `OPENROUTER_API_KEY` remains available to the legacy `libreuni-agent` workflow.

## OpenCode

Add this to project-local `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "libreuni": {
      "type": "local",
      "command": [".venv/bin/libreuni-mcp"],
      "enabled": true
    }
  }
}
```

Because `opencode.json` loads the repository rules and selects the `libreuni-course` primary agent, ordinary requests are enough:

```text
improve course Abstract Algebra
create course Numerical Methods
repair lesson groups-and-homomorphisms
```

The configured agent infers the target and operation, loads the pedagogical standard, uses the MCP tools, and delegates a read-only `pedagogical-reviewer` for substantive course work. It remains proposal-first: it must show rationale and exact diffs before applying anything.

## Codex

Keep `AGENTS.md` as the entrypoint and add the local MCP server to the trusted project MCP configuration used by your Codex installation. Codex should infer course intent from ordinary requests, then load `docs/SKILLS/PEDAGOGY.md` and `docs/SKILLS/LIBREUNI_COURSE.md` before using the MCP workflow. If the host does not auto-discover the local server, explicitly enable it in the trusted project configuration.

## Gemini / Antigravity

Keep `GEMINI.md` and `AGENTS.md` in the repository. Configure a local stdio MCP server in the host's MCP settings with:

```json
{
  "command": ".venv/bin/libreuni-mcp",
  "args": [],
  "env": { "LIBREUNI_ROOT": "/absolute/path/to/LibreUni" }
}
```

Tell the agent to read `docs/SKILLS/LIBREUNI_COURSE.md` and use the `libreuni` tools. Host configuration formats vary, so do not commit personal Antigravity settings to the repository.

## Safety model

`save_proposal` and `save_course_proposal` write only under ignored `.libreuni-agent/mcp-proposals/`. Their apply counterparts refuse to write unless `approved_by_user=true`, the proposal passed deterministic checks, and every baseline file is unchanged since proposal creation. Every applied change is visible in ordinary `git diff`.
