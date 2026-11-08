# Lesson Exemplar Specification (Upper-Division Reference Standard)

This document defines the canonical specification and acceptance criteria for reference-grade lessons in LibreUni. Every work unit authored by writers and audited by the Synthetic Auditor and Independent Verifier must be evaluated against this contract.

---

## 1. Core Principles

1. **Upper-Division University Depth**: Written to the depth of demanding courses at MIT, Stanford, Cambridge, or ETH Zürich (150–200 study hours per course; ~6–8 hours per lesson including exercises/labs).
2. **Anti-Filler Contract (D-0004)**: No prose that merely fills structural templates. Never define concepts superficially without formal mechanics, derivations, and boundary cases.
3. **Outcome Alignment**: Every stated outcome must be evaluated by an assessment that cannot be passed through keyword recognition or reading comprehension alone.

---

## 2. Mandatory Structural Components

Every acceptable lesson adheres to the structural grammar defined in [`docs/agent-rules/COURSE_STRUCTURE.md`](../agent-rules/COURSE_STRUCTURE.md) and contains:

### A. Motivating Problem & Formal Statement
- A concrete system failure, mathematical paradox, or architectural bottleneck that makes the concept strictly necessary.
- Precise mathematical or engineering definitions, invariants, and explicit assumptions.

### B. Mechanics, Derivation & Proof
- Step-by-step mathematical proof, architectural state machine, or kernel trace.
- Explains *why* the mechanism works, not just *what* it is.

### C. Concrete Worked Examples (At least Two Substantially Different Examples)
- Example 1: The standard / canonical operational path with full numeric values, register states, or algebraic terms.
- Example 2: A non-trivial edge case (e.g., misaligned access, concurrent preemption during lock acquisition, boundary derivative at a cusp).

### D. Counterexamples & Failure Modes
- A precise failure mode demonstrating what happens when invariants are violated (e.g., lost update trace under non-atomic read-modify-write, priority inversion without inheritance, divergent series).

### E. Interactive Model / Playground with Static Twin (D-0005)
- Where interactive exploration is used, the widget must:
  - Pose a predict-then-reveal question (forcing the learner to commit to an expectation before sliding/clicking).
  - Include a **Static Twin** (clean SVG diagram + descriptive caption) that renders identically in light/dark themes and exports properly to PDF book generation.
  - Possess an automated model/invariant test in `tests/` or `scripts/`.

### F. Assessments with Full Specifications
- Must include complete input parameters, constraints, and test vectors. (No ambiguous exercises like "calculate AMAT" without miss rates or hit times).
- Multi-tier exercises:
  1. *Application*: Directly exercising the derived formula/trace.
  2. *Transfer*: Applying the mechanism under altered constraints or an unfamiliar architecture.
  3. *Synthesis / Proof*: Requiring the learner to construct an invariant, write a C kernel routine, or formulate a proof.
- Complete worked solutions or formal verification criteria.

### G. Scope Boundaries & Further Reading
- Declare concise scope boundaries in the frontmatter `omissions` field (rendered inside the collapsible `Lesson brief`), rather than adding a standalone boilerplate omissions section at the end of the lesson body.
- Place substantive mathematical or architectural boundary remarks inline beside the concept they qualify, and fold pointers to advanced extensions directly into annotated `## References & Further Reading` entries.

### H. Claim-Level Primary Sourcing
- Zero generic root URLs (e.g., no plain links to `kernel.org` or `mit.edu`).
- Precise textbook anchors: Textbook author, chapter, section, and theorem/figure (e.g., *OSTEP Chapter 28, Figure 28.3, pp. 294–297*; *Hennessy & Patterson 6th ed., Section 2.3*).

---

## 3. Reviewer Verification Checklist (Evidence Packet)

When auditing a lesson, the Independent Verifier and Synthetic Auditor must complete this scorecard:

| Criterion | Requirement | Verified (Yes/No) | Defect / Notes |
|---|---|:---:|---|
| **Prerequisite Integrity** | Can the entire lesson and all exercises be understood and solved using ONLY declared prerequisites and preceding lessons? | | Logged in `<unit>-learner.md` |
| **Independent Derivation** | Has every calculation, formula, and state trace been re-derived blind by the verifier without consulting the answer key? | | Logged in `<unit>-review.md` |
| **Exercise Completeness** | Are all input parameters, initial states, and bounds explicitly specified? | | |
| **Counterexample Quality** | Does the lesson include a concrete failure mode separating mechanisms? | | |
| **Static Twin Parity** | Does every interactive playground have a matching static diagram and caption for PDF export? | | Checked via visual audit |
| **Source Anchors** | Are all citations anchored to specific textbook chapters/pages rather than generic homepages? | | Checked via librarian audit |
| **Omission Statement** | Is there an explicit account of deliberate omissions? | | |
