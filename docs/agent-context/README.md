# Durable agent context

This directory is LibreUni's small, Git-reviewed memory for facts that remain useful across tasks. It complements source inspection; it never replaces it.

## What belongs here

- accepted repository operating decisions in `DECISIONS.md`;
- verified constraints that affect future work in `KNOWN-CONSTRAINTS.md`; and
- one current, bounded handoff in `HANDOFF.md` when work genuinely needs to continue across agents or sessions.

Every entry must be concise, dated, attributable to a source file, command result, issue, or accepted decision, and removed or superseded when it stops being useful.

## What never belongs here

- credentials, tokens, personal data, or secrets;
- prompts, transcripts, private chain-of-thought, or tool dumps;
- speculative diagnoses, temporary scratch notes, or a general work log; and
- duplicated rules that already have an authoritative home under `docs/agent-rules/`.

## Update contract

Read relevant entries for non-trivial work. Update an entry only after verifying the fact in the repository or receiving an explicit decision. Use a short source link, preserve prior decisions by marking them superseded, and clear completed handoffs instead of accumulating history.
