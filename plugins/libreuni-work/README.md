# LibreUni work plugin

A DeepSeek Harness (DSH) bundle that makes LibreUni repository work cheaper for the user and for any agent working in this checkout. It routes a task through the repository's own rule packs before an agent edits anything, and makes the repository's own validators callable as first-class, evidence-producing checks.

The plugin adds no policy of its own: it points at `AGENTS.md`, `docs/agent-rules/`, `docs/agent-context/`, and the `package.json` scripts, and reads them at call time so it follows the repository rather than a snapshot of it.

## What it contributes

| Surface | Contribution |
| --- | --- |
| System prompt section `libreuni:routing` | One short protocol: brief before editing, read the routed packs, run checks through the plugin, report only real outcomes. |
| Tool `libreuni_brief` | Reads `AGENTS.md`, `TASKS.md`, the routed packs, durable context, course manifests, `package.json` scripts, and `git status`; returns the packs to read (with heading outlines), live course state, the smallest useful validation tier, and report paths. Seeds the visible todo list with a tagged plan. |
| Tool `libreuni_context` | Returns one rule pack or durable-context document in full (topic list without an argument). |
| Tool `libreuni_check` | Runs a validator through `npm run <script>` or its script file, plus stable in-scope aliases (`course-stats`, `verify-lessons`, `course-integrity`, `platform-lint`, `course-validators`), and returns an evidence record: exact command, exit status, output tail, report paths. Rejects unknown or missing scripts and shell-unsafe arguments instead of substituting a weaker check. |

Routing follows `docs/agent-rules/TASKS.md`: course and lesson paths route to `GENERAL`, `COURSE_STANDARD`, `COURSE_STRUCTURE`, `COURSE_WORK` plus the conditional packs selected by the request wording; components add `COURSE_COMPONENTS`; UI paths add `UI` and `VALIDATION`; scripts, CI, and tests add `VALIDATION`; agent-process docs add `HOSTS`.

## Install

The bundle is installed into the DSH profile, not run from the repository:

```text
plugin_manager(action: "install_bundle", target: "<path-to-libreuni-repo>/plugins/libreuni-work")
```

A local directory installs as a pnpm `link:`, so the workspace copy above is what runs. After editing `index.js`, restart the host so the new module generation loads.

## Self-check

```bash
node plugins/libreuni-work/test.mjs                            # pure routing, parsing, and argument-hygiene checks
DSH_CORDIS_PATH=/path/to/cordis/lib/index.js node plugins/libreuni-work/dev/drive.mjs
```

`dev/` is development-only tooling and is not part of the installed runtime.
