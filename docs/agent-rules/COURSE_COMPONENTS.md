# Course components

This is the canonical guide for authors and agents writing LibreUni lessons. Components are teaching tools, not quality quotas. Use one only when it improves a specific learning outcome; a lesson is not better because it contains more widgets.

## React components

Import from `src/components/` with a relative MDX import and add `client:load` to every use. Only the props listed here are supported.

| Component | Use it for | Required teaching inputs |
| --- | --- | --- |
| `Quiz` | A focused knowledge check or misconception check | `question`, `options`, `correctIndex`, `explanation` |
| `CodeRunner` | A small, runnable demonstration the learner should modify or execute | `code`, optionally `output`, `language`, `title` |
| `CodeExercise` | Fill-in-the-blank code practice | `code`, `answers`, `explanation`, `title` |
| `CaseStudy` | A contextual decision or scenario with an analyzable trade-off | `scenario`, `question`, `options`, `correctIndex`, `explanation`, `title` |

`Quiz` also accepts `questions` for a sequence of questions. `title` is optional. `CaseStudy` can reveal analysis without options, but it still needs a meaningful `scenario`, `question`, and `explanation`.

### Quiz

Use for one precise outcome, not for checking whether the reader remembers a paragraph. Distractors should represent plausible misconceptions, and the explanation should diagnose why the answer is correct.

```mdx
import Quiz from '../../../components/Quiz';

<Quiz client:load
  title="Invariant check"
  question="Which quantity remains unchanged under this transformation?"
  options={["A", "B", "C", "D"]}
  correctIndex={2}
  explanation="C is invariant because ..."
/>
```

### CodeRunner

Use for a complete, small demonstration. The browser currently executes Python and JavaScript/TypeScript; C, C++, Git, and Bash runners display their declared output rather than compiling in the browser. State the language when it is not Python. Do not put secrets, destructive commands, network-dependent assumptions, or unbounded loops in a runner.

```mdx
import CodeRunner from '../../../components/CodeRunner';

<CodeRunner client:load
  title="Inspect the invariant"
  language="python"
  code={`values = [2, 4, 6]
print(sum(values))`}
  output="12"
/>
```

### CodeExercise

Use when the learner must supply a small number of syntactically meaningful tokens. Mark each gap with `[!blank!]`; provide one answer per gap. Keep the surrounding code complete enough that the intended reasoning is visible.

```mdx
import CodeExercise from '../../../components/CodeExercise';

<CodeExercise client:load
  title="Complete the predicate"
  code={`positive = [x for x in values if x [!blank!] 0]`}
  answers={[">"]}
  explanation="The predicate retains values strictly greater than zero."
/>
```

### CaseStudy

Use for systems, design, ethics, or other decisions where context changes the answer. The scenario must contain the facts needed to reason, and the explanation should expose the relevant trade-off rather than merely name the correct option.

```mdx
import CaseStudy from '../../../components/CaseStudy';

<CaseStudy client:load
  title="Deployment decision"
  scenario="A service must choose between ..."
  question="Which constraint should determine the first design decision?"
  options={["Latency", "Correctness", "...", "..."]}
  correctIndex={1}
  explanation="Correctness is the hard constraint because ..."
/>
```

## Rendered visual components

These are Astro components and do not need `client:load`.

| Component | Use it for | Props |
| --- | --- | --- |
| `PlantUML` | UML, architecture, sequence, state, and other structural diagrams | `code`, optional `theme` |
| `PythonDiagram` | A Python-generated SVG/PNG visualization where the figure is part of the explanation | `code`, optional `format`, `title` |
| `TikZ` | Precise mathematical or geometric diagrams | `code`, optional `packages` |
| `Math` | A KaTeX-rendered inline or display formula | `math`, optional `block` |

Prefer a diagram when it communicates relationships more clearly than prose. Keep source code deterministic and bounded. A diagram is not a substitute for explaining the model it represents.

## Plain code fences

Use fenced blocks for explanation, comparison, and code that is intentionally not interactive. Python and JavaScript/TypeScript fences are syntax-checked by `scripts/course_stats.py`; other languages are currently inventory-only because many are teaching fragments rather than standalone programs. A syntax check is a brokenness check, not proof that the example is correct, useful, or pedagogically sufficient.

## Screen and book authoring

Every lesson is presented in two forms: an interactive screen lesson and a prerendered academic PDF book. Author content so both forms remain coherent. The PDF is not a screenshot of the browser; it is a citable, readable version of the course with interactions converted into static explanations where appropriate.

Use the authoring wrappers when a section belongs to only one form:

```mdx
import BookOnly from '../../../components/BookOnly.astro';
import ScreenOnly from '../../../components/ScreenOnly.astro';

<BookOnly>

### Book note

This short editorial note is useful in the reference edition but would interrupt the interactive lesson.

</BookOnly>

<ScreenOnly>

<InteractiveWidget client:load />

</ScreenOnly>
```

`BookOnly` content is hidden from normal lesson pages and included in the PDF. `ScreenOnly` content is shown on normal lesson pages and omitted from the PDF. Keep either wrapper focused and meaningful; do not duplicate whole lessons or hide required explanations behind them. Use ordinary Markdown inside the wrappers. These wrappers are the preferred, explicit mechanism—do not rely on ad-hoc `no-print` classes.

Native HTML `<details>` sections remain collapsible on screen, but their content is expanded in the PDF and their summary controls are omitted. Write solution, hint, and answer content so it reads naturally when expanded in sequence. Diagram source disclosure panels are intentionally excluded from books because the rendered diagram is the citable artifact; explain the diagram in surrounding prose instead.

Book-oriented authoring guidelines:

- Keep tables within a page-sized text column. Avoid very wide tables, unexplained abbreviations, and cells that require horizontal scrolling.
- Treat page breaks as a reading concern: keep headings with their following paragraph, keep list items and table rows intact, and avoid placing essential context only in an interactive control.
- Prefer a concise static explanation alongside an interactive exercise. The PDF includes the exercise’s meaningful prompt, answer, and explanation, but cannot preserve browser state or interaction.
- Use `BookOnly` for print-specific framing, definitions, references, or worked solutions—not as a workaround for weak screen content.

## Authoring decision

Start with the learning outcome, then choose the least elaborate representation:

1. A formula or static relationship → `Math`, PlantUML, TikZ, or PythonDiagram.
2. A single misconception → `Quiz`.
3. A runnable investigation → `CodeRunner`.
4. A small completion task → `CodeExercise`.
5. A contextual trade-off → `CaseStudy`.
6. Prose or a teaching fragment → ordinary Markdown and a fenced code block.

Every component must be intentional, self-contained, and followed by enough explanation for a learner to understand the result.

Course agents must run the smoke test before handoff and keep fixing reported code-block failures until the course passes. Every `CodeRunner` declaration is checked against its declared language; Rust, C, C++, Java, Go, Bash, Python, JavaScript, and TypeScript require the corresponding local toolchain. If a block depends on an unavailable external toolchain or environment, the verifier reports that blocker instead of silently treating it as passed. PlantUML, PythonDiagram, and TikZ failures recorded in their build error logs are smoke-test failures too.
