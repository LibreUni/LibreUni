# Computer Architecture repair contract

Audit date: 2026-09-16. Scope: the 20 lessons listed by `src/data/course-manifests/computer-architecture.yml`, their manifest, metadata, and architecture-specific models/components. Existing worktree changes outside that scope are intentionally untouched.

## Evidence and release boundary

The manifest is an exact 20-lesson index and the smoke test passes (`python3 scripts/course_stats.py computer-architecture`: 20 lessons, 8 code blocks). The `8 code blocks` figure is the smoke script's executable fenced-code inventory; it does not count React playgrounds, PlantUML, or static diagrams as code blocks. The strict integrity audit nevertheless reports 20 review findings, all `uncovered-heading`; it reports no blocking mechanical errors. This is evidence of a source-structure gap, not evidence that the course is sound. The current curriculum note itself admits that logic/circuits, ISA encoding, out-of-order retirement, and multicore coherence still need visual/interaction review.

The dominant defect is not a missing widget. Most substantive `##` sections contain exposition but no adjacent worked example, counterexample, or section-specific practice. For example, `hazards-and-branches` has no worked trace for “Dependence graphs and hazard names”, “Forwarding and interlocks”, “Structural hazards and resource contracts”, “Control hazards”, or “Flushes, speculation, and side effects”; `performance-investigation` has no worked investigation in any of its model/control sections; and `architecture-assessment` presents six assessment parts without teaching artifacts for Parts I, IV, V, or VI. A single quiz at each opening does not assess these outcomes.

## Concrete learning failures

- `digital-representation`: the section on extension/truncation names safety boundaries but provides no worked sign/zero-extension counterexample; exercise 4 asks for a floating-point relative-spacing derivation whose solution gives a varying “at most” bound without pinning down the exact binade/normalization convention.
- `logic-and-combinational-circuits`: canonical minimization, adders, timing hazards, CMOS cost, and verification are named but lack a complete truth-table-to-gate derivation plus a propagation-delay counterexample. The only visual is a static adder diagram; no learner-controlled truth-table or timing trace exists.
- `sequential-state`: latches/flip-flops, reset, and verification are explained but not worked against an actual waveform or reset race. The FSM diagram is useful, but does not expose state over clock edges.
- `instruction-set-architecture`: RISC/CISC, consistency, exceptions, compiler reasoning, and verification are mostly declarative. Exercise 2 is underdetermined (“design an encoding” without an instruction inventory), while exercise 1 has no concrete bytes/address to trace.
- `assembly-and-calling-conventions`: several sections (parameter passing, tail calls, unwinding, security boundaries) have no concrete stack/register trace. The nested-call diagram is a good local aid but cannot establish ABI correctness across argument classes.
- `datapath-control`: ALU sharing, next-PC logic, memory side effects, and refinement have no complete multicycle control table or response-stall trace. The prose says an unready response must not duplicate a device write, but gives no transition sequence proving it.
- `pipelining` and `hazards-and-branches`: these overlap without a declared boundary. Pipeline has worked timing and load-use examples, but structural/control hazards and exceptions lack traces; hazards repeats the topic with no worked forwarding/flush schedule. Learners cannot tell which model is authoritative.
- `cache-hierarchies`: locality, mapping, writes, and stride are worked, but replacement, nonblocking misses, coherence/consistency, and security are prose-only. Exercise 2 has no numerical hierarchy parameters, so it cannot be solved as written. The cache playground covers only one bounded mapping model and omits write/coherence behavior.
- `virtual-memory-hardware`: the page-table playground uses a deliberately tiny model, but the lesson's 48-bit four-level exercise says “supplied PFN” without supplying one. Page-table structures, protection, faults, replacement, aliases, and invalidation lack a concrete fault/invalidation trace adjacent to the claims.
- `storage-and-interconnects` and `io-and-devices`: DMA ownership is described twice, but there is no single authoritative descriptor protocol or worked late-completion trace. DRAM, persistent storage, virtualization, timeout semantics, and verification are named without concrete timing/state examples; `DeviceIOPlayground` covers occupancy, not ownership safety.
- `performance-models` and `performance-investigation`: formulas are present, but CPI, Amdahl, roofline, measurement uncertainty, and confounders are not carried through one complete measured example. The investigation lesson's “worked investigation plan” is a checklist rather than data, calculation, or falsifying observation.
- `superscalar-and-out-of-order`: renaming and precise retirement have worked examples, but wakeup, memory disambiguation, branch recovery, replay, and energy trade-offs lack a cycle-level ROB/physical-register trace. The curriculum explicitly flags this gap.
- `multicore-and-simd`: Amdahl, message passing, and masks have examples, but coherence, reductions, scheduling, bandwidth, and determinism lack a race or reduction trace. No interactive model exposes cache-line ownership or reduction tree error.
- `binary-design-lab`: parser failure has examples, but the encoding section does not show a full byte sequence round trip with canonicality and bounds checks. Lab tasks and proof obligations provide requirements, not a solvable reference trace.
- `architecture-capstone`, `architecture-review`, and `architecture-assessment`: these are legitimate synthesis/assessment surfaces, but their sections are not supported by local exemplars. The capstone's arithmetic-intensity estimate says “68 arithmetic operations” while mixing multiplies/adds and calling the result GFLOP-equivalent; it needs an explicit operation convention. Review asks for evidence levels without a complete sample packet. Assessment has a large diagnostic guide but no worked integrated trace before the learner is graded.

## Outcome-to-assessment gaps

Outcomes routinely claim proof, transfer, or design under changed parameters, while the only universal assessment is a seven-item prose list plus a stock opening quiz. In particular: logic timing has no waveform calculation; ISA encoding has an under-specified exercise; cache AMAT lacks exercise inputs; VM translation lacks the promised PFN; DMA late-write safety has no executable or state-trace check; OoO retirement has no schedule artifact; and performance investigation has no measured dataset. Assessment and capstone demand learner-authored traces and experiments, but do not provide one complete model-to-evidence exemplar. These are outcome gaps even where metadata and solution headings exist.

## Named-but-untaught scope and deliberate narrowing

Narrow or explicitly defer RISC/CISC history, CMOS/electrical device physics, full compiler backend implementation, production ISA-specific encodings, GPU microarchitecture, detailed coherence protocols, virtualization implementation, DRAM row-buffer scheduling, and exact floating-point microarchitecture. Retain them only as bounded contrasts tied to the central invariant. Do not claim mastery from a paragraph or citation. The core taught spine is representation → state → ISA/ABI → datapath → timed overlap → locality/translation → ownership/I/O → quantitative limits → synthesis.

## Independent exercise checks (counterexample/calculation evidence)

1. **Digital representation, exercise 1.** `10110` is 22 unsigned and −10 signed; `01011` is 11. Five-bit addition yields `00001`. Signed sum −10+11=1, so no signed overflow. Unsigned 22+11=33 exceeds 31, so carry-out is 1. One bit pattern supports different predicates; any solution claiming signed overflow is wrong.
2. **Pipelining, exercise 5.** Branch penalty contribution is `0.20 × (1−0.92) × 5 = 0.08` cycles/instruction. Adding a one-cycle load-use stall for 10% gives CPI `1 + 0.08 + 0.10 = 1.18`, assuming independent additive stalls. This exposes the missing assumption: overlap between branch recovery and load stalls would require a joint trace.
3. **Pipelining, exercise 7.** Design A has CPI `1 + .15×.10×12 = 1.18`, time/instruction `1.18×0.7 = 0.826 ns`. Design B has CPI `1 + .15×.10×3 = 1.045`, time `1.045×1.2 = 1.254 ns`; A wins despite the larger penalty because its clock is much faster. The original exercise is solvable, but needs an explicit “ignore all other stalls” assumption. (A prior audit draft incorrectly used 1.3 ns; the lesson prompt and existing diagnostic solution use 1.2 ns.)
4. **Multicore, exercise 6.** Work/span lower bounds at 32 processors are `W/P=1000/32=31.25` and `S=40`, hence `T≥40` time units; ideal speedup is at most `1000/40=25`, not 32. A schedule attaining 40 would require enough parallel work at every level; span alone does not prove attainability.
5. **Virtual memory, exercise 1 (counterexample).** Four 9-bit indexes consume 36 VPN bits and a 12-bit offset completes a 48-bit VA. A numeric physical address cannot be computed from the exercise as written because its “supplied PFN” is absent; any concrete PA answer would be invented. A repaired version must provide a PFN and page-table level ordering.
6. **Cache, exercise 2 (counterexample).** The prompt requests a three-level AMAT “with explicit local miss rates” but supplies none. The valid general form is `t1 + m1(t2 + m2(t3 + m3 tm))`; a numeric answer is impossible until all times/rates are stated. This is an assessment-design defect, not learner difficulty.

## Coherent arc and file decisions

| Arc position | Lesson | Decision |
|---|---|---|
| Representation | digital-representation | Rebuild extension/truncation and floating-point exercises; retain modular arithmetic.
| Representation | logic-and-combinational-circuits | Rebuild with one complete adder/timing derivation and a bounded visual truth-table investigation.
| Representation | sequential-state | Rebuild around a clocked waveform, reset race, and ready/valid invariant.
| Execution | instruction-set-architecture | Rebuild encoding and exception traces; narrow history to contrasts that affect semantics.
| Execution | assembly-and-calling-conventions | Rebuild ABI parameter/return and unwinding traces; retain nested-call core.
| Execution | datapath-control | Rebuild full control table and stalled memory-response trace.
| Execution | pipelining | Retain timed refinement; add structural/control/exception traces and clarify boundary with hazards.
| Execution | hazards-and-branches | Narrow to dependency detection, forwarding, flush, and adversarial traces; remove OoO duplication.
| Memory/I/O | cache-hierarchies | Retain geometry/AMAT/locality; add supplied quantitative practice and state the coherence boundary.
| Memory/I/O | virtual-memory-hardware | Add concrete four-level translation and COW/TLB invalidation trace; fix missing PFN.
| Memory/I/O | storage-and-interconnects | Narrow to ordering, DMA ownership, durability; add one authoritative lifecycle trace.
| Memory/I/O | io-and-devices | Rebuild register/queue/timeout/virtual-device examples around the same ownership contract.
| Limits | performance-models | Add one end-to-end CPI/Amdahl/roofline sensitivity example with units.
| Limits | superscalar-and-out-of-order | Rebuild with ROB/rename/wakeup/memory-order trace; explicitly defer protocol microdetails.
| Limits | multicore-and-simd | Add coherence race, reduction-tree, bandwidth, and determinism counterexamples.
| Limits | performance-investigation | Rebuild from a small dataset through controls, uncertainty, and falsification.
| Synthesis | binary-design-lab | Retain parser safety; add complete encoded byte round trip and canonicality proof.
| Synthesis | architecture-capstone | Retain image pipeline brief; correct operation-intensity convention and provide a model exemplar.
| Synthesis | architecture-review | Retain review role; add one complete reject/repair evidence packet.
| Synthesis | architecture-assessment | Retain integrated parts; add one solved representative trace and repair under-specified prompts.

Every rebuilt lesson should place its local artifact immediately after the concept it teaches, include a counterexample and an omission statement, and provide a complete solution or operational rubric. Components are justified by the outcome (state trace, quantitative control, or decision), not by count. The binary-design lab, performance-investigation, and capstone must also distinguish a written protocol/rubric from executable evidence: a learner-facing claim that an experiment or parser “can be tested” is delivery only when the repository ships a fixture/data path, deterministic oracle or expected output, and documented failure injection. Otherwise the lesson must label the work as externally run and specify that boundary.

The repaired assessment inputs are part of this contract: cache AMAT exercise 2 must supply concrete level times and local miss rates (or remain symbolic), and VM exercise 1 must supply the final PPN/PFN and level ordering if a numeric physical address is requested. Missing inputs are not an acceptable “unfamiliar case.”

## Source audit

The course and curriculum cite respected primary university material (MIT 6.004, Cornell CS 3410, Berkeley CS 61C, ACM/IEEE CE2016) and canonical textbooks, but most lessons provide only generic course landing pages and no claim-level chapter/lecture anchors or genuine source-tracking comments. Before rewriting factual material, verify the relevant lecture/textbook sections and add visible, specific references. Treat the existing generic bibliography as a starting point, not evidence that each paragraph is sourced.

## Review gate before implementation

This contract intentionally precedes lesson edits. Peer review should confirm the arc, scope boundary, and identified under-specified exercises. After approval, implement file by file with `apply_patch`; run focused model tests plus course smoke/integrity, then the integrating agent owns full build, browser, PDF, and UX release checks.
