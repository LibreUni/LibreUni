# Reference curriculum

Accepted scope: 2026-09-14 (updated 2026-10-06 via D-0008). Computer Architecture, Operating Systems, Database Systems, and Introduction to Calculus are the active courses. Their purpose is to establish reusable examples of substantive teaching, meaningful diagrams and interaction, and demanding assessment before the catalog grows again. Selection is not certification that every lesson has reached that standard.

The former ten-course computing-core design and retired course/path sources were removed from the active tree and remain recoverable from Git history. None of those retired materials are part of the site, search, books, or active-course validation.

## Active reference courses

| Course | Central question | Course design and sources | Evidence, not a widget quota |
| --- | --- | --- | --- |
| Introduction to Calculus | How do limits resolve the $0/0$ rate and infinite-sum paradoxes into rigorous continuous mathematics? | [Calculus manifest](../../src/data/course-manifests/calculus-intro.yml) | Single-claim interactive playgrounds with static twins; epsilon-delta proofs; theorem-driven derivation; complete diagnostic solutions |
| Computer Architecture | How does a machine execute a program, and what limits its performance? | [Architecture crosswalk](COMPUTER_ARCHITECTURE.md) | Representation and instruction traces; pipeline hazards; cache mapping; quantitative design with stated limits |
| Operating Systems | How does concurrent privileged code provide protected, persistent abstractions? | [OS crosswalk](OPERATING_SYSTEMS.md) | Pinned kernel labs; schedule and memory traces; device ownership; crash-state analysis and a verified kernel change |
| Database Systems | Which facts survive queries, concurrent updates, failures, and hostile access? | [Database crosswalk](DATABASE_SYSTEMS.md) | Exact query results; schema/invariant reasoning; plans and cost models; transaction/recovery traces and an adversarial capstone |

The canonical career roadmap is [Software Engineer](../../src/content/careers/software-engineer.json). It maps the core programming languages to focus on, four technical skill pillars, canonical books and open curricula, and a four-stage study sequence linking Introduction to Calculus, Computer Architecture, Operating Systems Engineering, and Database Systems with their practice and capstone pages. Course hours are summed from lesson estimates rather than independently advertised by the roadmap. Preparation, hardware/toolchain setup, and external reading remain separate commitments.

## Reuse contract for future work

Start from the learning problem, not a copy of a lesson's headings or a renamed simulator. The mandatory [course standard](../agent-rules/COURSE_STANDARD.md) remains authoritative.

1. Establish outcomes, entry skills, sources, omitted scope, and unseen assessment before writing.
2. Work through normal and boundary examples and verify every result. A source list cannot make a false worked solution correct.
3. Choose the local representation that exposes the mechanism: a diagram for fixed structure, an executable trace for state changes, a quantitative model for a variable relationship, and a proof for a general claim.
4. Export deterministic model functions from the actual component implementation and test those functions. A separate reimplementation in a test cannot establish that the displayed model works.
5. Keep exercises solvable from the lesson; provide diagnostic solutions or objective verification criteria. A generic “trace an unfamiliar mechanism” sentence is not an assessment.
6. Preserve keyboard access, narrow-screen readability, and meaningful static book output. Inspect representative pages from every module and run the full learner journey, not just a component fixture.
7. Publish accurate evidence boundaries: structural checks, model tests, visual inspection, external toolchain execution, and independent academic review are different claims.

## Admission and validation

`scripts/test_quality_contract.mjs` fixes the current active-course set and single path, verifies references/manifests, and checks workload arithmetic. Adding a course is a deliberate curriculum decision requiring a reviewed crosswalk and actual assessment evidence; it is not an automatic consequence of making a metadata file.

`npm run check:content` covers structure, integrity, and deterministic model regressions. `npm run check:build` validates all active rendered lessons and generates their books. `npm run check:e2e`, `npm run check:ux`, and `npm run test:visual` inspect the learner-facing surfaces. None is a pedagogical quality score. Integrity review warnings remain visible and require a content-level disposition, not extra ceremonial components.

External preparation resources were checked on 2026-09-14: [MIT 6.087](https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/), [MIT 6.042J](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/), and [The Missing Semester](https://missing.csail.mit.edu/). These are links to independently licensed materials, not copies of their assignments; LibreUni's readiness tasks and cross-course synthesis brief are original.
