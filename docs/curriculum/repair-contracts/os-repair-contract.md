# Operating Systems repair contract

Audit date: 2026-09-16. This contract covers the 28 manifest lessons, OS metadata/curriculum, and OS-owned playground models/tests. It precedes implementation and does not treat smoke or integrity output as a pedagogical certificate.

## Evidence boundary and required repair

The course has a strong causal spine (trap boundary → process state → concurrency → translation → I/O → persistence → isolation), good xv6-rev5 pinning, and mostly authoritative references. Its central release defect is executable evidence: `scheduler-lab.mdx:288–347`, `device-driver-lab.mdx:903–948`, and `file-system-lab.mdx:1471–1510` promise tests that kill named wrong implementations, but the repository contains no runnable xv6 fixture, implementation patch point, fault hooks, or public lab harness for those claims. `scripts/test_os_models.mjs:15–55` tests only four visualization models and cannot establish kernel correctness.

Relabeling those promises as “contracts” is not sufficient. The core labs must retain university-level implementation depth and become genuinely doable: provide a runnable, pinned fixture or a justified equivalent executable model with state transitions, failure injection, and independent oracles that preserve the stated learning outcome. If a complete xv6 environment cannot be shipped, the lesson must say exactly which evidence is executable locally and which requires an external checkout; it must not claim that a learner can submit or validate a kernel change using repository assets that do not exist. Specialist extensions (Linux EEVDF, full Virtio feature matrices, production ext4/JBD2, multi-architecture VM details) may be deferred; invariants, concurrency, protection, translation, recovery, and independent testing are essential and must not be removed merely because they are difficult.

## Four independently solved exercises / counterexamples

### 1. CPU scheduling: SJF theorem boundary and starvation

**Prompt:** The lesson asks for a starvation construction with a long job of service 100 and a service-1 job arriving just before every scheduling decision (`cpu-scheduling.mdx:138–144`).

**Solution:** Under non-preemptive SJF, the long job starts at time 0 and cannot be displaced once selected; the arriving jobs wait behind it. Therefore this is not a valid starvation execution for *non-preemptive* SJF. The intended starvation counterexample requires preemptive SRTF (or a policy that reselects before the long job starts): at time 0 the long job is ready, but a service-1 job arrives at each decision boundary before the long job is dispatched, so the long job's waiting time is unbounded. The simultaneous-arrival SJF interchange theorem remains intact; its assumptions fail because arrivals are no longer simultaneous and the schedule is preemptive. This catches a real rubric ambiguity rather than rewarding the keyword “starvation.”

### 2. Concurrency: lost update and linearization

**Prompt:** `interleavings-and-atomicity.mdx:82–109` expands two `counter++` operations into load, local add, and store and asks which invariant fails first.

**Solution:** Start with `counter=0`. Let T1 load 0, T2 load 0, T1 compute 1, T2 compute 1, T1 store 1, T2 store 1. Both logical increments completed, but the final value is 1, so `counter = completed increments` is false at T2's store. The first mechanism error is not the final observation; it is allowing both operations to derive a result from the same version without a unique linearization point. A mutex around the whole read/modify/write sequence gives one linearization point per increment. A check after both stores cannot repair the lost update because the missing information is no longer recoverable.

### 3. Virtual memory: Sv39 walk and permission failure

**Prompt:** `page-tables-and-tlbs.mdx:127–137` gives `VPN[2]=7`, `VPN[1]=12`, `VPN[0]=301`, offset `0x2A0`, and says that level 1 contains an `R-X` leaf.

**Solution:** The walker indexes level 2 with 7, then level 1 with 12 and finds a leaf. Because the leaf is a 2 MiB mapping, `VPN[0]=301` supplies the low PPN field; the offset remains `0x2A0`. A read or execute can proceed only if the corresponding permission bit is set; a write is rejected before memory access because the leaf is `R-X`. The translation result is intentionally not a fabricated physical address: the exercise omits the level-1 PPN, so only the concatenation rule and permission verdict are computable. A numeric physical address would be invented. The repair must either supply the PPN or change the assessment to ask only for the decomposition and fault classification.

### 4. Filesystems: rename identity and link accounting

**Prompt:** `file-system-lab.mdx:1360–1373` (the two-name/one-inode checkpoint) asks what happens when `/a/old` and `/b/new` are hard links to the same inode.

**Solution:** This is a same-inode no-op under the declared contract. Both directory entries remain, and `nlink` remains 2. A replacement algorithm that decrements the destination inode's link count merely because the destination name exists violates the invariant that regular-file `nlink` equals directory references. Identity must be compared as `(device,inode)`, not by pathname strings. By contrast, if `/b/new` names a distinct inode, successful replacement removes exactly one directory edge to that inode; an open descriptor can keep the displaced inode alive after its `nlink` reaches zero. A test that checks only file bytes misses both the alias bug and the open-descriptor lifetime rule.

## Lesson decisions and sequence

Keep with targeted repair: contract, traps, boot, process/context, process API, interleavings, locks, condition variables, deadlock, address translation, page tables, page faults/COW/mmap, replacement, device I/O, storage scheduling, filesystem interface, filesystem implementation, crash consistency, protection, VMs, containers, and multicore observability.

Rebuild or narrow without lowering the level: CPU scheduling (fix the SJF/SRTF boundary); comparative kernel design (fewer systems and two complete worked traces); scheduler lab (runnable WVT model plus xv6 path); device-driver lab (one complete Virtio lifecycle with deterministic completion/fault oracle); filesystem lab (runnable rename core plus explicitly separable crash extension); capstone (depends on real prior artifacts, not prose promises).

Priority: (1) ship or explicitly constrain executable lab fixtures and independent oracles; (2) test every shipped OS playground model, not only the four currently bundled; (3) repair the four assessment boundaries above; (4) reduce specialist comparison breadth while preserving core OS mechanisms; (5) validate smoke/integrity/build and report mechanical versus pedagogical evidence separately.

## Architecture contract peer review

The architecture contract is approved in principle. Its examples are concrete and technically useful: the signed/unsigned five-bit addition, CPI calculations, work/span bound, missing VM PFN, and under-specified AMAT exercise are independently checkable. It correctly distinguishes uncovered-heading findings from proof of quality, identifies the representation → state → ISA/ABI → datapath → timing → locality/I/O → limits spine, and requires claim-level source verification.

Requested changes before implementation:

- Make the same executable-evidence rule explicit for `binary-design-lab`, `performance-investigation`, and the capstone: a protocol or rubric is not a runnable experiment unless a fixture/data path exists.
- Correct the wording around the architecture “20 lessons / 8 code blocks” claim if model components are counted separately; state exactly what `course_stats.py` inventories.
- For the cache AMAT and VM PFN examples, carry the repaired inputs into the lesson contract so the review does not stop at diagnosis.

These are release-contract changes, not objections to the technical direction. No architecture files were edited.
