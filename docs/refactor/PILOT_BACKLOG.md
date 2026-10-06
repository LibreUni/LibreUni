# Pilot backlog — Operating Systems

Source: [`os-repair-contract.md`](../curriculum/repair-contracts/os-repair-contract.md) (audit 2026-09; **re-verify each claim against current source before acting**). Status: `OPEN` → `CLAIMED` → `REVIEW` → `ACCEPTED`/`REJECTED`. Lessons: `src/content/lessons/operating-systems/<slug>.mdx`. Existing playgrounds: Scheduler, ConditionVariable, CrashConsistency, DiskScheduling, IsolationSchedule, LockScalability, PageReplacement, PageTable, AllocationFailure, DeviceIO. Only four have models tested in `scripts/test_os_models.mjs`.

Disposition legend: **K** = keep with targeted repair; **R** = rebuild/narrow without lowering level.

## Track E — executable evidence (engineers; blocks the labs)

| ID | Unit | Status |
|---|---|---|
| OS-E1 | Decide fixture policy with owner: (a) pinned xv6-rev5 checkout instructions + patch points, (b) in-repo executable model, or both. Record in DECISIONS | OPEN (owner) |
| OS-E2 | Scheduler-lab fixture: runnable WVT scheduler model with state transitions, failure injection, independent oracle that kills named wrong implementations | OPEN |
| OS-E3 | Device-driver-lab fixture: one complete Virtio lifecycle, deterministic completion/fault oracle | OPEN |
| OS-E4 | Filesystem-lab fixture: runnable rename core; crash extension separable | OPEN |
| OS-E5 | Model tests for **every** shipped OS playground (extend `scripts/test_os_models.mjs`) | OPEN |

## Exemplars (Phase 1, owner-approved before the swarm starts)

| ID | Lesson | Notes | Status |
|---|---|---|---|
| OS-X1 | interleavings-and-atomicity | K. Contract example 2 (lost update, linearization) is independently solved — reuse as the model-checked trace | OPEN |
| OS-X2 | page-tables-and-tlbs | K. Contract example 3 (Sv39 walk: VPN 7/12/301, offset 0x2A0, 2 MiB leaf R-X, permission failure) | OPEN |

## Lessons (one writer unit each)

| ID | Lesson | Disp. | Key repair | Status |
|---|---|---|---|---|
| OS-01 | operating-system-contract | K | claim-level sources, solved exercise | OPEN |
| OS-02 | traps-interrupts-system-calls | K | worked trap trace | OPEN |
| OS-03 | boot-and-kernel-organization | K | | OPEN |
| OS-04 | processes-threads-context-switches | K | | OPEN |
| OS-05 | process-api-ipc-signals | K | solved fork/exec/pipe trace | OPEN |
| OS-06 | cpu-scheduling | **R** | SJF/SRTF boundary: starvation example invalid for non-preemptive SJF (long job 100, short arrivals) — fix with preemptive SRTF; add solved schedules | OPEN |
| OS-07 | locks-and-memory-ordering | K | | OPEN |
| OS-08 | condition-variables-and-semaphores | K | | OPEN |
| OS-09 | deadlock-liveness-priority-inversion | K | | OPEN |
| OS-10 | address-spaces-and-translation | K | | OPEN |
| OS-11 | page-faults-cow-mmap | K | | OPEN |
| OS-12 | replacement-working-sets-thrashing | K | | OPEN |
| OS-13 | device-io-interrupts-dma | K | | OPEN |
| OS-14 | storage-devices-and-io-scheduling | K | | OPEN |
| OS-15 | file-system-interface-and-names | K | | OPEN |
| OS-16 | file-system-implementation | K | | OPEN |
| OS-17 | crash-consistency-and-journaling | K | | OPEN |
| OS-18 | protection-and-authority | K | | OPEN |
| OS-19 | virtual-machines | K | | OPEN |
| OS-20 | containers-and-resource-control | K | | OPEN |
| OS-21 | multicore-scalability-observability | K | | OPEN |
| OS-22 | comparative-kernel-design | **R** | fewer systems, two complete worked traces | OPEN |
| OS-23 | scheduler-lab | **R** | depends on OS-E2; runnable WVT model + xv6 path | OPEN |
| OS-24 | device-driver-lab | **R** | depends on OS-E3 | OPEN |
| OS-25 | file-system-lab | **R** | depends on OS-E4; fix same-inode rename: no-op, nlink stays 2 | OPEN |
| OS-26 | operating-systems-capstone | **R** | depends on real prior artifacts, not prose promises | OPEN |

OS-X1/X2 plus OS-01…OS-26 account for 28 lessons — verify slugs against `src/data/course-manifests/operating-systems.yml` in Phase 0 (two lessons in the manifest may map to units not listed; add units for any gap).

## Contract priorities (in order)
1. Ship or explicitly constrain executable lab fixtures and independent oracles.
2. Test every shipped OS playground model.
3. Repair the four assessment boundaries (scheduling SJF, lost update, Sv39 walk, rename identity).
4. Reduce specialist comparison breadth, keep core mechanisms.
5. Report mechanical vs pedagogical evidence separately.

## Cross-cutting (integrator only)
| ID | Task | Status |
|---|---|---|
| OS-S1 | Claim-level sources per lesson; keep xv6-rev5 pin consistent | OPEN |
| OS-S2 | OS has 0 authored Quiz/CaseStudy/CodeExercise: add only where an outcome demands unaided retrieval, per D-0005 | OPEN |
| OS-S3 | Keep `docs/curriculum/OPERATING_SYSTEMS.md`, manifest, `course-quality.json` in step after each accepted batch | OPEN |
