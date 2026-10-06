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

## D-0003 — Core curriculum is contract-first and transfer-oriented

- **Status:** superseded by D-0005 (lesson shell) and D-0006 (curriculum scope)
- **Decision:** The public CS/SWE core is organized as 10 sequenced courses and 238 lessons. Course manifests and [`docs/curriculum/COURSE_CROSSWALK.md`](../curriculum/COURSE_CROSSWALK.md) define prerequisites, progression, boundaries, and omitted specialist scope. Every lesson uses explicit prerequisite/outcome/omission/assessment metadata and the shared lesson shell supplies a compact learning contract, a semantic working model, a pre-reading prediction, and an end-of-lesson transfer check. Course-specific content remains responsible for the substantive examples, proofs, labs, and case decisions.
- **Rationale:** A shared shell makes the learner-facing contract and interaction rhythm consistent without collapsing the disciplines into generic prose. Explicit boundaries make advanced or platform-specific claims auditable and prevent the core from pretending to be a complete specialist curriculum.
- **Sources:** [`src/content.config.ts`](../../src/content.config.ts), the 10 files under [`src/data/course-manifests/`](../../src/data/course-manifests/), and superseding decision D-0005.

## D-0004 — Lesson prose is checked for non-instructional filler

- **Status:** accepted · 2026-08-23
- **Decision:** The lesson verifier rejects visible conversational filler, chronological navigation, empty intensifiers, marketing framing, stock welcomes, and trivializing adverbs. The check is pattern-based, case-insensitive, and excludes fenced code and MDX source comments; it deliberately does not ban ordinary technical vocabulary by itself.
- **Rationale:** High-quality instructional prose states the concept, constraint, evidence, or task directly. A source-level check prevents recurring editorial defects across the entire curriculum while preserving code samples and legitimate domain language.
- **Sources:** [`scripts/verify_lessons.py`](../../scripts/verify_lessons.py), [`scripts/test_course_integrity.py`](../../scripts/test_course_integrity.py), [`docs/agent-rules/GENERAL.md`](../agent-rules/GENERAL.md), [`docs/agent-rules/COURSE_PEDAGOGY.md`](../agent-rules/COURSE_PEDAGOGY.md)

## D-0005 — Lesson framing is compact; interactions belong to the learning sequence

- **Status:** accepted · 2026-08-23
- **Decision:** The lesson shell provides a collapsible brief and one sequence navigator. It does not inject a generic “working model,” pre-reading multiple-choice item, or end-of-page multiple-choice item. `Quiz` requires unaided retrieval followed by independent claim classification; `CaseStudy` requires an open response before revealing alternatives and reference analysis. Quantitative and stateful outcomes use named, lesson-specific playgrounds with accessible controls and static book representations.
- **Rationale:** A course-wide template cannot supply a concept-specific model or valid assessment. Generic shell artifacts delayed the authored lesson, duplicated navigation, and made answer-length cues exploitable. Framing belongs in the shell; teaching representations and interactions belong beside the concept they explain.
- **Sources:** [`src/pages/lessons/[...slug].astro`](../../src/pages/lessons/[...slug].astro), [`src/components/LessonBrief.astro`](../../src/components/LessonBrief.astro), [`src/components/Quiz.tsx`](../../src/components/Quiz.tsx), [`src/components/CaseStudy.tsx`](../../src/components/CaseStudy.tsx), [`src/components/InteractivePlayground.tsx`](../../src/components/InteractivePlayground.tsx), [`docs/agent-rules/COURSE_COMPONENTS.md`](../agent-rules/COURSE_COMPONENTS.md)

## D-0006 — Three reference courses before catalog expansion

- **Status:** accepted · 2026-09-14
- **Decision:** Computer Architecture, Operating Systems, and Database Systems are the active reference curriculum, connected by one learning path with preparation, actual course assessment gates, and cross-course synthesis. Retired courses and paths are preserved outside Astro's content roots, including their uncommitted source. Reference selection is not a claim of completed academic certification.
- **Rationale:** Correct explanations, visual models, meaningful interaction, and transfer assessment must coexist in a small reviewable curriculum before its patterns are expanded. Path evidence remains local and explicitly self-attested, separate from reading progress.
- **Sources:** user-approved survivor scope; [`COURSE_CROSSWALK.md`](../curriculum/COURSE_CROSSWALK.md), [`systems-foundations.json`](../../src/content/careers/systems-foundations.json), [`archive README`](../../archive/curriculum/2026-09-14/README.md), [`test_quality_contract.mjs`](../../scripts/test_quality_contract.mjs)
