# Course components

This is the canonical guide for authors and agents writing LibreUni lessons. Components are teaching tools, not quality quotas. Use one only when it improves a specific learning outcome; a lesson is not better because it contains more widgets.

The course standard is mandatory: read [`COURSE_STANDARD.md`](COURSE_STANDARD.md) before using this guide. Components should make difficult reasoning visible, executable, testable, or comparable. Agents must genuinely inspect and use the available authoring surface when it serves the outcome—not stop at plain prose by habit and not add widgets ceremonially.

Never reuse one interactive component as a course-wide substitute for heading-level teaching artifacts. Each visual or interactive element must be authored for the specific paragraph or heading it follows. For structured technical courses, audit every substantive `##` heading and provide an intentional diagram, graph, exercise, playground, or equivalent teaching artifact at that heading.

A quiz is not a substitute for a diagram, simulation, playground, or code task when the outcome concerns structure, state, motion, execution, or quantitative behavior. A suitable artifact exposes the relevant variables, transitions, constraints, or counterexamples. Reusing a generic artifact pattern with renamed labels is padding; artifact counts are inventory only and cannot establish modernization. Course reviews must include representative visual inspection from every module. A clean mechanical audit is necessary but never sufficient.

## React components

Import from `src/components/` with a relative MDX import and add `client:load` to every use. Only the props listed here are supported.

| Component | Use it for | Required teaching inputs |
| --- | --- | --- |
| `Quiz` | A focused knowledge check or misconception check | `question`, `options` (strings or `{ id, text, isCorrect, feedback }`), `correctIndex`, `explanation` |
| `CodeRunner` | A small, runnable demonstration the learner should modify or execute | `code`, optionally `output`, `language`, `title`, `description` |
| `CodeExercise` | Fill-in-the-blank code practice | `code`, `answers`, `explanation`, `title`, optional `description` |
| `FillInExercise` | Fill-in-the-blank practice for prose, formulas, or conceptual steps | `prompt` (or `text`), `answers`, `explanation`, `title` |
| `CaseStudy` | A contextual decision or scenario with an analyzable trade-off | `scenario`, `question`, `options`, `correctIndex`, `explanation`, `title` |
| `SqlRunner` | Execute read-only SQL against a fixed, in-browser SQLite fixture | `schema`, `initialQuery`, optional `title`, `description` |
| `PracticeGenerator` | Interactive question generator with parameter randomization, progressive hints, and worked solutions | `courseId` (used with `client:load`) |

`Quiz` uses a multi-claim classification matrix: the learner classifies each option independently as `Correct` or `Incorrect`, or leaves uncertain options unanswered (`"I don't know"`), and `Verify answers` is always unlocked to inspect inline feedback at any time (unanswered options are reported distinctly rather than silently counted as `Incorrect`). This prevents relative answer length or position from acting as a shortcut. `CaseStudy` requires structured decision commitment: the learner inspects the scenario and candidate alternatives and commits to a recommended decision before the trade-off analysis and reference decision are revealed. Authors must still keep choices concise, balance their specificity, and write plausible misconception-based alternatives; interaction design does not excuse cueing or weak distractors.

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

Use when the learner must supply a small number of syntactically meaningful tokens in executable code. Mark each gap with `[!blank!]`; provide one answer per gap. Keep the surrounding code complete enough that the intended reasoning is visible.

Never use `CodeExercise` for prose questions or mathematical derivations formatted as comments (e.g. all lines starting with `#` or `//`); `CodeExercise` rejects comment-only code as an anti-pattern. Use `FillInExercise` instead.

```mdx
import CodeExercise from '../../../components/CodeExercise';

<CodeExercise client:load
  title="Complete the predicate"
  code={`positive = [x for x in values if x [!blank!] 0]`}
  answers={[">"]}
  explanation="The predicate retains values strictly greater than zero."
/>
```

### FillInExercise

Use when the learner must supply a small number of keywords, mathematical terms, or proof steps in prose or LaTeX notation, independent of executable code. Mark each gap with `[!blank!]` or `___`; provide expected answer string(s) in `answers`. `answers` accepts either strings or arrays of alternative valid forms for each blank.

```mdx
import FillInExercise from '../../../components/FillInExercise';

<FillInExercise client:load
  title="Complete the Integration by Parts formula"
  prompt={`We know the product rule: $\\frac{d}{dx}(u \\cdot v) = u' \\cdot v + u \\cdot v'$.
Integrating both sides and rearranging:
$\\int (u \\cdot v')\\,dx = u \\cdot v - $ [!blank!]`}
  answers={["\\int (u' \\cdot v)\\,dx"]}
  explanation="Follows directly by integrating both sides of the product rule."
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

### SqlRunner

Use `SqlRunner` when the learner must execute a query against a fixed fixture and compare the
observed result with a prediction. Each run seeds a fresh in-browser SQLite database from `schema`
and accepts one read-only `SELECT`, `WITH`, or `EXPLAIN` statement. Execution is isolated in a
worker with a time limit and a 100-row display limit. SQLite is not PostgreSQL: state dialect- and
planner-specific claims separately and require a PostgreSQL run to verify them. Keep the fixture
small, deterministic, and free of secrets. Include the fixture and expected results in the lesson
itself; the book prints the starting query but cannot run it.

```mdx
import SqlRunner from '../../../components/SqlRunner';

<SqlRunner client:load
  title="Run the regional availability report"
  description="Predict the two rows before running the query."
  schema={`CREATE TABLE service_deployment (id integer primary key, service_id text, region text);
INSERT INTO service_deployment VALUES (10, 'S101', 'us-east'), (11, 'S202', 'eu-west');`}
  initialQuery={`SELECT service_id, region FROM service_deployment ORDER BY service_id;`}
/>
```

### Named interactive investigations

Use a named playground when the outcome requires manipulating a quantitative variable, stepping through state, injecting failure, or comparing a model with an observation. Compose it with `InteractivePlayground`; do not import that frame directly from MDX. The named component owns its domain model, controls, accessible status, responsive SVG or state view, and static book representation.

The active 4-course catalog investigations under `src/components/playgrounds/` include calculus (`EpsilonDeltaPlayground`, `TangentPlayground`, `RiemannPlayground`), computer architecture (`RepresentationPlayground`, `CacheHierarchyPlayground`, `PipelineHazardPlayground`, `AmdahlPlayground`, `PageTablePlayground`, `DeviceIOPlayground`), operating systems (`SystemCallPathPlayground`, `SchedulerPlayground`, `InterleavingPlayground`, `ConditionVariablePlayground`, `PageReplacementPlayground`, `DiskSchedulingPlayground`, `CrashConsistencyPlayground`, `IsolationBoundaryPlayground`, `LockScalabilityPlayground`), and database systems (`RelationalAlgebraPlayground`, `JoinPredicatePlayground`, `FunctionalDependencyPlayground`, `BTreePlayground`, `QueryPlanCostPlayground`, `IsolationSchedulePlayground`, `RecoveryLogPlayground`, `ReplicationQuorumPlayground`). Each is intentionally attached to a lesson that derives the displayed model. Reuse one only when the exact variables and learning outcome match; a renamed title is not reuse.

```mdx
import AmdahlPlayground from '../../../components/playgrounds/AmdahlPlayground';

<AmdahlPlayground client:load />
```

Every playground must provide:

- a bounded control with an explicit label and current value;
- a visible state, curve, trace, or counterexample that changes with the control;
- adjacent prose that derives or justifies the model and states its omissions;
- a deterministic static representation and caption for the course PDF; and
- keyboard-operable controls, meaningful image labels, and live status where appropriate.

## Rendered visual components

These are Astro components and do not need `client:load`.

| Component | Use it for | Props |
| --- | --- | --- |
| `Figure` | Build-time verified mathematical SVG plot for real functions (mandatory for function graphs per D-0014) | `id`, optional `size` (`'normal'` \| `'thumb'`), `collapsed`, `summary`, `caption` |
| `PlantUML` | UML, architecture, sequence, state, and other structural diagrams | `code`, optional `theme`, `bookOnly` |
| `PythonDiagram` | A Python-generated SVG/PNG visualization where the figure is part of the explanation | `code`, optional `format`, `title`, `bookOnly` |
| `TikZ` | Precise mathematical or geometric diagrams (not function plots) | `code`, optional `packages`, `bookOnly` |
| `Math` | A KaTeX-rendered inline or display formula | `math`, optional `block` |
| `MathStatement` | A semantic definition, lemma, theorem, proposition, corollary, invariant, example, or remark with stable linking | `id`, `title`, optional `kind`, `proofId`, `dependsOn` |
| `MathProof` | A proof linked back to its statement, optionally collapsible | `id`, `for`, optional `title`, `collapsible`, `open` |
| `Ref` | Dynamic semantic link with hover popover preview to any statement, exercise, problem, or figure | `id`, optional `label`, `showTitle` |
| `ExerciseSet` | Concluding exercise set on lesson/lab pages (4–8 items) | slot |
| `Exercise` | Practice exercise item on lesson/lab pages | `id`, `title`, `type`, optional `level`, `challenge` |
| `ProblemSet` | Problem set container on chapter `problems` pages (10–20 items) | slot |
| `Problem` | Practice problem item on `problems` pages | `id`, `title`, optional `type`, `level`, `challenge`, `covers` |
| `ExerciseSolution` | Collapsible solution card with optional hint disclosure for self-checks (supports `hint` string prop or `<div slot="hint">` / `<p slot="hint">` when using `<Ref>` or rich blocks) | optional `hint`, `title`, `hintTitle` |

Prefer a diagram or figure when it communicates relationships more clearly than prose. Keep source code deterministic and bounded. A diagram is not a substitute for explaining the model it represents.

### Verified Mathematical Figures (`<Figure>`)

Use `<Figure id="..." />` whenever graphing a real function. Function curves must never be hand-drawn with Bézier controls or coordinate approximations in TikZ (`LINT-09`). All figures are defined in `src/figures/<course>/<id>.mjs` and verified through Node tests (`tests/figures.test.mjs` A1–A9).

- Standard full-width figure: `<Figure id="fig-name" />`
- Thumbnail for recaps and exercises: `<Figure id="fig-name" size="thumb" />`
- Collapsible disclosure for hints and solutions: `<Figure id="fig-name" collapsed summary="Show graph" />`

### Self-Paced Practice Generator (`<PracticeGenerator>`)

Use on `practice` pages. The `<PracticeGenerator client:load courseId="..." />` component provides self-paced practice without timers, exams, or pressure. It enables learners to select topics and difficulty levels, generates fresh problems with algorithmically randomized parameters, reveals progressive hints, and renders complete step-by-step worked solutions. All generated questions and learner progress persist in local storage across browser refreshes.

```mdx
import PracticeGenerator from '../../../components/PracticeGenerator';

<PracticeGenerator client:load courseId="calculus-intro" />
```

### Problem Sets and Problems (`<ProblemSet>`, `<Problem>`)

Use on `problems` pages to organize 10–20 chapter problems spanning recall, application, transfer, and synthesis. `Problem` automatically receives its dynamic chapter-scoped number (`m.P.i`) from the block registry and embeds `<ExerciseSolution>`.

```mdx
import ProblemSet from '../../../components/ProblemSet.astro';
import Problem from '../../../components/Problem.astro';

<ProblemSet>
  <Problem id="prob-darboux-step" title="Step Function Integrability" type="prove" level="transfer" covers={["integration"]}>
    Problem statement...
    <ExerciseSolution>
      <div slot="hint">Hint text...</div>
      Solution text...
    </ExerciseSolution>
  </Problem>
</ProblemSet>
```

### Practice Generators vs Abolished Timed Examinations (D-0017)

Per **D-0017**, timed examination halls, countdown clocks, proctoring states, points tallies, and marking schemes (`<ExamAttempt>`, `<ExamQuestion>`, `<MarkingScheme>`) are completely abolished from LibreUni. Practice is self-paced, generative, and mastery-driven via `<PracticeGenerator client:load courseId="..." />`. All practice modules across courses (`calculus-intro`, `database-systems`, `computer-architecture`, `operating-systems`) use `<PracticeGenerator>` with randomized parameters, progressive hints, concise answers, and complete worked derivations.

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

<MathProof id="lagrange-proof" for="lagrange" collapsible>
The cosets partition $G$ into equally sized sets, so $|G|$ is an integer multiple of $|H|$.
</MathProof>
```

### ExerciseSolution

Use for non-interactive self-checks, calculation exercises, or proof tasks where a learner benefits from a hint before opening the worked solution. Provides distinct accessible disclosures for the hint and the worked solution without nesting, and supports inline and display LaTeX math in both hints and solutions.

```mdx
import ExerciseSet from '../../../components/ExerciseSet.astro';
import Exercise from '../../../components/Exercise.astro';
import ExerciseSolution from '../../../components/ExerciseSolution.astro';

<ExerciseSet>
  <Exercise id="ex-cache-capacity" type="verify" level="application" title="Cache capacity calculation">

Calculate the minimum capacity required for ...

<ExerciseSolution
  hint="Recall that $\text{Capacity} = \text{Sets} \times \text{Associativity} \times \text{BlockSize}$."
  title="Show solution"
  hintTitle="Show hint"
>

**Solution:**

Applying the capacity equation:
...

</ExerciseSolution>

  </Exercise>
</ExerciseSet>
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
| Mathematical or geometric (non-function) | Axes, shapes, and static geometric constructions | A precise proof aid or geometric construction that does not plot a real function | `TikZ` |
| Real-function graph | Build-time verified function curves, tangent/secant lines, and areas | Plotting real functions, discontinuities, or Riemann sums (mandatory per D-0014 / `LINT-09`) | `Figure` |
| Quantitative visualization | Data values, trends, distributions, or comparisons | A numerical pattern that is easier to see than to read in a table | `PythonDiagram` |
| Custom conceptual or network | Nodes, links, labels, and visual groupings | A domain-specific relationship that does not fit UML or a mathematical plot | `PythonDiagram` SVG or simple `PlantUML` shapes |

Use one primary diagram for one learning outcome. Label arrows with their meaning, include only entities relevant to the explanation, and describe the model immediately before or after the rendered figure. Do not use a diagram as decoration, as a replacement for definitions, or to encode detail that cannot remain legible on a narrow screen and in the PDF.

For a visual that changes as the learner experiments, use `CodeRunner` to generate or inspect it instead of publishing a build-time diagram. Use `PythonDiagram` for a stable figure generated from bounded, deterministic Python; use `TikZ` when exact TeX-style geometry or mathematical notation is central; use `PlantUML` for relationship, process, interaction, and lifecycle diagrams.

## Content and emphasis primitives

Not every teaching feature is a React component. Lessons can also use semantic Markdown and HTML primitives that are styled by the lesson layout and preserved in the book output.

| Primitive | Use it for | Authoring pattern |
| --- | --- | --- |
| Headings, lists, and tables | Structure, ordered procedures, comparisons, and compact reference material | Ordinary Markdown; keep tables narrow enough for the PDF |
| Labeled blockquote | A visually distinct definition, lemma, theorem, proposition, proof idea, warning, or important note | `> **Lemma (Title).** If ...` compiles automatically to an addressable Statement card |
| `ExerciseSolution` | Optional hints, worked solutions, and retrieval answers | Use `<ExerciseSolution>` with `hint` and slot content (raw `<details>` is forbidden per D-0012) |
| `BookOnly` | Print-specific framing, references, or a static explanation of an interaction | Wrap only content that belongs in the book |
| `ScreenOnly` | Interactive controls or screen-specific navigation | Wrap only content that is genuinely unavailable or disruptive in print |
| Inline and display math | Notation, equations, and short formal expressions | Use `$...$` inline and `$$...$$` for display math, or the `Math` component when explicit props are useful |
| Fenced code block | A code fragment or transcript that should be read, not executed | Use a language fence when syntax highlighting or inventory matters |

### Callouts and theorem-style content

Use `MathStatement` or labeled blockquotes for formal statements, definitions, theorems, lemmas, propositions, corollaries, invariants, examples, and warnings. Use `MathProof` for step-by-step proofs and derivations. Do not invent custom component names such as `<Callout>`, `<Theorem>`, `<Lemma>`, `<Definition>`, or `<Proof>` — use `<MathStatement kind="theorem" ...>` (or the blockquote sugar `> **Theorem.**`) and `<MathProof for="...">` (D-0012, D-0013). Keep labels consistent across a course so learners can scan the visual structure.

Use a callout-like block only when the distinction carries meaning. A lemma should identify the claim and its role; a proof should expose the reasoning; a warning should state the failure mode; and an example should connect the statement to a concrete case. Do not hide required definitions or core explanations inside a collapsed disclosure. Solutions and hints may be collapsible via `<ExerciseSolution>`, but their expanded text must also read correctly in the PDF.

## Required authoring-surface audit

For every new, repaired, or substantially revised lesson, record a brief decision for the applicable options below. For course- or module-scale work, audit the complete target set and include the decisions in the review evidence. “Not applicable” is valid only with a pedagogical reason.

- existing React components: `Quiz`, `CodeRunner`, `CodeExercise`, and `CaseStudy`;
- existing Astro/rendered components: `PlantUML`, `PythonDiagram`, `TikZ`, `Math`, `MathStatement`, `MathProof`, and `ExerciseSolution`;
- MDX and Astro primitives: semantic headings, tables, labeled blockquotes, `BookOnly`, `ScreenOnly`, math, and fenced code;
- diagram families: flow/activity, sequence, state, class/domain, component/deployment, use-case/context, mathematical/geometric, quantitative, and custom conceptual/network; and
- a small custom Astro or React component when the current surface cannot express a necessary teaching interaction or semantic structure.

Use the framework’s capabilities to support motivation, derivation, visualization, experimentation, transfer, feedback, accessibility, and screen/book coherence. A custom component is justified by a real learning need and must be deterministic, bounded, accessible, responsive, printable where relevant, and documented for future authors. Do not create a custom component to decorate weak content or to evade the standard.

The audit must state which representation best serves each major outcome, which applicable features were used, which were deliberately omitted, and why. A component does not replace the surrounding explanation, worked reasoning, counterexample, or complete solution.

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

Raw `<details>` elements in MDX lesson bodies are forbidden (`LINT-01`). Built-in disclosure components (`<ExerciseSolution>`, `<MathProof>`, and `<Figure collapsed>`) render collapsible disclosures on screen while expanding cleanly in the PDF with their summary controls omitted. Write solution, hint, and answer content so it reads naturally when expanded in sequence. Diagram source disclosure panels are intentionally excluded from books because the rendered diagram is the citable artifact; explain the diagram in surrounding prose instead.

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
