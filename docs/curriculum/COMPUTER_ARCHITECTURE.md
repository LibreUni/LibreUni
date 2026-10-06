# Computer Architecture curriculum

Status: reviewed 2026-09-14 for the architecture exemplar rebuild. This is a design and evidence record, not a claim of accreditation.

## Course thesis and entry contract

Architecture is the study of the contracts and quantitative mechanisms that refine a program into observable hardware behavior: representation, ISA state, datapath/control, overlap, memory locality, I/O ownership, and parallel resource limits. The course asks learners to carry invariants across those boundaries rather than memorize named processor features.

Required preparation is systems programming (pointers, compilation, debugging), binary arithmetic, basic Boolean algebra, and elementary probability. Recommended preparation is an operating-systems course; virtual-memory and DMA lessons state their OS assumptions explicitly so the architecture course remains self-contained.

## Source-backed crosswalk

The scope was checked against [MIT 6.004 Computation Structures](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2009/), [Cornell CS 3410 Computer System Organization](https://www.cs.cornell.edu/courses/cs3410/2015sp/), [UC Berkeley CS 61C](https://cs61c.org/), and the [ACM/IEEE Computer Engineering Curricula 2016](https://www.acm.org/binaries/content/assets/education/ce2016-final-report.pdf). Canonical textbook anchors are Patterson and Hennessy, *Computer Organization and Design* (RISC-V edition), and Hennessy and Patterson, *Computer Architecture: A Quantitative Approach*. Content is synthesized, not copied.

| Expected material | Architecture treatment | Evidence produced |
| --- | --- | --- |
| Boolean/digital representation and sequential state | representation, combinational circuits, state | bit-level derivation, FSM trace, failure boundary |
| ISA and assembly | ISA semantics, ABI, exceptions, encoding lab | instruction trace and ABI decision |
| datapath, control, pipelining, hazards | single/multicycle control and timed refinement | stage schedule, forwarding/stall/flush invariant |
| caches, virtual memory, storage and I/O | AMAT, mapping, TLBs, DMA ownership | address decomposition, fault trace, descriptor protocol |
| performance and parallelism | CPI, Amdahl, roofline, SIMD, OoO | sensitivity analysis and falsifiable experiment |
| synthesis and assessment | binary lab, capstone, review, integrated assessment | defended design with proof, measurement, and fault injection |

Institution-dependent extensions include branch predictor microarchitecture, coherence protocol details, and device virtualization. Advanced extensions and deliberate omissions are RTL synthesis, electrical device physics, full compiler backend implementation, GPU microarchitecture, and production-specific ISA manuals; those would require a separate 150–200 hour specialization.

## Representation and interaction audit

Every architecture lesson was read (20 files in the manifest). The audit found that many sections still lack an adjacent worked trace or section-specific artifact; the integrity checker reports 20 uncovered-heading review findings. Existing prose is retained only where it supplies definitions, worked calculations, counterexamples, independent practice, diagnostic solutions, and references. Generic quiz/case checks are not treated as the primary artifact for stateful or quantitative claims.

Specific visual/interactive choices:

- `CacheHierarchyPlayground` in Cache Hierarchies exposes set mapping, LRU state, associativity, and conflict traces; its print state is deterministic.
- `AmdahlPlayground` in Performance Models exposes serial ceilings and processor count; it is paired with the derived equation and a static curve.
- `PageTablePlayground` in Virtual-Memory Hardware exposes ASID-tagged TLB hits, walks, permissions, and page faults.
- `DeviceIOPlayground` in I/O and Devices exposes polling/interrupt/DMA CPU occupancy and elapsed time under explicit assumptions.

Additional local representations are `RepresentationPlayground` for fixed-width interpretation, `PipelineHazardPlayground` for load-use and branch-flush timing, the request-controller FSM in Sequential State, and the nested-call sequence in Assembly and Calling Conventions. Datapath and Storage/Interconnects have explicit data/control and DMA translation diagrams. Models are placed after the relevant derivation and assumptions, not above the lesson as a generic introduction.

The remaining prose and trace exercises must not be called visually complete merely because they pass an audit. In particular, logic/circuits, ISA encoding, out-of-order retirement, and multicore coherence still warrant a dedicated visual/interaction review before using the whole course as a publication-quality template. The assessment and capstone require learner-authored traces, a correctness argument, a model with units, and a failure experiment; these require independent review rather than a widget score.

## Workload interpretation

The manifest's 20 lessons sum to 11,220 minutes (187 planned hours), including independent problems, the binary-design lab, performance investigation, capstone, review, and integrated assessment. These are author estimates, not measured learner completion times or awarded credit. Large allocations must be checked against the actual assignment burden in an academic review; changing minutes does not add teaching depth.

## Correctness repairs and executable evidence

The integrating review corrected the cache AMAT contribution (0.4 cycles from L2 lookup), the convolution accumulator bound (20 signed bits), timeout edge conventions, one-hot/binary encoding counts, an unterminated math delimiter, and the final assessment's next-PC branch target, explicit address inputs, and local/global miss-rate reasoning. The pipeline model now advances every older instruction through MEM and WB even when younger work stalls or is flushed. Its regression tests import the implementation used by the widget and check stage continuity and retirement, not a separate hand-written simulator.

The cache and representation tests also import production model functions. OS/DB models reused here retain their own narrower assumptions; the architecture prose explicitly derives the translated-address and I/O-cost examples used by those controls. The printed pipeline and cache tables use compact labels with legends instead of wide unbounded instruction strings.

## Honest limitations and release evidence

The playgrounds are bounded teaching models, not cycle-accurate implementations; each states its assumptions and omissions beside the control. Hardware-specific details such as replacement policies, coherence ordering, TLB shootdown instructions, and I/O barriers vary by ISA and OS, so lessons distinguish architectural guarantees from implementation examples.

Focused evidence for the current repair batch: the architecture manifest is an exact 20-lesson ordered index; the smoke test reports 20 lessons and 8 fenced executable code blocks, while playgrounds and diagrams are inventoried separately. Cache AMAT and virtual-memory exercises now carry concrete inputs, and Performance Investigation ships a deterministic fixture plus runnable effect-size calculation, explicitly separated from real-hardware evidence. The remaining uncovered-heading findings and whole-site build/E2E/PDF checks remain release work; passing mechanical checks is not a pedagogical certificate.
