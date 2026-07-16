# LibreUni agent router

This file is the single repository entrypoint for every coding harness: OpenCode, Codex, Gemini, Antigravity, Copilot, and similar tools. Read it first. Do not infer a different workflow from the harness being used.

## Route every task

1. Read [`docs/agent-rules/GENERAL.md`](docs/agent-rules/GENERAL.md).
2. Identify the task category and read only the applicable rule file or files:

   - Course, module, or lesson creation, review, repair, or research → [`docs/agent-rules/COURSE_WORK.md`](docs/agent-rules/COURSE_WORK.md), [`docs/agent-rules/COURSE_PEDAGOGY.md`](docs/agent-rules/COURSE_PEDAGOGY.md), and [`docs/agent-rules/COURSE_REPAIR.md`](docs/agent-rules/COURSE_REPAIR.md) for repair work.
   - Course components → [`docs/agent-rules/COURSE_COMPONENTS.md`](docs/agent-rules/COURSE_COMPONENTS.md).
   - Research, new factual material, explanations, or citations → [`docs/agent-rules/RESEARCH.md`](docs/agent-rules/RESEARCH.md).
   - Layout, styling, interaction, accessibility, or visual design → [`docs/agent-rules/UI.md`](docs/agent-rules/UI.md).
   - PlantUML → [`docs/agent-rules/PLANTUML.md`](docs/agent-rules/PLANTUML.md).
   - Documentation-only work → read [`docs/agent-rules/HOSTS.md`](docs/agent-rules/HOSTS.md) for agent documentation or the relevant rule file named by the document’s subject.
   - Any edit → use [`docs/agent-rules/VALIDATION.md`](docs/agent-rules/VALIDATION.md) to choose the narrowest useful check before finishing.

3. Inspect the current files and existing changes before editing. Keep the change scoped to the request.
4. Follow the applicable rule files as one shared policy. The host harness does not change the policy or the expected output.
5. Validate the result, report checks run and any external blocker, and do not claim that an unrun check passed.

## Course routing

For a course request, infer whether the user wants a course audit, module review, lesson repair, or new lesson. Read the complete target lesson set and manifest when the scope is course- or module-wide. Use ordinary repository tools and direct edits; do not invoke a custom repository workflow or host-specific course process.

“Improve course X” means a whole-course pedagogical audit and substantive redesign. Cosmetic cleanup alone is not completion.

## Change and commit policy

Make requested repository changes directly. Show the rationale and diff when the host supports it. Commit only when the user or the surrounding workflow asks for a commit. Use `[Verb] Short description` for commit messages when committing.

## Host compatibility files

`CODEX.md`, `GEMINI.md`, `.github/copilot-instructions.md`, and `opencode.json` are thin host adapters. They must point back to this file and must not introduce a competing workflow.
