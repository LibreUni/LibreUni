# LibreUni computing-core course crosswalk

Status: adopted 2026-08-23 for the repository-wide course refactor. This is a design and review record, not a claim of accreditation or equivalence to a university degree.

## Shared benchmark

The common benchmark is a demanding upper-division sequence: formal definitions and proofs where the subject requires them, implementation or trace work where mechanisms matter, unseen transfer problems, and a defended synthesis artifact. The course pages now expose this contract before the lesson body; the lesson files remain the authoritative teaching source.

The crosswalk was reconstructed from the following university curricula and course materials:

- [MIT 6.006 Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/syllabus/) — prerequisites, proof/algorithm write-ups, problem sets, quizzes, and final-exam expectations.
- [MIT 6.004 Computation Structures](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/syllabus/) — abstraction ladder, digital design, performance, pipelines, memory, and hardware/software boundaries.
- [MIT 18.404J Theory of Computation](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/syllabus/) — automata, computability, reductions, complexity, randomness, and proof prerequisites.
- [MIT 6.033 Computer System Engineering](https://ocw.mit.edu/courses/6-033-computer-system-engineering-spring-2018/pages/syllabus/) — systems design, critique, communication, security, operating systems, and networks.
- [MIT 6.1810 Operating System Engineering](https://ocw.mit.edu/courses/6-1810-operating-system-engineering-fall-2023/pages/syllabus/) — kernel mechanisms and implementation labs.
- [MIT 6.005 Software Construction](https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/pages/syllabus/) — specifications, invariants, testing, abstraction, concurrency, code review, and project work.
- [MIT 6.830 Database Systems](https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/pages/syllabus/) — data models, schema design, query processing, optimization, transactions, recovery, concurrency, and distribution.
- [MIT 6.829 Computer Networks](https://ocw.mit.edu/courses/6-829-computer-networks-fall-2002/pages/syllabus/) — protocols, routing, congestion control, applications, performance, security, and research-style evaluation.
- [MIT 6.875 Cryptography and Cryptanalysis](https://ocw.mit.edu/courses/6-875-cryptography-and-cryptanalysis-spring-2005/pages/syllabus/) — encryption, pseudorandomness, signatures, protocols, zero knowledge, and proof-oriented reasoning.
- The broader degree-level comparison in [COMPUTER_SCIENCE_CORE.md](./COMPUTER_SCIENCE_CORE.md), including Princeton, Stanford, Cornell, Oxford, and ACM/IEEE-CS/AAAI CS2023.

## Course crosswalk

| Course | Universal material | Institution-dependent or advanced depth | Deliberate boundary | Core literature |
| --- | --- | --- | --- | --- |
| Programming and Systems in C | Translation, types, control, arrays, pointers, object representation, allocation, interfaces, I/O, testing, and undefined behavior | C ABI, embedded peripherals, opaque types, callbacks, and host/target testing | No claim that a vendor API or one compiler extension is portable C | Kernighan & Ritchie, *The C Programming Language*; [C11 draft N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf); Bryant & O’Hallaron, *Computer Systems: A Programmer’s Perspective* |
| Data Structures | ADTs, invariants, arrays/lists, hashing, trees, heaps, sorting, graphs, connectivity, cost models | External-memory trees, locality, persistence, LSM storage, adversarial benchmarking | Lock-free reclamation and specialized production indexes are extensions | Cormen et al., *Introduction to Algorithms*; Goodrich et al., *Data Structures and Algorithms in Java*; Sedgewick & Wayne, *Algorithms* |
| Algorithms | Modeling, correctness, asymptotics, recurrences, sorting, paradigms, graph algorithms, reductions, approximation | Randomized, online, streaming, empirical complexity, and engineering | Research-level lower bounds and current results are not compressed into survey prose | Cormen et al., *Introduction to Algorithms*; Kleinberg & Tardos, *Algorithm Design*; [MIT 6.006 materials](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) |
| Theory of Computation | Formal languages, automata, grammars, PDAs, Turing machines, decidability, reductions, P/NP, completeness | Space, randomness, hierarchy intuition, interactive-proof and oracle pointers | Descriptive and quantum complexity require a later specialist course | Sipser, *Introduction to the Theory of Computation*; Arora & Barak, *Computational Complexity*; Moore & Mertens, *The Nature of Computation* |
| Computer Architecture | Representation, logic, state, ISA, assembly, datapath/control, memory hierarchy, I/O, pipelines, parallelism, performance | Superscalar execution, SIMD, virtual-memory hardware, interconnects, quantitative investigation | RTL and transistor physics are represented only to the extent needed for systems reasoning | Patterson & Hennessy, *Computer Organization and Design*; Harris & Harris, *Digital Design and Computer Architecture*; [MIT 6.004 materials](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/) |
| Operating Systems | Kernel entry, processes, scheduling, concurrency and liveness, virtual memory, device I/O, filesystems and recovery, protection and isolation | Cumulative xv6 engineering, virtual machines, containers, multicore scalability, observability, and mechanism-level kernel comparison | Platform history, administration and shell tooling, distributed systems, real-time schedulability, embedded firmware, and formal verification require comparative notes or specialist courses rather than compressed surveys | Arpaci-Dusseau & Arpaci-Dusseau, [*Operating Systems: Three Easy Pieces*](https://pages.cs.wisc.edu/~remzi/OSTEP/); [MIT 6.1810](https://pdos.csail.mit.edu/6.1810/2025/schedule.html); [xv6-riscv rev5 source](https://github.com/mit-pdos/xv6-riscv/tree/7d7adbb1b0acbd67c9766a20d0f9900fef2789fa) |
| Computer Networks | Layering, links, addressing, routing, transport reliability, congestion, naming, HTTP, security, measurement | BGP, multicast, CDNs, protocol design, operational failure analysis | PHY engineering and carrier-scale deployment require specialist depth | Kurose & Ross, *Computer Networking: A Top-Down Approach*; Peterson & Davie, *Computer Networks*; [MIT 6.829 readings](https://ocw.mit.edu/courses/6-829-computer-networks-fall-2002/pages/readings/) |
| Database Systems | Relational model/algebra, SQL semantics, constraints, dependencies, normalization, plans, indexes, transactions, recovery, concurrency | Distribution, replication, storage-engine design, security, workload measurement | Vendor administration and product-specific behavior remain examples with explicit assumptions | Ramakrishnan & Gehrke, *Database Management Systems*; Garcia-Molina et al., *Database Systems: The Complete Book*; Hellerstein & Stonebraker, [*Readings in Database Systems*](https://redbook.cs.berkeley.edu/) |
| Cryptography and Security | Security goals, threat models, modular arithmetic, entropy, hashes, AE, keys, passwords, public key, signatures, exchange, protocols, application security, risk | Game-based reasoning, protocol traces, misuse resistance, operational response | Full provable-security reductions and hardware side channels are deferred | Katz & Lindell, *Introduction to Modern Cryptography*; Boneh & Shoup, [*A Graduate Course in Applied Cryptography*](https://toc.cryptobook.us/); Menezes et al., *Handbook of Applied Cryptography* |
| Software Engineering | Requirements, specifications, abstraction, interfaces, OO design, invariants, testing, review, refactoring, delivery, professional responsibility | Patterns, BDD, contract testing, CI/CD, architecture trade-offs, capstone defense | Framework branding and certification checklists are omitted unless they support a decision | Sommerville, *Software Engineering*; [MIT 6.005 readings](https://ocw.mit.edu/ans7870/6/6.005/s16/index.html); Parnas, “Designing Software for Ease of Extension and Contraction” |

## Authoring contract applied to every lesson

Each lesson is reviewed against the same evidence chain:

1. a concrete failure, design tension, or question establishes why the concept exists;
2. definitions and assumptions appear before the learner is asked to use them;
3. the mechanism is derived, traced, or justified rather than named;
4. two materially different examples expose normal and boundary behavior;
5. a counterexample or failure mode makes the limit visible;
6. a local artifact follows the concept that it teaches: diagram, trace, runnable investigation, code completion, case decision, proof block, or diagnostic quiz;
7. practice is distributed through the explanation, with recall, application, transfer, and synthesis represented at the scale of the lesson;
8. feedback explains the reasoning gap, and print output contains the prompt, answer, and explanation;
9. sources are visible and source-backed claims are tracked in MDX comments where required; and
10. the scope boundary states what is intentionally not being claimed.

The shared page-level learning contract makes prerequisites, outcomes, transfer, and scope visible even while older lesson bodies are being rewritten. It is a safety net for navigation, not a substitute for file-level teaching artifacts.

## Review evidence

- python3 scripts/course_stats.py
- python3 scripts/course_integrity.py --strict
- python3 scripts/verify_lessons.py
- npm run build
- npm run test:visual when layout or interaction changes

Passing these commands establishes structural and rendering evidence only. Human review still decides whether a proof is valid, an exercise requires transfer, a diagram carries the right abstraction, and an omission is intellectually honest.
