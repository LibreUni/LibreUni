# Database Systems repair contract (audit before edits)

Date: 2026-09-16  
Scope audited: the manifest, metadata, curriculum crosswalk, all 20 lesson bodies, the database playground model/component surface, and the routed course rules.

## Evidence boundary

`python3 scripts/course_stats.py database-systems` passed (20 lessons, 18 executable code blocks). `python3 scripts/course_integrity.py database-systems --strict` passed with zero findings. `node --test tests/database-playground-models.test.mjs` passed. These establish mechanical validity and a few model invariants, not pedagogical sufficiency. The 20 `estimatedMinutes` values sum to 10,800 (180 hours), matching the curriculum contract.

The SQL registration fixture was executed in SQLite 3 in an in-memory database. The zero-safe report returned DB101=1, DB201=0, DB301=0; the `NOT EXISTS` report returned Bo, Cy, and Dee. This verifies the relational result, but not PostgreSQL execution, planner behavior, MVCC, or PostgreSQL's exact error/NULL/constraint details. `pg_isready` reported no PostgreSQL server at `/var/run/postgresql:5432`; PostgreSQL-specific claims therefore remain source/documentation and paper-trace evidence until a server is available.

## Findings against the course principles

### P1 — the authoring contract is stronger than the actual independent practice

Most practice is a prompt immediately followed by an `ExerciseSolution` disclosure. This is useful as a book answer key, but it does not force a learner to commit an answer, preserve a result table, or submit an executable artifact before reveal. The curriculum explicitly promises prediction before reveal and independently constructed SQL/algebra/closure/schedule/recovery artifacts. This is most consequential in `relational-model`, `relational-algebra`, `functional-dependencies`, `normalization`, `transactions-and-isolation`, `concurrency-control`, and `recovery-and-logging`. Repair should add a small, domain-specific response/runner where it materially supports the outcome, and retain paper-first prompts where a browser input would falsely certify proof quality.

### P1 — three central structural concepts lack the promised local visual/model artifact

`relational-model.mdx` teaches set/bag/NULL behavior with tables only and explicitly defers interactivity to another lesson; `normalization.mdx` proves a lossless decomposition and gives a spurious-tuple counterexample but has no decomposition/join model; `concurrency-control.mdx` compares lock, timestamp, optimistic, and MVCC mechanisms in prose/tables without a schedule/lock-state investigation. These are precisely the interaction-contract rows “set/bag/NULL,” “lossless decomposition,” and “isolation.” Add or revise DB-specific playgrounds only when they expose the stated variables and provide a static book representation.

### P1 — one named topic is described but not taught to the advertised level

`database-abstraction.mdx` names “external view, logical schema, physical design” and gives a useful boundary test, but does not define or demonstrate view updateability/security-barrier semantics; this is acceptable only if the lesson explicitly narrows “view” to a read contract. The current prose says “a view is an interface” broadly enough to invite that inference. Narrow the claim and state that updateable views and security-barrier behavior are omitted/vendor-specific. Similar scope labels should be checked for “MVCC,” “snapshot visibility,” and “partitioning,” which are introduced as mechanisms but intentionally not implemented.

### P2 — outcome/assessment alignment is uneven at the assessment ceiling

The lesson frontmatter outcomes are generally concrete and each has a nearby exercise, but several assessments ask for “explain” or “choose” without requiring a falsifiable artifact: `database-abstraction` (equivalence check is only described), `database-security` (containment/evidence plan has no executable policy test), `distributed-data` (client response has no durable state trace), and `replication-and-partitioning` (migration evidence is prose). Rebuild these assessments around a supplied fixture/trace and a rubric requiring invariant, counterexample, and evidence class; do not add recognition quizzes.

### P2 — source support is course-scale rather than claim-local in several systems lessons

Every lesson has a bibliography or source-tracking comment, and the curriculum sources are credible. However, broad claims in `distributed-data`, `replication-and-partitioning`, `database-security`, and `database-capstone` combine general theory with PostgreSQL-specific behavior under one paragraph-level source note. Label each claim as general theory, common implementation, or PostgreSQL behavior and attach the primary source accordingly. In particular, no PostgreSQL behavior should be generalized to all DBMSs.

### P2 — visual/static parity needs a release inspection, not a source-only assertion

PlantUML and playground sources are present and integrity/build smoke checks are clean, but no current audit evidence here demonstrates desktop/mobile light/dark rendering or PDF/static representations for every database artifact. Before implementation handoff, inspect representative lessons from all five modules and verify controls, keyboard operation, live state text, and book output. This is a validation gap, not a claim that a visual defect is already proven.

## Four independent exercise solutions

1. **Relational algebra (data contracts module).** For `Student(sid)`, `Course(cid)`, `Taken(sid,cid,term)`, and `Core(cid)`, let `Completed = π_sid,cid(σ_term='2026S'(Taken))`, `Expected = Student × Core`, and `AllCore = π_sid(Student) − π_sid(Expected − Completed)`. Define `NonCore = π_cid(Course) − Core`, `HasNonCore = π_sid(Completed ⋈ NonCore)`, then answer `AllCore − HasNonCore`. Difference operands are schema-compatible by construction.

2. **Functional dependencies (schema-design module).** For dependencies `A→B`, `B→C`, `CD→E`, closure of `{A,D}` is `{A,D,B,C,E}`; closure of `{A}` is `{A,B,C}`. Thus `{A,D}` is a superkey only if the relation is exactly those five attributes (or closure contains the whole schema); `{A}` is not a key when `D` is required. This matches the fixed-point implementation in `databaseModels.mjs` and distinguishes a determinant from a sampled correlation.

3. **SQL (SQL-practice module).** Executed the supplied fixture in SQLite: `LEFT JOIN ... ON e.status='enrolled'` plus `COUNT(e.student_id)` produced `(DB101,1,false),(DB201,0,false),(DB301,0,false)`; correlated `NOT EXISTS` produced `(2,Bo),(3,Cy),(4,Dee)`. SQLite's output is evidence for relational semantics only; the lesson's PostgreSQL `FILTER`, `EXPLAIN (ANALYZE, BUFFERS)`, and error text require PostgreSQL verification.

4. **Transactions/recovery (recoverable-execution module).** For `T1:r(x=20), T2:r(x=20), T1:w(x=13), T2:w(x=13)`, the final value 13 is a lost update: both writes are individually plausible but one decrement vanished. A conditional update (`UPDATE ... SET stock=stock-1 WHERE stock>0`) or serializable/locking boundary repairs the stock invariant. For recovery, a page at LSN 911 with durable log only through 910 violates WAL even if the value happens to be correct: recovery lacks a durable explanation and cannot safely redo/undo it. These are model/paper solutions; no live PostgreSQL transaction server was available.

## Lesson-by-lesson disposition

| Lesson | Decision | Required repair direction |
|---|---|---|
| database-abstraction | **Narrow/rebuild assessment** | Narrow “view” to the documented read contract; add a committed equivalence fixture and explicitly omit updateable/security-barrier view semantics. |
| relational-model | **Rebuild locally** | Add a relation-table explorer or deterministic static equivalent for set/bag/NULL; preserve the strong grain/key progression. |
| relational-algebra | **Keep, strengthen practice** | Keep derivation and counterexample; add a learner-committed algebra/result artifact before solution reveal. |
| sql-querying | **Keep, verify engine boundary** | Preserve the excellent ON/WHERE and NULL cases; separate SQLite-portable semantics from PostgreSQL-only syntax and add a runnable PostgreSQL path when available. |
| functional-dependencies | **Keep, strengthen assessment** | Keep closure proof/playground; require a candidate-key proof and counterinstance as submitted evidence. |
| normalization | **Rebuild locally** | Add lossless/losy join state visualization and make dependency preservation a constructed comparison, not only prose. |
| schema-review | **Keep** | Retain domain review, composite-FK exercise, and code completion; add one executable adversarial constraint test or clearly label paper-only evidence. |
| sql-lab | **Keep, engine-label** | Keep fixed fixture and edge cases; label all PostgreSQL 18/`FILTER`/`EXPLAIN` behavior and provide a server-availability alternative explicitly. |
| storage-engines | **Keep, deepen** | Retain page/buffer/WAL trace; add a compact page-eviction state artifact and clarify which claims are PostgreSQL-specific versus abstract DBMS behavior. |
| indexes | **Keep** | B+ tree and composite-key treatment is strong; require a measured or hand-derived maintenance-cost comparison in the transfer rubric. |
| query-plans | **Keep, deepen** | Preserve cost model; add a second worked plan with correlated statistics and require estimated/actual evidence rather than an answer disclosure alone. |
| transactions-and-isolation | **Rebuild locally** | Make schedule/precedence evidence learner-committed; label PostgreSQL isolation behavior by version and distinguish conflict serializability from implementation labels. |
| concurrency-control | **Rebuild locally** | Add lock/ waits-for / retry state investigation; current protocol comparison is rigorous prose but under-modelled interactively. |
| transaction-trace-lab | **Keep, deepen** | Strong trace contract; add a structured trace template/rubric that checks first violated invariant and external-effect boundary. |
| recovery-and-logging | **Keep, deepen** | Retain WAL/redo/undo model; add a crash-point committed-state artifact and make ARIES/checkpoint omissions explicit at the point of use. |
| distributed-data | **Keep, narrow claims** | Preserve quorum intersection and timeout reasoning; label Raft/general theory and require a durable client-response trace. |
| replication-and-partitioning | **Rebuild assessment** | Preserve fencing, pruning, and migration concepts; require cutover/reconciliation evidence and make local partitioning versus sharding distinction an assessed counterexample. |
| database-security | **Rebuild assessment** | Preserve threat-flow and SQL/authority distinction; add a concrete least-privilege/tenant-bypass test and separate DB policy from web-handler controls. |
| database-capstone | **Keep as synthesis, sharpen rubric** | Good invariant-centered brief; require reproducible fixture/plan/failure artifacts and explicitly limit what a design defense can certify. |
| database-assessment | **Keep as final assessment, tighten evidence** | Strong unseen-domain ceiling; require an actual trace/constraint/plan artifact for each claim and ensure rubric does not reward prose checklists. |

## Review gate before edits

This contract is intentionally issued before source edits. Peer review should decide whether the three proposed playground additions and the assessment-evidence changes are in scope. No shared styling, catalog, validators, or non-database surfaces should be changed under this ownership.

## Peer conditions resolved for implementation

- “Executable evidence” now means a real fixture or runnable model wherever a lesson promises execution; proof-oriented outcomes may use a complete worked trace plus a usable rubric. The repair batches below do not add widgets merely to increase counts.
- The relational-algebra solution explicitly projects current-term completions to `(sid,cid)` before any difference, so `term` cannot be confused with a difference operand.
- The conditional stock update now requires checking the affected-row count, treating zero as a rejected attempt, and retrying only within a bounded idempotent transaction boundary.
- Lossless normalization, concurrency schedules, and SQL engine selection are made explicit in lesson contracts and evidence tables, not left as implied follow-up work.
- PostgreSQL-specific claims are labelled and linked to versioned PostgreSQL 18 primary documentation; SQLite execution is reported only as portable relational-semantic evidence.
