---
name: rapid-ai-preview
description: Preview all workspace changes, map modified files to affected routes, record review comments, and gate pilot expansion before scaling changes across the LibreUni catalog.
---

# Rapid AI Preview Skill

Use this skill when previewing new platform or curriculum changes, generating review summaries for human or agent inspection, adding review comments, or checking whether a pilot change is approved to expand beyond its initial pilot course/page.

## Contract Alignment

1. Always read [`AGENTS.md`](../../../AGENTS.md) and [`docs/agent-rules/BASELINE.md`](../../../docs/agent-rules/BASELINE.md) first.
2. This skill accelerates change previewing and pilot gating; it does not replace required validation commands in [`docs/agent-rules/VALIDATION.md`](../../../docs/agent-rules/VALIDATION.md).

## Workflow Steps

### 1. Generate the Change Preview Bundle

Run the preview generator to inspect `git status`, map changed files to affected URL routes, and produce Markdown + HTML review artifacts:

```bash
npm run ai:preview
```

This generates:
- `reports/ai-dev/preview-summary.md` — Markdown table of issue queue statuses, changed files, affected routes, and pilot-expansion gates.
- `reports/ai-dev/preview-summary.html` — Standalone HTML review dashboard with clickable localhost preview links and reviewer comments.

### 2. Inspect Affected Routes & Capture Visuals (When UI/Layout Changes)

If the preview bundle lists affected routes under `/lessons/...`, `/careers/...`, or `/development.html`:
1. Run narrow layout and UX checks on the affected routes:
   ```bash
   node tools/run-playwright.mjs test tests/ux/layout-glitches.spec.mjs tests/ux/buttons-and-contrast.spec.mjs --project=ux
   ```
2. When visual comparison is needed, run:
   ```bash
   npm run test:visual
   ```

### 3. Record Reviewer Comments

To attach a human or harness review note to any tracked issue during preview:

```bash
node scripts/ai_dev_workflow.mjs comment --id <ISSUE_ID> --author "<name>" --note "<review feedback>"
```

### 4. Pilot-to-Catalog Expansion Gate

Per `D-0007` and `D-0013`, structural or pedagogical changes are piloted on a bounded scope (e.g., `calculus-intro`) before scaling across all courses.
- Check pilot gate status in `reports/ai-dev/preview-summary.md` under **Pilot Expansion Gates**.
- Only expand a pilot change across other courses after the user/reviewer approves pilot expansion:
  ```bash
  node scripts/ai_dev_workflow.mjs verify --id <ISSUE_ID> --expand-beyond-pilot
  ```
