# Database Systems curriculum

Status: adopted 2026-08-24 for the Database Systems course rebuild. This document records the source-backed curriculum boundary and review contract. It does not claim accreditation or equivalence to a university course.

## Course thesis

A database is not a table plus a query language. It is a system that must preserve an application-level fact across four transformations:

1. a domain claim becomes a conceptual and relational schema;
2. a declarative query becomes an operator plan over physical data;
3. concurrent execution becomes one admissible history; and
4. a crash, replica, or attacker tests whether the claim still holds.

The course follows that causal spine. A learner starts from a fact that can become contradictory, models it precisely, executes and costs a query over it, then tests its survival under concurrency, failure, distribution, and hostile access. SQL syntax is evidence in that argument, not the curriculum's endpoint.

## Entry contract

Required preparation:

- programming with functions, collections, files, tests, and a command line;
- discrete reasoning with sets, predicates, relations, implication, simple proofs, and basic data structures; and
- the ability to read a short program or trace and state its invariant.

Recommended preparation, not an enrollment blocker:

- asymptotic notation, trees, hashing, and basic probability.

The storage and query-planning modules provide a concise, collapsible refresher immediately before their first use of these tools. Learners who already know them can skip it; learners who do not are told exactly which model is being assumed rather than being silently tested on an unstated prior course.

The course develops entity-relationship modeling, relational algebra, SQL, functional dependencies, transaction schedules, and recovery reasoning from first principles. It does not assume a prior database course or vendor administration experience.

## Benchmark evidence

The sequencing and ceiling were checked against primary university course sources:

- [CMU 15-445/645: Intro to Database Systems](https://15445.courses.cs.cmu.edu/spring2026/syllabus.html) treats relational querying and design, disk-oriented storage, indexes, query execution, concurrency control, recovery, and distributed trade-offs as one systems course with projects, homeworks, and exams.
- [CMU 15-445/645 schedule](https://15445.courses.cs.cmu.edu/spring2026/schedule.html) places storage and access methods before joins, execution, optimization, concurrency, recovery, and distribution; LibreUni preserves that dependency while bringing conceptual design and SQL practice earlier for a learner without prior database experience.
- [MIT 6.830 Database Systems](https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/pages/syllabus/) includes data models, schema design and normalization, processing and cost estimation, transactions, recovery, concurrency, isolation, distributed/parallel systems, assignments, exams, and a project.
- [UC Berkeley CS 186](https://cs186berkeley.net/sp20/) couples SQL, files and buffers, B+ trees, relational algebra, joins, query optimization, transactions, database design, recovery, and distributed transactions to projects and discussion problems.
- [PostgreSQL documentation](https://www.postgresql.org/docs/current/index.html) is used only for explicitly labelled implementation examples and current SQL/reference behavior; the course does not generalize a vendor choice into theory.

LibreUni exercises, tables, diagrams, simulations, and grading criteria are original. They may point to source materials, but do not reproduce another course's assignments or solutions.

## Workload and sequence

The planned workload is 10,800 minutes (180 hours), represented as 7.5 ECTS in the catalog. `estimatedMinutes` counts reading, prediction, worked traces, independent practice, design notes, measurements, and review—not page-scroll time.

| Module | Lesson | Minutes | Evidence produced |
| --- | --- | ---: | --- |
| Data contracts, relations, and SQL | Data contracts and database abstraction | 420 | conceptual-model-to-relation mapping and abstraction-boundary test |
|  | The relational model | 420 | constraint-bearing schema and NULL counterexample |
|  | Relational algebra | 420 | algebra tree, equivalence argument, and SQL translation |
|  | SQL querying | 420 | query portfolio with hand-derived result sets |
| Schema design and SQL practice | Functional dependencies | 480 | closure trace, candidate-key proof, and counterinstance |
|  | Normalization | 480 | lossless decomposition and dependency-preservation decision |
|  | Schema review | 480 | reviewed migration with domain and workload evidence |
|  | SQL lab | 720 | tested SQL scripts, result oracle, and plan comparison |
| Storage, access, and execution | Storage engines | 480 | page/buffer trace and layout decision |
|  | Indexes | 480 | B+ tree access-path trace and write-cost argument |
|  | Query execution and optimization | 480 | operator plan, cardinality estimate, and alternative cost claim |
| Transactions and recoverable execution | Transactions and isolation | 480 | anomaly trace and invariant-preserving repair |
|  | Concurrency control | 480 | precedence graph, serializability argument, and deadlock analysis |
|  | Transaction trace lab | 720 | adversarial schedule and recovery boundary report |
|  | Recovery and logging | 480 | crash-point analysis and redo/undo proof obligation |
| Data at scale and synthesis | Distributed data | 420 | consistency-model choice tied to a failure model |
|  | Replication and partitioning | 420 | quorum, failover, and migration design critique |
|  | Database security | 420 | authorization/data-flow threat analysis and least-privilege schema |
|  | Database capstone | 1,200 | defended data-system design, workload experiment, and incident runbook |
|  | Database assessment | 900 | unseen integrated problem set and oral/written design defense |

## Interaction and visual contract

The target course is rigorous, not prose-first. An artifact appears beside the claim it teaches; a quiz never substitutes for a model, trace, or worked calculation. Each interactive exposes its state in text, works by keyboard, has a bounded deterministic model, and has a coherent static book representation.

| Learning problem | Local representation | Learner action before reveal |
| --- | --- | --- |
| Entity identity, optionality, and cardinality | domain-model diagram and relation-mapping table | identify a fact that a proposed table cannot represent |
| Set/bag/NULL query semantics | relation-table explorer and algebra tree | predict rows and multiplicities |
| Functional-dependency implication | closure stepper and labelled derivation | choose the next dependency that can fire |
| Lossless decomposition | relation projection/join counterexample | predict whether a spurious tuple appears |
| SQL result and predicate placement | code completion plus hand-worked result table | commit the rows before exposing the query |
| Page, buffer, and index behavior | page-map/B+ tree trace | identify the next I/O or separator range |
| Plan quality | operator tree and bounded cost model | predict which intermediate result dominates cost |
| Isolation | schedule explorer and precedence graph | name the first event that violates the invariant |
| Recovery | crash-point log stepper | state what is durable before recovery runs |
| Replication | quorum/failure explorer | choose the availability/consistency contract first |
| Security | data-flow/threat diagram and case decision | state the protected datum and enforcement point |

Labeled **Definition**, **Invariant**, **Theorem**, **Worked example**, **Counterexample**, and **Warning** blocks make formal claims scannable. Hints and solutions are nested disclosures; core definitions and reasoning are never hidden. Practice is distributed after the worked reasoning that equips it, not collected as an answer-revealing appendix.

## Assessment contract

Every lesson distributes four forms of work:

1. retrieval or prediction before an answer/model is visible;
2. application to a fully specified schema, query, trace, or workload;
3. transfer after a constraint, distribution, failure, or adversary changes; and
4. synthesis through a design decision backed by invariant, result, cost, or failure evidence.

Multiple-choice checks are limited to sharply diagnosable misconceptions. Their options are parallel in form and length, and feedback identifies the missing semantic condition. SQL, algebra, closure, schedule, and recovery practice requires an independently constructed artifact before a reference solution is shown. The capstone and final assessment require evidence and a defense; a page cannot certify system design or authorship automatically.

## Deliberate boundaries

- Entity-relationship modeling supports relational design but does not become a UML or enterprise-process modeling survey.
- Vendor administration, configuration tuning, cloud-product setup, and product-specific SQL quirks appear only as labelled examples with stated assumptions.
- Full DBMS implementation, lock-free indexes, replicated consensus protocols, formal isolation proofs, streaming engines, vector indexes, and database research papers require specialist follow-on work.
- Document, graph, key-value, and columnar models are compared only when they illuminate the relational/system trade-off; this course does not claim mastery of each model.
- Security covers database-facing authority, injection, auditing, and data lifecycle. Cryptographic protocol design, OS process isolation, and privacy law are separate subjects.

## Release gate

The rebuild is incomplete until every manifest lesson has a specific entry contract, outcome, omission, local teaching artifact, distributed practice, disclosed solution or grading criterion, and sources; the course integrity report has no generic-template or uncovered-heading findings left unexplained; and representative lessons from each module are inspected in desktop/mobile and light/dark forms, including print/static representations of interactions.

## Review evidence (2026-09-14)

The assigned course slice was read end to end, including all 20 manifest lessons, the seven named database playgrounds, course metadata, and this curriculum contract. The read-only checks `python3 scripts/course_stats.py database-systems` and `python3 scripts/course_integrity.py database-systems --strict` passed (20 lessons, 18 executable code blocks, zero integrity findings). These checks establish structural validity only; they do not establish SQL correctness, pedagogical sufficiency, or visual quality. The distributed sequence explicitly uses `C` for the client and `D` for replica C; its acknowledgement arrow therefore intentionally targets the client. Full-site build, browser, and print inspection remain release-gate work owned by the integrating agent.
