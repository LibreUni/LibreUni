# Baseline agent contract

Read this after `AGENTS.md` for every LibreUni task. It is the universal operating contract; task packs add subject-specific requirements and take precedence when they are stricter.

## Work deliberately

1. Route the task before acting. Read every applicable pack from `TASKS.md`.
2. Establish the requested outcome, affected files, and validation tier before editing. If the intended scope materially changes, state the assumption or ask for direction.
3. Inspect existing files and `git status` first. Preserve unrelated changes in a dirty worktree.
4. Prefer the smallest direct change that meets the request. Do not create a private staging workflow, hidden runtime, or duplicate policy.
5. Use repository context only when it is relevant, source-backed, and still current. Inspect the source of truth rather than trusting a memory entry blindly.
6. Validate in proportion to risk using `VALIDATION.md`. A passing automated check is evidence of its stated contract, not proof of educational, factual, or design quality.
7. Hand off with the changed scope, checks run and their outcome, and any remaining risk or external blocker. Never claim an unrun check passed.

## Safety and quality boundaries

- Never store credentials, personal data, prompt transcripts, or unreviewed speculation in repository context.
- Do not weaken validation thresholds, add placeholders, or manufacture citations to make a gate pass.
- Keep host adapters thin. Shared policy belongs in this routed documentation, not in a host-specific instruction file.
- Use agent roles only to clarify accountability. They do not authorize broader edits or external actions.
