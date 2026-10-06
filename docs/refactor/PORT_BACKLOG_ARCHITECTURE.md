# Port backlog — Computer Architecture (Phase 4, after the OS pilot)

Pilot is Operating Systems (see `PILOT_BACKLOG.md`). Use this backlog only after the OS pattern is extracted; Architecture is the designated course for abstract/diagram-heavy patterns (state traces, waveforms, datapath).

Source of dispositions: [`architecture-repair-contract.md`](../curriculum/repair-contracts/architecture-repair-contract.md) (audit 2026-09-16; **verify each claim against current source before acting** — lessons may have changed since). Unit status: `OPEN` → `CLAIMED` → `REVIEW` → `ACCEPTED`/`REJECTED`.

Path prefix for lessons: `src/content/lessons/computer-architecture/<slug>.mdx`. Existing models: `cacheModel.mjs`, `pipelineModel.mjs`, plus Amdahl/DeviceIO playgrounds in `src/components/playgrounds/`.

## Exemplar lessons for this course (CA-X1/X2)

| ID | Lesson | Decision | Status |
|---|---|---|---|
| CA-X1 | cache-hierarchies | Exemplar: keep geometry/AMAT/locality; supply AMAT exercise inputs (level times, local miss rates); state coherence boundary | OPEN |
| CA-X2 | virtual-memory-hardware | Exemplar: concrete four-level translation + COW/TLB invalidation trace; fix missing PFN/PPN and level ordering | OPEN |

## Representation

| ID | Lesson | Decision | Status |
|---|---|---|---|
| CA-01 | digital-representation | Rebuild extension/truncation and FP exercises; keep modular arithmetic. Include signed/unsigned 5-bit addition check | OPEN |
| CA-02 | logic-and-combinational-circuits | One complete adder/timing derivation; bounded truth-table investigation | OPEN |
| CA-03 | sequential-state | Clocked waveform, reset race, ready/valid invariant | OPEN |

## Execution

| ID | Lesson | Decision | Status |
|---|---|---|---|
| CA-04 | instruction-set-architecture | Encoding + exception traces; narrow history | OPEN |
| CA-05 | assembly-and-calling-conventions | ABI param/return and unwinding traces | OPEN |
| CA-06 | datapath-control | Full control table; stalled memory-response trace | OPEN |
| CA-07 | pipelining | Add structural/control/exception traces; clarify boundary with hazards (uses `pipelineModel.mjs`) | OPEN |
| CA-08 | hazards-and-branches | Narrow to detection/forwarding/flush/adversarial traces; remove OoO duplication | OPEN |

## Memory / I/O

| ID | Lesson | Decision | Status |
|---|---|---|---|
| CA-09 | storage-and-interconnects | Narrow to ordering, DMA ownership, durability; one authoritative lifecycle trace | OPEN |
| CA-10 | io-and-devices | Register/queue/timeout/virtual-device examples on the same ownership contract (DeviceIOPlayground) | OPEN |

## Limits

| ID | Lesson | Decision | Status |
|---|---|---|---|
| CA-11 | performance-models | One end-to-end CPI/Amdahl/roofline sensitivity example with units | OPEN |
| CA-12 | superscalar-and-out-of-order | ROB/rename/wakeup/memory-order trace; defer protocol microdetails | OPEN |
| CA-13 | multicore-and-simd | Coherence race, reduction tree, bandwidth, determinism counterexamples | OPEN |
| CA-14 | performance-investigation | Small shipped dataset → controls, uncertainty, falsification (fixture must exist) | OPEN |

## Synthesis

| ID | Lesson | Decision | Status |
|---|---|---|---|
| CA-15 | binary-design-lab | Complete encoded-byte round trip + canonicality proof; runnable fixture required | OPEN |
| CA-16 | architecture-capstone | Fix operation-intensity convention ("68 operations"); provide model exemplar | OPEN |
| CA-17 | architecture-review | One complete reject/repair evidence packet | OPEN |
| CA-18 | architecture-assessment | One solved integrated trace; repair under-specified prompts | OPEN |

## Cross-cutting (integrator only, serialize)

| ID | Task | Status |
|---|---|---|
| CA-S1 | Claim-level sources for every lesson (MIT 6.004, Cornell CS 3410, Berkeley CS 61C, ACM/IEEE CE2016, canonical texts); replace landing-page-only citations | OPEN |
| CA-S2 | Model tests for every shipped CA playground (`npm run test:models`) | OPEN |
| CA-S3 | Correct the "20 lessons / 8 code blocks" wording: `course_stats.py` counts executable fenced blocks only, not playgrounds/diagrams | OPEN |
| CA-S4 | Audit the stock Quiz/CaseStudy on all 20 lessons: keep only where tied to a stated outcome | OPEN |
| CA-S5 | Update `docs/curriculum/COMPUTER_ARCHITECTURE.md`, manifest, `course-quality.json` after each accepted batch | OPEN |

Count check: CA-X1, CA-X2 and CA-01…CA-18 are 20 distinct lessons, matching the 20-lesson manifest. Phase 0 should still diff the slugs against `src/data/course-manifests/computer-architecture.yml`.
