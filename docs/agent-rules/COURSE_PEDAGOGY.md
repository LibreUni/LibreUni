# LibreUni Pedagogical Review & Generation Standard

This is a strict quality contract for university-level learning resources. The AI must treat the audience as rigorous academic learners, completely eliminating "broad public" conversational fluff and replacing it with deep, structurally sound, and challenging material.

## 1. Expert Panel (Internal Reasoning Constraints)

Before generating or reviewing content, the AI must reason from these distinct perspectives to resolve pedagogical design:

- **The Rigorous Subject-Matter Expert:** Demands depth. Ensures definitions, mathematical proofs, complex formulas, and edge cases are correct, precise, and unconditionally true. Never dumbs down the content.
- **The Cognitive Designer:** Ensures the progression aligns with the three levels of mathematical thinking: trial and error, pattern recognition, and formal deductive reasoning. Maps how concepts compress into a few core foundational rules (the "trunk").
- **The Anti-Fluff Editor:** Strips out all conversational filler, repetitive headings, and transitionary bloat (e.g., "Now we will look at...", "In the next lesson...").
- **The Visual/Structural Strategist:** Actively hunts for walls of text and translates them into graphs, visual models, or structural representations.
- **The Interactive Skeptic:** Interrogates every interactive element or quiz. Exercises are only permitted if they test a specific intended outcome or address a vital misconception, never just to meet a "quota".

## 2. The Core Rules of Generation

To address the systemic issues of AI-generated content, all output must adhere to these strict rules:

- **Deep, University-Level Rigor:** Content must include complex problems, dilemmas, and formal mathematical notation. Do not shy away from the "struggle" of hard math. Present foundational generators (like Maxwell's equations) and prove how they derive broader results.
- **Zero Fluff and Compression:** Avoid conversational transitions. Start immediately with the core propositions. Compress the knowledge into a few core generating ideas ("unconditional truths") rather than presenting a scattered list of facts.
- **Strict Modularity & Resolvable Dependencies:** Never use relative chronological references like "In the next lesson" or "As we saw yesterday." Math and systems are cumulative, but course structures change. Rely on declared prerequisites and link foundational statements using `<Ref id="..." />` (D-0013, `COURSE_STRUCTURE.md`).
- **Visual Over Textual:** If a relationship, formula, or concept can be mapped visually, do so. Do not explain over text what a graph can demonstrate instantly.
- **Intentional, Meaningful Practice (The 80/20 Rule):** Do not push mindless coding exercises. Practice should make up the bulk of the learner's effort, but the exercises must be purposefully mixed in type to build genuine intuition and pattern recognition, avoiding repetitive rote tasks.

## 3. The University Learning Arc

Use this structure to introduce concepts, replacing the standard "I do, We do, You do" with a structure modeled after how the brain actually learns advanced math:

- **Motivated Discovery (The "Why"):** Do not just hand the learner an arbitrary formula. Establish a real problem or tension. Show the "happy path" of discovery: Question → Attempt → Obstacle → Insight → Formalization. Walk through how a mathematician or engineer would have discovered this through inquiry.
- **Formal Definition Grounded in Step-by-Step Examples:** State the rigorous, formal definition or invariant in an addressable statement card, then immediately ground it in step-by-step worked examples (canonical case, then edge/variable case) where the reasoning behind every single step is explicitly justified, followed by non-examples that reveal boundary limits.
- **Deep Independent Practice:** Provide challenging problems in an `<ExerciseSet>` that require independent transfer across Bloom's levels (D-0013, `COURSE_STRUCTURE.md`). These problems operate at the edge of learner understanding to build genuine mastery.
- **Feedback & Knowledge Gaps:** Feedback must do more than provide the correct answer. It must act as a "diagnosis," revealing the exact missing prerequisite or logic gap that caused the error, allowing the learner to use targeted self-explanation (Feynman technique) to patch their understanding.

## 4. Substantive Quality Checks

When reviewing or generating material, rank findings by learning impact.

- **Critical Violations:** Missing prerequisites, mathematically imprecise formulas, conversational fluff, assumed chronological sequencing (interlinking), mindless/unrelated quiz questions, and physical university simulation antipatterns (D-0017).
- **Substantive Improvements:** Enhancing the transition from concrete examples to formal proofs, providing a missing visual graph, adding deeper edge-case problems to challenge advanced learners, or clarifying the "why" behind a specific mathematical move.

> **Note:** Cosmetic changes like synonym swaps or paragraph reshuffling are forbidden unless they directly compress the text or remove filler.
