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

## D-0007 — Pilot one course to reference quality, then port, then verify, then scale

- **Status:** accepted · 2026-10-06
- **Decision:** One course (Operating Systems, chosen by the owner 2026-10-06; Architecture second as the diagram-heavy template) is brought to reference quality first, with two owner-approved exemplar lessons. Its pattern is extracted and applied to Database Systems and Operating Systems; the trio is independently verified before any archived course is re-entered. Writers and verifiers are different agents; structural checks are never the acceptance criterion.
- **Rationale:** The refactor's structure and tooling passed all gates while the repair contracts still found missing inputs, invalid counterexamples, and unshipped lab fixtures. Quality has to be defined by one exemplar before parallel production multiplies defects.
- **Sources:** [`docs/refactor/PLAN.md`](../refactor/PLAN.md), [`docs/refactor/STATE.md`](../refactor/STATE.md), [`docs/curriculum/repair-contracts/`](../curriculum/repair-contracts/)

## D-0008 — Add an Introduction to Calculus course (and recover its source)

- **Status:** accepted · 2026-10-06 (7-lesson `calculus-intro` course active and verified)
- **Decision:** A single-variable "Introduction to Calculus" course (Calculus 1 level, 7 lessons, 28h) is recovered from `aaee234^` and rewritten against the current standard. Multivariable, series, differential equations, and analysis remain staged in `archive/curriculum/2026-10-06-calculus-recovery/`. Its interactive-diagram pattern (single-claim playground, accessible control, static twin) is a reference for other courses, subject to D-0005's prediction and testing requirements.
- **Rationale:** The trio assumes mathematical preparation it does not teach; a narrow course supplies it without becoming a full analysis curriculum. Recovery follows the archive rule: review per lesson, no wholesale restore.
- **Sources:** [`docs/refactor/CALCULUS_RECOVERY.md`](../refactor/CALCULUS_RECOVERY.md), [`archive README`](../../archive/curriculum/2026-10-06-calculus-recovery/README.md), [`src/data/course-manifests/calculus-intro.yml`](../../src/data/course-manifests/calculus-intro.yml)

## D-0009 — Dual lab-fixture and deterministic playground-model verification

- **Status:** accepted · 2026-10-30
- **Decision:** Operating Systems lab briefs reference upstream `xv6-riscv` revision 5 at commit `7d7adbb1b0acbd67c9766a20d0f9900fef2789fa`; learners obtain the upstream source separately. The repository also tests deterministic scheduler, Virtio queue, and rename models, alongside playground models.
- **Rationale:** Pinned upstream anchors support reproducible kernel work; the smaller local models provide testable examples without presenting them as a kernel implementation or hardware benchmark.
- **Sources:** [`scheduler-lab.mdx`](../../src/content/lessons/operating-systems/scheduler-lab.mdx), [`src/components/playgrounds/osLabModels.mjs`](../../src/components/playgrounds/osLabModels.mjs), [`scripts/test_os_models.mjs`](../../scripts/test_os_models.mjs).

## D-0010 — Credit labels are derived from declared workload

- **Status:** provisional implementation · 2026-11-02
- **Decision:** Course metadata records workload-equivalence estimates of 1, 7.5, 7, and 7.5 ECTS for Calculus, Architecture, Databases, and Operating Systems respectively. The estimates use an internal 22–28 hours-per-credit range. LibreUni does not award academic credit; actual ECTS award and recognition depend on an institution's assessment and policies.
- **Rationale:** The previous 5-credit estimate for the 28-hour preparatory module was inconsistent with its declared workload. The module remains a seven-lesson exception to the normal course-size and study-time standard, not a complete 150–200-hour course.
- **Sources:** [`src/content/courses/`](../../src/content/courses/), [`scripts/test_quality_contract.mjs`](../../scripts/test_quality_contract.mjs), [`course overview`](../../src/pages/courses/%5BcourseId%5D.astro), and the [European Commission's ECTS overview](https://education.ec.europa.eu/education-levels/higher-education/inclusive-and-connected-higher-education/european-credit-transfer-and-accumulation-system).

## D-0011 — Database labs execute read-only SQL in the browser

- **Status:** accepted · 2026-11-02
- **Decision:** `SqlRunner` seeds a fresh fixed fixture into an in-browser SQLite database for each read-only query. SQL lab and SQL-querying use it to make result contracts executable. SQLite is not PostgreSQL; PostgreSQL-specific constraint errors, isolation, and plans require a PostgreSQL run.
- **Rationale:** A paper-only SQL lab let a wrong join or a misplaced predicate look plausible. The component keeps the fixture deterministic and the execution sandboxed, while the lesson states the dialect boundary instead of hiding it.
- **Sources:** [`src/components/SqlRunner.tsx`](../../src/components/SqlRunner.tsx), [`sql-lab.mdx`](../../src/content/lessons/database-systems/sql-lab.mdx), [`sql-querying.mdx`](../../src/content/lessons/database-systems/sql-querying.mdx), [`COURSE_COMPONENTS.md`](../agent-rules/COURSE_COMPONENTS.md).

## D-0012 — Unified Component & Content Architecture

- **Status:** accepted · 2026-11-04
- **Decision:** All 75 lessons across the active curriculum adhere to a unified component design system, strict AST validation, and interactive assessment standards:
  1. **Anti-feature removal:** Global answer-reveal/bypass shortcuts (`#toggle-solutions-btn`, `libreuni:exam-review`, `"Quick review: Reveal answer"`) are permanently removed.
  2. **Design system tokens & contrast:** 3-tier elevation system (`.lu-card-tier1`, `.lu-card-tier2`, `.lu-card-tier3`), modern default theme with auto OS-theme detection, accessible WCAG AA contrast tokens across light and dark themes (dark mode primary text resolved to `#60a5fa` to prevent mid-tone blue contrast failure against `#111827`/`#1e293b`), universal `cursor: pointer` on all buttons/summaries/radios, and standard rotating chevrons.
  3. **Component standards:** `ExerciseSolution` with multi-step hints, multi-claim matrix `Quiz` with natural "Correct" / "Incorrect" option evaluation and uncollapsed inline feedback, radio-commitment `CaseStudy` with trade-off analysis, token-gap `CodeExercise` with keyboard submission, unified lab headers for `CodeRunner` and `SqlRunner`, and mathematical statements/proofs (`MathStatement`, `MathProof` with Q.E.D. `∎`).
  4. **Automated AST linter & Remark pipeline:** `scripts/lint_platform_consistency.mjs` and `src/plugins/remark-lesson-structure.mjs` enforce 0 raw `<details>`, 0 redundant `# H1` headings, zero duplicate imports, and required lesson metadata across all 75 MDX documents.
  5. **Dual-mode test verification:** E2E accessibility suite (`tests/e2e/accessibility.spec.mjs`) parameterizes Axe testing over both `light` and `dark` color schemes, alongside dedicated UX affordance suites (`tests/ux/buttons-and-contrast.spec.mjs`) ensuring zero unclickable or low-contrast interactive controls.
- **Rationale:** Prevents component visual drift, maintains pedagogical integrity (requiring active learner retrieval rather than passive disclosure), and guarantees strict accessibility and layout stability across desktop and mobile form factors.
- **Sources:** [`scripts/lint_platform_consistency.mjs`](../../scripts/lint_platform_consistency.mjs), [`src/plugins/remark-lesson-structure.mjs`](../../src/plugins/remark-lesson-structure.mjs), [`src/styles/global.css`](../../src/styles/global.css), [`tests/ux/buttons-and-contrast.spec.mjs`](../../tests/ux/buttons-and-contrast.spec.mjs), [`COURSE_COMPONENTS.md`](../agent-rules/COURSE_COMPONENTS.md), [`COURSE_STANDARD.md`](../agent-rules/COURSE_STANDARD.md).

## D-0013 — Book-Grade Pedagogical Structure & Numbered Reference Architecture

- **Status:** accepted · 2026-11-05
- **Decision:** LibreUni establishes a textbook-grade structural grammar adapted from canonical reference texts (Abbott, Martin, Huth & Ryan):
  1. **Generated numbering & resolvable cross-references:** Statement and exercise numbers are generated dynamically by the build system from manifest position and document AST order rather than hardcoded in source. References use `<Ref id="..."/>`, resolving to statement kind, dynamic number, and title with hover previews. The legacy "no interlinking" rule is refined to "explicit, resolvable dependencies": relative chronological navigation ("in the next lesson", "as we saw yesterday") remains strictly banned, but precise conceptual references to declared prerequisites and foundational statements are encouraged.
  2. **Canonical statement system & noun headings:** Labeled blockquotes and `MathStatement` share a unified typed Statement AST (`definition`, `theorem`, `lemma`, `proposition`, `corollary`, `invariant`, `example`, `remark`, `convention`, `warning`). Headings in lesson bodies follow noun-phrase subject grammar ("The Formal Definition of a Limit", "Quorum Intersection"), with formal claims housed in dedicated statement cards rather than bare heading text.
  3. **Module arc & pedagogical roles:** Manifest modules follow the four-part pedagogical arc: Discussion (motivating problem, informal inquiry, playground) → Core lessons (formal theory, derivations, worked examples, counterexamples) → Project/Lab (self-contained constructive inquiry where exercises carry the exposition) → Epilogue/Summary (invariants/theorems sheet, synthesis, boundary conditions). Lessons in manifests carry explicit roles (`discussion`, `core`, `project`, `lab`, `epilogue`, `assessment`).
  4. **Typed, numbered exercise taxonomy:** Core lessons conclude with an `ExerciseSet` containing 8–12 typed exercises across Bloom's levels (`verify`, `negate`, `construct`, `describe`, `example-or-impossible`, `invented-definition`, `generalise`, `prove`, `formalise`, `tool`), marked with challenge flags (★) and full collapsible solutions/rubrics.
  5. **Pilot-first rollout:** The structure is piloted and proven on Calculus "Limits and derivatives" first, followed by Operating Systems "Concurrency and liveness", before scaling across the curriculum.
- **Rationale:** Aligns LibreUni with canonical textbook rigor and navigation while preserving interactive playgrounds, complete diagnostic solutions, and strict anti-filler obligations.
- **Sources:** [`docs/agent-rules/COURSE_STRUCTURE.md`](../agent-rules/COURSE_STRUCTURE.md), [`src/components/Ref.astro`](../../src/components/Ref.astro), [`src/components/ExerciseSet.astro`](../../src/components/ExerciseSet.astro), [`src/components/MathStatement.astro`](../../src/components/MathStatement.astro), [`src/plugins/remark-lesson-structure.mjs`](../../src/plugins/remark-lesson-structure.mjs).

## D-0014 — Discriminated Page and Module Kinds, and Verified Build-Time Figures Architecture

- **Status:** accepted · 2026-11-07
- **Decision:** LibreUni introduces first-class module kinds, discriminated page kinds, and an exact build-time mathematical figure plotting engine:
  1. **Discriminated page & module taxonomy:** Course manifests declare module kinds (`chapter`, `exam`, `reference`). Pages declare kinds (`lesson`, `lab`, `problems`, `recap`, `exam`) with a unified loader (`src/lib/courseStructure.mjs`) and discriminated union schema in `src/content.config.ts`. Chapter modules receive sequential numbering ($m = 1, 2, \dots$); non-chapter modules (`exam`, `reference`) have index `null` and do not consume chapter numbers. Sections ($s = 1, 2, \dots$) count only `lesson` and `lab` pages. `problems` and `recap` pages receive labels `$m.\text{P}$` and `$m.\text{R}$` without advancing section counters.
  2. **Specialized page templates & components:**
     - `problems`: Chapter problem sets organize 10–20 synthesis, transfer, and challenge (★) problems in `<ProblemSet>` using `<Problem>` and `<ExerciseSolution>`.
     - `recap`: Hand-condensed summary sheets with method choosers, hypothesis checklists with explicit counterexamples, and common errors. References statements via `<Ref id="...">`; no new `<MathStatement>` definitions.
     - `exam`: Formal assessment papers with `<ExamAttempt>` managing timer, local progress persistence, and sealed `<MarkingScheme>` disclosures inside `<ExamQuestion>` items. Marking schemes are hidden until explicit local confirmation of "Finish attempt", with zero global reveal shortcuts or cross-page leakage (enforcing D-0012).
  3. **Universal block registry:** `statementRegistry.mjs` indexes statements (`m.s.i`), exercises (`m.s.i`), problems (`m.P.i`), figures (`m.s.i`, `m.P.i`, `m.R.i`), and questions (`i`), enabling `<Ref>` to resolve any entity with interactive hover tooltips.
  4. **Build-time verified figure engine:** Pure JavaScript math plotting core in `src/lib/plot/` renders responsive, theme-adaptive SVGs at build time with `<Figure>`. Fragile TikZ function plots with Bézier controls or coordinate plots are strictly banned (`LINT-09`). Automated test suite (`tests/figures.test.mjs`) verifies mathematical precision (monotonicity, zero-crossing axes, label non-overlap, viewport bounds, fill order) across checks A1–A9 on every build.
  5. **Calculus pilot content:** Chapters 1 and 2 of `calculus-intro` refactored with 14 verified figures, 2 problem sets (`limits-derivatives-problems`, `integration-problems`), 2 recap sheets (`limits-derivatives-recap`, `integration-recap`), and comprehensive practice workshop (`calculus-practice`) with algorithmic question randomization, progressive hints, and step-by-step solutions, while preserving exact workload calibration (28h) and 100% statement numbering regression invariants across all active courses.
- **Rationale:** Resolves fragile TikZ function curves, separates immediate lesson checks from deep chapter synthesis practice, provides structured exam environments adhering to anti-cheat security, and guarantees mathematical accuracy through automated build-time assertions.
- **Sources:** [`docs/refactor/PAGE_KINDS_AND_FIGURES.md`](../refactor/PAGE_KINDS_AND_FIGURES.md), [`src/lib/plot/`](../../src/lib/plot/), [`src/lib/courseStructure.mjs`](../../src/lib/courseStructure.mjs), [`src/components/Figure.astro`](../../src/components/Figure.astro), [`src/components/ProblemSet.astro`](../../src/components/ProblemSet.astro), [`src/components/ExamAttempt.tsx`](../../src/components/ExamAttempt.tsx), [`tests/figures.test.mjs`](../../tests/figures.test.mjs).

## D-0015 — Prohibition of Prompt and Constraint Parroting in User-Facing Copy

- **Status:** accepted · 2026-11-08
- **Decision:** Developer instructions, user prompt constraints, architectural rationales, and conversation-level guidance (such as "don't add a timer", "we are not testing students without a teacher", "feature coming later", or "self-testing without an instructor") must never be transcribed, paraphrased, or reflected in public website copy, banners, page headers, badges, or component text. User-facing content must describe educational material positively, objectively, and authoritatively from the learner's perspective. It must never mention user prompts, negative implementation constraints, omitted features, or behind-the-scenes pedagogical intent.
- **Rationale:** Parroting developer or user conversation into production page copy degrades editorial professionalism, violates the platform's academic tone ("No Bullshit"), and confuses learners by presenting conversational metadata as instructional content.
- **Sources:** [`docs/agent-rules/GENERAL.md`](../agent-rules/GENERAL.md), [`docs/agent-rules/COURSE_STANDARD.md`](../agent-rules/COURSE_STANDARD.md), [`src/content/lessons/`](../../src/content/lessons/), [`src/pages/lessons/[...slug].astro`](../../src/pages/lessons/[...slug].astro).

## D-0016 — Independent Fill-in Practice and Anti-Pattern Linting

- **Status:** accepted · 2026-11-08
- **Decision:** Fill-in exercises for mathematical formulas, proofs, or prose questions must use the dedicated `<FillInExercise>` component rather than `<CodeExercise>`. Passing code that consists entirely of comments (e.g. `#`, `//`, `/* ... */`, `--`) to `<CodeExercise>` is strictly forbidden as an anti-pattern; both the component runtime and platform linter (`[LINT-12]`) immediately throw/error on detection. Furthermore, platform and integrity audits flag exercise-design anti-patterns across modules and courses:
  1. *Answer-length cues:* Flagged when an assessment's correct option is conspicuously longest, or when clustered across a module/course.
  2. *Uniform single-correct multiple-choice:* Flagged when multiple-choice exercises (`Quiz`) overwhelmingly offer only one correct answer, indicating that a multi-claim classification matrix, derivation, or fill-in exercise should be used instead of single-guess multiple choice.
- **Rationale:** Ensures learners engage in authentic conceptual retrieval and proof practice without the cognitive mismatch of code syntax highlighting for prose or math formulas. Prevents trivial answer-length shortcuts and forces authors to choose appropriate, diverse exercise types.
- **Sources:** [`src/components/FillInExercise.tsx`](../../src/components/FillInExercise.tsx), [`src/components/CodeExercise.tsx`](../../src/components/CodeExercise.tsx), [`scripts/lint_platform_consistency.mjs`](../../scripts/lint_platform_consistency.mjs), [`scripts/course_integrity.py`](../../scripts/course_integrity.py), [`tests/code-exercise.test.mjs`](../../tests/code-exercise.test.mjs).
