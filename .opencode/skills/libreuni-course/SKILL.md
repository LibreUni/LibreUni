---
name: libreuni-course
description: Audit, redesign, research, write, review, and repair LibreUni university-level courses through the repository MCP workflow.
compatibility: opencode
---

# LibreUni course workflow

Use this skill for any request involving a LibreUni course, module, or lesson. Ordinary requests such as “improve course Abstract Algebra” are sufficient to select the workflow.

## Scope interpretation

“Improve course X” is a course-scale request. It requires an audit of the whole course, not a pass over headings, transitions, banned phrases, or spelling. Do not report success after cosmetic changes. If the course needs a radical remake, propose one without waiting for the user to provide a more technical prompt.

Classify the operation as one of:

- course improvement or remake: inspect the full course and manifest, then design a coherent revision;
- module improvement: inspect the module and its neighboring prerequisites;
- lesson repair: inspect the target lesson and the assumptions it makes;
- research or creation: establish the intended audience, learning arc, sources, and assessment before drafting.

## Mandatory inspection

Before judging or editing:

1. Call `get_libreuni_rules`.
2. Call `list_course_lessons` for the target course.
3. Read every relevant lesson with `read_lesson`, plus the course metadata and manifest when the operation is course- or module-level.
4. Read `docs/SKILLS/PEDAGOGY.md`, `docs/SKILLS/LIBREUNI_COURSE.md`, and `docs/SKILLS/SOURCING.md` when research or lesson writing is involved.
5. Use `research_sources` for factual, historical, or attribution claims. Cite only URLs returned by that tool.

## Course-scale audit

For a course request, produce an audit before drafting. Cover:

- the course’s conceptual spine and whether the manifest expresses it;
- prerequisites, gaps, duplicated material, and abrupt difficulty jumps;
- mathematical correctness, definitions, theorem statements, proofs, and edge cases;
- motivated discovery, concrete-to-formal transitions, worked reasoning, and independent transfer;
- exercise validity, misconception diagnosis, feedback quality, and interaction purpose;
- opportunities for diagrams, tables, computational experiments, or other visual models;
- sourcing and self-containedness.

Rank findings by learner impact. Cosmetic issues are not findings unless they obscure reasoning.

Then provide a course blueprint: intended outcomes, module restructuring, lesson additions/removals/rewrites, prerequisite changes, assessment strategy, and validation plan. A strong improvement may rewrite most or all lessons. Preserve correct material only when it serves the revised arc.

## Authoring and applying

Use the MCP server as the primary repository interface. Draft one complete lesson at a time. Every lesson must be self-contained and follow theory → example → exercise, with formal university-level content and meaningful practice. Interactive MDX components require `client:load` and canonical props.

Use `save_proposal` for a lesson and `save_course_proposal` for coordinated metadata, manifest, or multi-file course changes to validate. Then apply directly with `git add -A && git commit -m "[Verb] Short description"`. No user approval needed — commit style is `[Add]`, `[Fix]`, `[Refactor]`, `[Update]`, `[Remove]`. Re-read and validate every applied lesson afterward. Never claim a course was improved when only a cosmetic diff was made.

## Adversarial review

For substantive work, delegate the complete proposal or lesson diff to `@pedagogical-reviewer` before presenting it. Ask for only high-impact findings, especially correctness, prerequisites, reasoning gaps, exercise solvability, feedback, sequencing, and unsupported claims.
