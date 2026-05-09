# LibreUni — Agent & Contributor Reference

This is the single source of truth for anyone (human or AI agent) creating or modifying content for LibreUni. Follow all rules at all times.

## Project Overview

LibreUni is a completely free education platform — no sign-in, no ads, no paywalls. The goal is to democratize high-quality, university-level education.

**Stack:** Astro · React · Tailwind CSS · MDX · KaTeX · PlantUML

**Key directories:**

- `apps/main/src/content/lessons/` — MDX lesson files, organized by course slug
- `apps/main/src/content/courses/` — JSON course metadata
- `apps/main/src/components/` — Interactive React components (`<Quiz>`, `<CodeRunner>`, `<CaseStudy>`, etc.)
- `scripts/course_stats.py` — content validation (character count, headings, etc.)
- `docs/` — technical references (UX, PlantUML)

---

## Core Rules

- Lessons are created by hand — no Python scripts or auto-generation.
- Use interactive components (`<Quiz>`, `<CodeRunner>`, `<CaseStudy>`) where they add real value. In Astro/MDX, all interactive React components **must** use `client:load` (e.g. `<Quiz client:load ... />`).
- Use `<Quiz client:load>` for knowledge validation; `<CaseStudy client:load>` for scenario-based problems with setup context.
- **Canonical component props** — use exactly these names, no aliases:
  - `<Quiz>`: `question`, `options`, `correctIndex`, `explanation`, `questions`, `title`
  - `<CodeRunner>`: `code`, `output`, `language`, `title`
  - `<CodeExercise>`: `code` (use `[!blank!]` for gaps), `answers`, `explanation`, `title`
  - `<CaseStudy>`: `scenario`, `question`, `options`, `correctIndex`, `explanation`, `title`
- Write new custom components when existing ones don't fit.
- Use PlantUML diagrams where visual representation genuinely aids understanding. See `docs/PUML.md` for troubleshooting.
- Lessons must be self-contained — no lesson should require reading another first.
- No lesson numbers in filenames, headers, or text. Lessons can be taken in any order.
- Everything must be university level or above.

---

## Writing Style

Academic but not dry. Engaging, clear, precise, to the point. No filler.

**Never use:** "welcome", "let's dive in", "in this lesson", "as you have learned before", "congratulations on finishing", "you have completed", "next up", "previously", "before we move on", "let's explore", "let's take a look at".

Instead — directly present the question, problem, or concept.

| Bad                                                                                            | Good                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome to this lesson on calculus.                                                            | Calculus is the mathematical study of continuous change.                                                                                                              |
| Now, let's explore how derivatives work.                                                       | Derivatives represent the rate of change of a function with respect to a variable.                                                                                    |
| You may be asking yourself, what is a derivative?                                              | A derivative is defined as the limit of the average rate of change of a function as the interval approaches zero.                                                     |
| You may have noticed, the result of$x^2+1=0$ cannot be a real number. How can we solve this? | The equation$x^2+1=0$ has no real solutions because the square of any real number is non-negative. To solve this, we introduce complex numbers, where $i^2 = -1$. |

---

## Structure & Testing

**Course size:** 20–80 lessons per course. **Lesson size:** 1000–4000 characters.

Use h1, h2, h3 headers. Follow the **theory → example → exercise** pattern: define the concept, demonstrate it with examples (including edge cases), then give the reader something to try.

**Before submitting:**

1. Run `python3 scripts/course_stats.py` — check mean lesson length and heading metrics.
2. Run `npm run build` (or `npm run build:main`) — catches MDX/syntax errors and populates `puml-errors.log` with any failing PlantUML diagrams.

---

## Design & UX

See `docs/ux.md` for the full UX vision. Key points:

- Primary color: blue (`#3b82f6` / Tailwind `blue-500`).
- Minimalism: clean lines, ample whitespace, clear typography.
- Dark mode: deep zinc/slate tones, not pure black.
- No distractions — the platform follows a strict "No Bullshit" philosophy.

## Math Track Status

Tracks which modules meet the LibreUni Standard: academic rigor + interactive Python labs + quizzes.

### Standards Applied to All Finalized Modules

1. **Theory-Example-Exercise**: every definition followed by an example and every example followed by an interactive exercise.
2. **Clean Python**: no `\"\"\"` escapes, proper docstrings.
3. **No Fluff**: no "Welcome" or "In this lesson" phrases.
4. **University Level**: formal definitions maintained alongside code.

---

# Use of AI

AI was and remains an important factor during prototyping and overall early development of the platform. Although the ultimate goal is to have everything thoroughly verified and hand-crafted, AI will remain being of utility for working on the project. For ensuring proper use of AI, docs are expanded to be able to give better instructions to AI.
