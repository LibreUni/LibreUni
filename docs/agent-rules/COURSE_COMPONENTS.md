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
| `MathStatement` | A semantic definition, lemma, theorem, proposition, corollary, example, or remark with stable linking | `id`, `title`, optional `kind`, `number`, `proofId`, `dependsOn` |
| `MathProof` | A proof linked back to its statement, optionally collapsible | `id`, `for`, optional `title`, `collapsible`, `open` |

Prefer a diagram when it communicates relationships more clearly than prose. Keep source code deterministic and bounded. A diagram is not a substitute for explaining the model it represents.

### Interconnected mathematical statements and proofs

Use `MathStatement` when a formal claim should be visually identifiable and linkable. Give it a stable `id`; set `proofId` when a proof is authored separately. Use `dependsOn` to expose the lemmas or definitions that a theorem consumes. Links to a statement anchor, including ordinary Markdown links, show a compact preview on hover and keyboard focus while retaining normal anchor behavior. Pair it with `MathProof`, whose `for` prop points back to the statement. A proof may be collapsible when the learner should first inspect the claim, but it must remain readable when expanded in the PDF.

```mdx
import MathStatement from '../../../components/MathStatement.astro';
import MathProof from '../../../components/MathProof.astro';

<MathStatement
  id="lagrange"
  kind="theorem"
  title="Lagrange's theorem"
  proofId="lagrange-proof"
  dependsOn={[{ id: "coset-partition", label: "coset partition lemma" }]}
>
If $H \le G$ and $G$ is finite, then $|H|$ divides $|G|$.
</MathStatement>

<MathProof id="lagrange-proof" for="lagrange" collapsible open>
The cosets partition $G$ into equally sized sets, so $|G|$ is an integer multiple of $|H|$.
</MathProof>
```

### Diagram types and usage

Choose a diagram by the question it should answer, not by the tool that is most familiar. The same subject may need different diagrams when the learner must understand both its structure and its behavior.

| Diagram type | Shows | Use it when the learner needs to understand | Preferred component |
| --- | --- | --- | --- |
| Flow or activity | Ordered steps, branches, loops, and parallel work | A process, algorithm, workflow, or decision path | `PlantUML` activity syntax |
| Sequence or interaction | Messages between participants in time order | A protocol, request path, API exchange, or collaboration | `PlantUML` sequence syntax |
| State machine | States, events, guards, and transitions | The lifecycle of one entity or event-driven system | `PlantUML` state syntax |
| Class or domain model | Types, attributes, operations, and relationships | Static concepts, responsibilities, inheritance, or composition | `PlantUML` class syntax |
| Component or deployment | Software units, interfaces, nodes, and dependencies | System structure, runtime placement, or architectural boundaries | `PlantUML` component/deployment syntax |
| Use-case or context | Actors, goals, and system boundaries | Functional scope and who interacts with a system | `PlantUML` use-case syntax |
| Mathematical or geometric | Axes, curves, shapes, constructions, and annotations | A precise proof aid, geometric relation, or function | `TikZ` |
| Quantitative visualization | Data values, trends, distributions, or comparisons | A numerical pattern that is easier to see than to read in a table | `PythonDiagram` |
| Custom conceptual or network | Nodes, links, labels, and visual groupings | A domain-specific relationship that does not fit UML or a mathematical plot | `PythonDiagram` SVG or simple `PlantUML` shapes |

Use one primary diagram for one learning outcome. Label arrows with their meaning, include only entities relevant to the explanation, and describe the model immediately before or after the rendered figure. Do not use a diagram as decoration, as a replacement for definitions, or to encode detail that cannot remain legible on a narrow screen and in the PDF.

For a visual that changes as the learner experiments, use `CodeRunner` to generate or inspect it instead of publishing a build-time diagram. Use `PythonDiagram` for a stable figure generated from bounded, deterministic Python; use `TikZ` when exact TeX-style geometry or mathematical notation is central; use `PlantUML` for relationship, process, interaction, and lifecycle diagrams.

## Content and emphasis primitives

Not every teaching feature is a React component. Lessons can also use semantic Markdown and HTML primitives that are styled by the lesson layout and preserved in the book output.

| Primitive | Use it for | Authoring pattern |
| --- | --- | --- |
| Headings, lists, and tables | Structure, ordered procedures, comparisons, and compact reference material | Ordinary Markdown; keep tables narrow enough for the PDF |
| Labeled blockquote | A visually distinct definition, lemma, theorem, proposition, proof idea, warning, or important note | `> **Lemma.** If ...` followed by the explanation or proof in ordinary prose |
| `<details>` / `<summary>` | Optional hints, solutions, retrieval answers, or secondary derivations | Put a precise action in `<summary>` such as `Reveal hint`, and make the expanded content readable in sequence |
| `BookOnly` | Print-specific framing, references, or a static explanation of an interaction | Wrap only content that belongs in the book |
| `ScreenOnly` | Interactive controls or screen-specific navigation | Wrap only content that is genuinely unavailable or disruptive in print |
| Inline and display math | Notation, equations, and short formal expressions | Use `$...$` inline and `$$...$$` for display math, or the `Math` component when explicit props are useful |
| Fenced code block | A code fragment or transcript that should be read, not executed | Use a language fence when syntax highlighting or inventory matters |

### Callouts and theorem-style content

The repository currently has no dedicated `Callout`, `Theorem`, `Lemma`, `Definition`, or `Proof` component. Do not invent imports for them. Use a labeled blockquote for a short highlighted statement and ordinary headings plus prose for a substantial proof or derivation. Keep labels consistent within a course—for example, `Definition`, `Lemma`, `Theorem`, `Proof`, `Warning`, `Example`, and `Remark`—so learners can scan the visual structure.

Use a callout-like block only when the distinction carries meaning. A lemma should identify the claim and its role; a proof should expose the reasoning; a warning should state the failure mode; and an example should connect the statement to a concrete case. Do not hide required definitions or core explanations inside a collapsed disclosure. Solutions and hints may be collapsible, but their expanded text must also read correctly in the PDF, where `<details>` content is shown without the interactive control.

If a course would materially benefit from reusable variants such as semantic theorem cards, warning/tip callouts, tabbed comparisons, or richer proof blocks, record that as a component gap and propose or implement a component separately. Until such a component exists, prefer the supported semantic primitives above over ad-hoc classes or unsupported JSX.

## Feature coverage when modernizing

For a course-wide modernization, audit the whole authoring surface rather than adding the same component everywhere:

1. Map each lesson’s learning outcomes to the most useful representation: prose, math, diagram, code, disclosure, or interaction.
2. Check all applicable diagram families in the diagram table above, including diagrams absent from the original course.
3. Check every interactive component and explain omissions where a quiz, runnable investigation, completion task, or case study would not improve the outcome.
4. Check whether formal statements, warnings, examples, hints, solutions, and proofs have a consistent visual treatment.
5. Check screen and book behavior, mobile legibility, accessibility, source disclosure, and deterministic build requirements.

The result should be a more coherent learning experience, not a catalogue of widgets. Features that are not applicable should be omitted deliberately and noted in the modernization audit.

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
