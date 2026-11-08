# LibreUni — Project & Content Reference

Read this through the `AGENTS.md` task router. It defines shared project and content requirements; `BASELINE.md` defines the universal operating contract, and task packs add stricter subject-specific requirements.

## Project Overview

LibreUni is a completely free education platform — no sign-in, no ads, no paywalls. The goal is to democratize high-quality, university-level education.

**Stack:** Astro · React · Tailwind CSS · MDX · KaTeX · PlantUML

**Key directories:**

- `src/content/lessons/` — MDX lesson files, organized by course slug
- `src/content/courses/` — JSON course metadata
- `src/data/course-manifests/` — YAML lesson order and module grouping for each course
- `src/components/` — Interactive React components (`<Quiz>`, `<CodeRunner>`, `<CaseStudy>`, etc.)
- `scripts/course_stats.py` — course inventory and smoke tests; it does not rate pedagogical quality.
- `scripts/course_integrity.py` — anomaly audit for filler, duplication, generic artifacts, and uncovered headings; it is a review gate, not a pedagogical score.
- `docs/` — technical references (UX, PlantUML)

---

## Core Rules

- Lessons are created by hand — no Python scripts or auto-generation.
- Use interactive components where they add real value; never add them to satisfy a quota. See `docs/agent-rules/COURSE_COMPONENTS.md`. In Astro/MDX, all interactive React components **must** use `client:load` (e.g. `<Quiz client:load ... />`).
- Use `<Quiz client:load>` for knowledge validation; `<CaseStudy client:load>` for scenario-based problems with setup context.
- **Canonical component props** — use exactly these names, no aliases:
  - `<Quiz>`: `question`, `options`, `correctIndex`, `explanation`, `questions`, `title`
  - `<CodeRunner>`: `code`, `output`, `language`, `title`
  - `<CodeExercise>`: `code` (use `[!blank!]` for gaps), `answers`, `explanation`, `title`
  - `<CaseStudy>`: `scenario`, `question`, `options`, `correctIndex`, `explanation`, `title`
  - `<SqlRunner>`: `schema`, `initialQuery`, `title`, `description`
- Write new custom components when existing ones don't fit.
- Use PlantUML diagrams where visual representation genuinely aids understanding. See `docs/agent-rules/PLANTUML.md` for troubleshooting.
- Lessons rely on explicit, declared prerequisites and resolvable cross-references (D-0013, `COURSE_STRUCTURE.md`). Avoid chronological prose ("in the next lesson", "as we saw yesterday"), but precise conceptual references via `<Ref id="..." />` are encouraged.
- No lesson numbers in filenames, headings, or source text (numbers are generated dynamically per D-0013).
- Lesson order, module grouping, and lesson roles are defined in `src/data/course-manifests/<course-id>.yml`.
- Everything must be university level or above.
- For any course-related work, read [`COURSE_STANDARD.md`](COURSE_STANDARD.md) first. It is the mandatory quality bible for every agent, including agents working only on components, assessments, manifests, research, or repairs.

---

## Writing Style

Academic but not dry. Engaging, clear, precise, to the point. No filler.

**Never use:** "welcome", "let's dive in", "in this lesson", "as you have learned before", "congratulations on finishing", "you have completed", "next up", "previously", "before we move on", "let's explore", "let's take a look at".

**Autonomous Open Digital Learning Contract (D-0017):** LibreUni is an open digital curriculum platform, NOT a brick-and-mortar university. Never assume learners are enrolled students in a cohort, classroom, semester, or academic year. Never write or retain physical university terminology ("students", "professors", "instructors", "TAs", "office hours", "semesters", "deliverables", "submitting/submissions", "grading rubrics", "oral defense", "human reviewer", "passing grade", "academic integrity dean"). Never create timed exam hall simulations with countdown clocks. Course practice is self-paced, constructive, and algorithmic (`<PracticeGenerator>`). All topics are non-sequential reference units accessible in any order.

**Prompt Parroting Prohibition (D-0015):** Prompt instructions, user constraints, design rationales, or implementation directives (e.g. "don't add a timer", "no teacher grading", "coming later as a feature") must NEVER be parroted or echoed into user-facing copy, headers, badges, or descriptions. Public page copy must be written strictly from the learner's perspective as professional, standalone educational material describing what the content is, never discussing prompt directives, absent features, or omitted requirements.

Instead — directly present the question, problem, or concept.

| Bad                                                                                            | Good                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome to this lesson on calculus.                                                            | Calculus is the mathematical study of continuous change.                                                                                                              |
| Now, let's explore how derivatives work.                                                       | Derivatives represent the rate of change of a function with respect to a variable.                                                                                    |
| You may be asking yourself, what is a derivative?                                              | A derivative is defined as the limit of the average rate of change of a function as the interval approaches zero.                                                     |
| You may have noticed, the result of$x^2+1=0$ cannot be a real number. How can we solve this? | The equation$x^2+1=0$ has no real solutions because the square of any real number is non-negative. To solve this, we introduce complex numbers, where $i^2 = -1$. |

---

## Structure & Testing

**Course size:** typically 15–40 lessons per full-length course (focused preparatory modules such as Calculus may have 7–15 lessons). **Lesson size:** typically 10,000–30,000 characters (~6–8 hours of focused study including exercises/derivations). Note that there is no strict limit; focus should remain on depth, clarity, and scholarly rigor without artificial constraints.

Use h1, h2, h3 headers. Follow the **theory → example → exercise** pattern: define the concept, demonstrate it with examples (including edge cases), then give the reader something to try.

**Strict Anti-Bypass Rule:** Adding fake "source tracking" comments, placeholder text, or using meaningless words just to bypass the `course_stats.py` source coverage checks is **strictly forbidden**. Any sources or tracking comments added must be genuine, researched references that actively support the lesson content. Bypassing tests undermines the educational integrity of LibreUni.

**Commit messages:** Use `[Verb] Short description` style (e.g., `[Add]`, `[Fix]`, `[Refactor]`, `[Update]`, `[Remove]`).

**Before completing a task:**

1. Run `python3 scripts/course_stats.py` — run course smoke tests and inventory code blocks/components. Every `CodeRunner` must use a checked, declared language; renderer failures from PlantUML, PythonDiagram, and TikZ logs are also failures. A passing result means the checked structure and code are not broken; it is not a quality rating.
   - Run `python3 scripts/course_stats.py <course-id>` to smoke-test one course.
   - Run `python3 scripts/course_stats.py --write-quality` to regenerate the smoke-test data used by development tooling.
2. Run `python3 scripts/course_integrity.py --strict` for course padding, duplication, generic-artifact, and heading-coverage findings. Treat findings as review blockers; do not reduce them to a numeric score.
3. Run `npm run build` — catches MDX/syntax errors and populates `puml-errors.log` with any failing PlantUML diagrams. Note: use `$$` for display math, not `\[` — remark-math does not support LaTeX-style `\[ ... \]` delimiters.

Automated metrics do not certify course quality. Pedagogy, correctness, sourcing, and exercise value require human or agent review under `docs/agent-rules/COURSE_PEDAGOGY.md`.

---

## Design & UX

See `docs/agent-rules/UI.md` for the full UX vision. Key points:

- Primary color: blue (`#3b82f6` / Tailwind `blue-500`).
- Minimalism: clean lines, ample whitespace, clear typography.
- Dark mode: deep zinc/slate tones, not pure black.
- No distractions — the platform follows a strict "No Bullshit" philosophy.

## Math Track Status

Tracks which modules meet the LibreUni Standard: academic rigor + interactive Python labs + quizzes.

### Standards Applied to All Finalized Modules

1. **Theory-Example-Practice**: formal definitions are grounded in concrete worked examples, non-examples, and deep practice (D-0005, D-0013).
2. **Clean Python**: no `\"\"\"` escapes, proper docstrings.
3. **No Fluff**: no "Welcome" or "In this lesson" phrases.
4. **University Level**: formal definitions maintained alongside code.

---

# Use of AI

AI was and remains an important factor during prototyping and overall early development of the platform. Although the ultimate goal is to have everything thoroughly verified and hand-crafted, AI will remain being of utility for working on the project. For ensuring proper use of AI, docs are expanded to be able to give better instructions to AI.
