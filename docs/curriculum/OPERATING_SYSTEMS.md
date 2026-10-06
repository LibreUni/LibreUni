# Operating Systems Engineering curriculum

Status: adopted 2026-08-23 for the Operating Systems course rebuild. This document records the source-backed curriculum boundary and review contract. It does not claim accreditation or equivalence to a university course.

## Course thesis

An operating system is a concurrent program that converts hardware mechanisms into protected, persistent abstractions. The course therefore follows one causal spine:

1. an event transfers control into privileged code;
2. the kernel validates authority and manipulates process state;
3. scheduling and synchronization decide which work may proceed;
4. address translation and faults construct isolated memory;
5. interrupts, DMA, and queues connect devices without surrendering the CPU;
6. a filesystem turns volatile execution into recoverable state; and
7. protection and isolation determine the blast radius when a component fails.

The course uses xv6 on RISC-V as the small implementation model and production kernels as comparative evidence. Every source trace and lab interface targets the official `xv6-riscv-rev5` tag at commit [`7d7adbb1b0acbd67c9766a20d0f9900fef2789fa`](https://github.com/mit-pdos/xv6-riscv/tree/7d7adbb1b0acbd67c9766a20d0f9900fef2789fa). It does not present xv6 policy, scale, or security as production practice.

## Entry contract

Required preparation:

- C control flow, pointers, structs, arrays, bit operations, function pointers, object lifetime, and manual memory management;
- stacks, queues, trees, hash tables, asymptotic analysis, and invariants;
- registers, calling conventions, caches, privilege modes, interrupts, the MMU, and the TLB;
- command-line use, Git, Make, a debugger, and sanitizers; and
- the ability to explain a failing test from a trace rather than by trial-and-error patching.

Concurrency is not an entry requirement. Interleavings, atomicity, locks, condition variables, deadlock, and memory ordering are developed from first principles.

## Benchmark evidence

The mechanism sequence and implementation depth were checked against primary course sources:

- [MIT 6.1810 Operating System Engineering](https://pdos.csail.mit.edu/6.1810/2025/schedule.html) couples system calls, page tables, traps, drivers, copy-on-write, locking, scheduling, filesystems, crash recovery, networking, `mmap`, virtual machines, and multicore topics to cumulative xv6 labs.
- [UC Berkeley CS 162](https://cs162.org/) treats operating systems as a design-and-implementation course and uses a substantial kernel project rather than a survey-only assessment.
- [Stanford CS 140](https://web.stanford.edu/~ouster/cgi-bin/cs140-spring20/) centers concurrency, scheduling, virtual memory, storage, filesystems, recovery, I/O, security, and virtual machines.
- [University of Cambridge Operating Systems](https://www.cl.cam.ac.uk/teaching/current/OpSystems/) explicitly covers protection, processes, scheduling, memory and replacement, polling, interrupts, DMA, files, and Unix as a case study.
- [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/) supplies the virtualization–concurrency–persistence conceptual organization and trace-oriented homework model.
- The [xv6 RISC-V source and book](https://pdos.csail.mit.edu/6.1810/2025/xv6.html) provide the compact kernel used for implementation reading. Learners retain upstream copyright and license notices.

LibreUni lab briefs are original. They may point to upstream code and documentation, but they do not reproduce another institution's assignment text or private solutions.

## Workload and sequence

The planned workload is 11,370 minutes (189.5 hours), represented as 7.5 ECTS in the catalog. `estimatedMinutes` includes reading, prediction, simulation, trace work, implementation, tests, design notes, and reflection—not page-scroll time.

| Module | Lesson | Minutes | Primary evidence produced |
| --- | --- | ---: | --- |
| 1. Crossing the kernel boundary | The operating-system contract | 300 | mechanism map and abstraction-failure diagnosis |
|  | Traps, interrupts, and system calls | 330 | privilege-transition trace and validation argument |
|  | Boot and kernel organization | 330 | RISC-V boot trace and subsystem-boundary critique |
| 2. Processes and CPU time | Processes, threads, and context switches | 330 | state-machine trace and saved-context audit |
|  | Process API, IPC, and signals | 330 | descriptor/process-tree trace and safe signal design |
|  | CPU scheduling as policy | 330 | policy comparison under adversarial workloads |
|  | Scheduler lab | 600 | tested xv6 scheduling change and measurement memo |
| 3. Concurrency and liveness | Interleavings and atomicity | 330 | exhaustive small-state interleaving analysis |
|  | Locks, atomics, and memory ordering | 360 | invariant proof and litmus-test explanation |
|  | Condition variables and semaphores | 360 | wait-loop trace and bounded-buffer implementation |
|  | Deadlock, liveness, and priority inversion | 330 | resource graph, prevention decision, and protocol trace |
| 4. Virtual memory | Address spaces and translation | 330 | address-translation decomposition |
|  | Page tables and TLBs | 360 | multilevel walk, permission, and TLB trace |
|  | Page faults, copy-on-write, and `mmap` | 360 | fault-handler decision table and COW implementation plan |
|  | Replacement, working sets, and thrashing | 330 | replacement trace and overload diagnosis |
| 5. Devices and I/O | Device I/O, interrupts, and DMA | 360 | polling/interrupt/DMA cost model and race trace |
|  | Storage devices and I/O scheduling | 330 | media-aware queue policy analysis |
|  | Device-driver lab | 720 | interrupt-driven xv6 device path with fault tests |
| 6. Persistence | Filesystem interface and names | 300 | pathname/open-file-description trace |
|  | Filesystem implementation | 360 | inode/block/cache lookup and allocation trace |
|  | Crash consistency and journaling | 360 | crash-state enumeration and recovery proof obligation |
|  | Filesystem lab | 720 | recoverable xv6 filesystem extension and crash matrix |
| 7. Protection, isolation, and synthesis | Protection and authority | 330 | confused-deputy analysis and authority redesign |
|  | Virtual machines | 330 | trap-and-translation boundary trace |
|  | Containers and resource control | 330 | namespace/cgroup threat and overload analysis |
|  | Multicore scalability and observability | 360 | contention diagnosis from traces and counters |
|  | Comparative kernel design | 300 | mechanism comparison with explicit workload assumptions |
|  | Operating-systems capstone | 1,260 | defended kernel change, evaluation, failure analysis, and handoff |

## Cumulative implementation spine

All implementation work branches from the licensed xv6 RISC-V rev5 commit `7d7adbb1b0acbd67c9766a20d0f9900fef2789fa`. Every checkpoint requires a clean build, upstream tests, task-specific tests, and a short design record. A learner may use a different teaching kernel only after mapping equivalent mechanisms and test hooks.

Two checkout modes serve different evidence needs:

- The **clean-lab checkout** starts each published lab from the pinned upstream commit. This makes its ABI, patch boundary, tests, and review reproducible without depending on earlier student work.
- The **cumulative integration branch** applies accepted checkpoints in course order. After each integration commit, the learner reruns upstream, earlier-checkpoint, and current-checkpoint tests and records any interface adaptation. The capstone starts from this branch.

The clean checkout is the specification reference; the cumulative branch is the systems-integration artifact. Code or instructions from another xv6 revision must not be mixed into either one without an explicit port and compatibility record.

```text
upstream xv6-riscv-rev5 @ 7d7adbb1
    │
    ├── boundary probe: trace one system call and one interrupt
    │
    ├── scheduler lab: add policy + accounting + adversarial workloads
    │
    ├── synchronization checkpoint: protect one shared kernel invariant
    │
    ├── virtual-memory checkpoint: implement or instrument COW/mmap behavior
    │
    ├── device-driver lab: interrupt-driven queue + injected failures
    │
    ├── filesystem lab: persistent feature + crash-state matrix
    │
    └── capstone: one substantial kernel change, measured and defended
```

Published solutions stop at traces, rubrics, test oracles, and small isolated examples. They do not disclose complete repository patches for the cumulative labs.

## Interaction and visual contract

An interactive is included only when changing state reveals a relationship that prose cannot expose as efficiently. Each simulation must state its model, units, and omissions; support keyboard operation; pair color with text or shape; expose the selected state in text; and print a deterministic representative state.

| Concept | Required local surface | Question the learner must answer before moving it |
| --- | --- | --- |
| Privilege transfer | system-call path stepper | Which state must hardware save before kernel C can run? |
| Scheduling | policy/workload/quantum simulator | Which metric improves, and which one gets worse? |
| Atomicity | interleaving explorer | At what first step does the invariant become recoverably false? |
| Waiting | condition-variable trace | Can a notification be remembered without a predicate? |
| Translation | page-table/TLB explorer | Which check can stop this access before memory is touched? |
| Replacement | frame and fault-curve simulator | Does adding a frame always reduce FIFO faults? |
| I/O delivery | polling/interrupt/DMA cost model | Which costs scale with bytes and which with events? |
| Disk queues | seek-order explorer | Why is a seek policy not an SSD policy? |
| Recovery | crash-point simulator | What is the last durable invariant at this cut? |
| Isolation | boundary/blast-radius model | Which trusted layer is shared across tenants? |
| Multicore locking | contention/speedup model | Is the curve evidence of serialization or only correlation? |

Static diagrams remain preferable for fixed ownership, control flow, state machines, and hierarchy. Decorative diagrams, generic process arrows, and interactions that merely satisfy a count are prohibited.

## Assessment contract

Each lesson distributes four forms of work through the explanation:

1. **retrieval** before a relevant model is revealed;
2. **application** to a fully specified trace or small implementation;
3. **transfer** under a changed workload, failure, or assumption; and
4. **synthesis** as a design claim supported by evidence.

Choice questions are exceptional. When used, distractors must represent plausible mechanism errors, options must be syntactically parallel, length must not reveal the answer, and feedback must be option-specific. Labs are graded from behavior, invariants, tests, measurement quality, failure analysis, and the learner's oral or written defense—not token presence or output resemblance alone.

The capstone requires external human review. The site may provide a rubric and test harness, but it must not claim that an automatically rendered page can validate engineering judgment, authorship, or a defense.

## Deliberate boundaries

- Shell syntax, PowerShell, package managers, and distribution selection belong in tooling or administration material, not this mechanism course.
- Chronological Unix, Windows, macOS, BSD, Linux, and mobile histories are removed. Production systems appear only when two concrete implementations illuminate a mechanism trade-off.
- Distributed systems, networking protocols, compiler construction, real-time schedulability analysis, embedded firmware, and formal kernel verification require dedicated courses or later electives.
- Spectre-class side channels, persistent memory, GPUs, eBPF, io_uring, seL4 proofs, and real-time kernels are research or extension directions. A survey paragraph is not treated as mastery.
- Numerical simulator results are model outputs. Learners must measure real code before making a production claim.

## Release gate

The rebuilt course is not complete until all of the following hold:

- every manifest lesson exists and every replaced legacy lesson is unreachable;
- each lesson passes the authoring contract in `COURSE_STANDARD.md` and the integrity checks in `COURSE_INTEGRITY.md`;
- independent reviewers separately audit domain correctness, pedagogy, assessment leakage, interaction, accessibility, and visual hierarchy;
- all source-backed factual claims are cited or tracked, and every simulation exposes assumptions;
- lesson pages, print/PDF output, and simulations are inspected at desktop and mobile widths in light and dark themes; and
- the cumulative labs build and their public tests distinguish a correct implementation from named incorrect implementations.
