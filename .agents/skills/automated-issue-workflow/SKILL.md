---
name: automated-issue-workflow
description: Manage the structured issue lifecycle (reported -> needs-clarification -> approved -> in-progress -> ready-for-review -> verified) for page audits and human review notes.
---

# Automated Issue Workflow Skill

Use this skill when processing a batch of human review notes or auditing a page with multiple issues that need to be logged, clarified with the user, approved, implemented, and verified.

## Lifecycle State Machine

Every issue in [`docs/agent-context/ISSUE_QUEUE.json`](../../../docs/agent-context/ISSUE_QUEUE.json) progresses through six explicit states:

1. `reported` — Issue identified from human review or automated page audit.
2. `needs-clarification` — Ambiguous requirement recorded with a concrete question for the user.
3. `approved` — User or reviewer decision recorded; ready for implementation.
4. `in-progress` — Scoped repository fix actively being implemented.
5. `ready-for-review` — Code/content changes complete with test evidence recorded; ready for preview and review.
6. `verified` — All required checks passed and review accepted.

## Commands

### 1. List Queue Status

```bash
npm run ai:issues
# Filter by status or route:
node scripts/ai_dev_workflow.mjs list --status needs-clarification
node scripts/ai_dev_workflow.mjs list --route /development.html
```

### 2. Register New Issues from a Page Audit or Review Note

```bash
node scripts/ai_dev_workflow.mjs add \
  --id "REV-12-example" \
  --title "Short descriptive title" \
  --route "/lessons/calculus-intro/limits.html" \
  --description "Detailed description of the issue observed" \
  --pilot "calculus-intro"
```

### 3. Triage: Fix Clear Issues Immediately, Clarify Ambiguous Ones

- **If the fix is unambiguous:** transition directly to `in-progress`, implement the fix following [`docs/agent-rules/TASKS.md`](../../../docs/agent-rules/TASKS.md), run narrow validation, and mark `ready-for-review`.
- **If the fix requires design or scope clarification:** record the question and ask the user:
  ```bash
  node scripts/ai_dev_workflow.mjs clarify \
    --id "REV-12-example" \
    --question "Should this component live in a collapsible right-hand drawer or inline?"
  ```

### 4. Record Approval & Implement

Once the user clarifies and approves:

```bash
node scripts/ai_dev_workflow.mjs approve \
  --id "REV-12-example" \
  --resolution "Collapsible right-hand utility drawer with localStorage persistence"

node scripts/ai_dev_workflow.mjs start --id "REV-12-example"
```

### 5. Mark Ready for Review & Verify

After running the narrowest relevant checks from [`docs/agent-rules/VALIDATION.md`](../../../docs/agent-rules/VALIDATION.md):

```bash
node scripts/ai_dev_workflow.mjs ready \
  --id "REV-12-example" \
  --files "src/components/Example.tsx,src/pages/example.astro" \
  --evidence "Passed npm run check:content and Playwright UX checks"

# Refresh the review bundle:
npm run ai:preview

# Once verified:
node scripts/ai_dev_workflow.mjs verify --id "REV-12-example"
```
