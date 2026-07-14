# LibreUni agent workflows

`libreuni-agent` is the command-line workflow for having an AI research, design, draft, repair, review, and validate LibreUni content. It is intentionally a sequence of independent stages rather than one agent being asked whether its own work is good.

The safe default is proposal mode: the agent may create improved files under `.libreuni-agent/`, but it does not change `src/`. Add `--apply` only when you want an approved run to write its proposals into the repository.

## Start here: repair Abstract Algebra

Abstract Algebra already has the course id `math-algebra`. Its lessons are in the shared `math` directory, but the workflow selects them by their `course:` frontmatter, so use:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
export OPENROUTER_API_KEY='your-key-here'

# Optional: if using a local .env file, verify without revealing the key.
libreuni-agent --check-config

# Safe run: research, audit, propose repairs, and save a manifest.
libreuni-agent math-algebra \
  --kind course \
  --objective 'Audit the entire Abstract Algebra course. Find incorrect mathematics, missing prerequisites, weak sequencing, unsupported claims, citation problems, missing theory-example-exercise structure, and MDX/component errors. Repair the highest-impact problems while preserving the course intent.'
```

Inspect the resulting run id and proposal directory printed by the command. If the result is `blocked`, open the JSON manifest in `.libreuni-agent/` and fix or investigate the listed findings. If the result is `approved`, review the proposed MDX files and then run the same command with `--apply` when you want the changes written.

```bash
libreuni-agent math-algebra \
  --kind course \
  --objective 'Repair Abstract Algebra conservatively, prioritizing mathematical correctness and genuine sources.' \
  --apply
```

Do not start with `--apply` for a large course. The proposal artifacts are the review surface and make it possible to reject a bad run without restoring files.

## What the positional target means

| `--kind` | Target value | What the workflow selects |
|---|---|---|
| `course` | A lesson frontmatter course id, such as `math-algebra` | Every `.mdx` lesson whose frontmatter contains `course: math-algebra` |
| `module` | A manifest id, such as `software-architecture` or `math` | Every lesson named by `src/data/course-manifests/<target>.yml` |
| `lesson` | A lesson slug, such as `galois-solvability`, or an `.mdx` path | One lesson |

Use `course` when the course id is authoritative in frontmatter. Use `module` when you want to work from a manifest grouping. In the current repository, a manifest can describe a large curriculum rather than one small module; the workflow follows the manifest exactly.

Useful discovery commands:

```bash
# Find course ids
rg -n '^course:' src/content/lessons | sort -u

# Find manifest ids
ls src/data/course-manifests/*.yml

# Find lessons belonging to one course
rg -l '^course: math-algebra$' src/content/lessons
```

## Common jobs

### Ask the AI to audit and repair an existing course

```bash
libreuni-agent math-algebra --kind course \
  --objective 'Audit first, then repair only evidence-backed issues. Check mathematical correctness, prerequisite coverage, sequencing, exercises, citations, banned filler, canonical MDX props, and build safety.'
```

The command researches sources, proposes changes, runs deterministic checks, asks a separate reviewer to challenge the work, revises up to the configured limit, and runs repository checks. It is not an audit-only command: even when the objective says “audit”, it may produce repair proposals. It still will not modify the repository unless `--apply` is given.

### Work on one lesson

```bash
libreuni-agent galois-solvability --kind lesson \
  --objective 'Correct every mathematical or sourcing problem and preserve the existing pedagogical intent.'
```

### Work on a manifest-defined collection

```bash
libreuni-agent software-architecture --kind module \
  --objective 'Review the manifest-defined collection for gaps, inconsistent level, weak examples, and missing exercises.'
```

### Create a new course

The current runner improves existing lessons; it does not yet scaffold the course JSON, manifest YAML, and initial lesson set from an empty course id. Create those repository-native skeleton files first, add at least one lesson with the intended `course:` id, then run the course workflow:

```bash
# After adding src/content/courses/my-course.json,
# src/data/course-manifests/my-course.yml, and an initial lesson:
libreuni-agent my-course --kind course \
  --objective 'Develop this new course from its stated learning outcomes. Design the module sequence, identify authoritative sources, and write self-contained lessons with theory, examples, and exercises.'
```

This limitation is deliberate: an empty target has no existing intent, learning outcomes, or scope for the reviewer to protect. A human should provide that initial contract before asking the AI to expand it.

## All command-line parameters

```text
libreuni-agent TARGET [--kind course|module|lesson]
                    [--objective TEXT]
                    [--apply]
                    [--root PATH]
```

| Parameter | Default | Meaning |
|---|---|---|
| `TARGET` | required | Course id, manifest id, lesson slug, or lesson path |
| `--kind` | `course` | Select by course frontmatter, manifest, or one lesson |
| `--objective` | `Audit and improve the target while preserving its intent.` | Detailed instructions for the planner, writer, and reviewer. State the subject-specific risks and priorities here. |
| `--apply` | off | Apply proposals only after the workflow reaches `approved`; omit for proposal mode. |
| `--root` | current directory | Repository root, useful when invoking the CLI from another directory. |

The objective is the main user-facing control. Good objectives specify scope, priorities, constraints, and what must not be changed. For example: “repair proofs and prerequisites, do not invent citations, preserve the current lesson topics, and prefer small file-by-file changes.”

## Environment parameters

| Variable | Default | Meaning |
|---|---|---|
| `OPENROUTER_API_KEY` | required for authoring | API key; may be loaded from a local ignored `.env`, but never commit or print it |
| `LIBREUNI_MODEL` | `openai/gpt-4o-mini` | Planner/writer/reviser model |
| `LIBREUNI_REVIEWER_MODEL` | value of `LIBREUNI_MODEL` | Independent adversarial reviewer model |
| `LIBREUNI_MAX_REVISIONS` | `3` | Maximum repair loops before the run becomes `blocked` |
| `LIBREUNI_MAX_SOURCES` | `8` | Maximum successfully fetched sources in the evidence bundle |

Example using inexpensive models and a longer repair budget:

```bash
export LIBREUNI_MODEL='google/gemini-2.0-flash-001'
export LIBREUNI_REVIEWER_MODEL='qwen/qwen-2.5-72b-instruct'
export LIBREUNI_MAX_REVISIONS='5'
export LIBREUNI_MAX_SOURCES='12'
libreuni-agent math-algebra --kind course
```

Model names are OpenRouter model slugs and can change; check the current OpenRouter model catalog before selecting one.

## API keys and other agents

Codex, OpenCode, Gemini CLI, Antigravity, and similar tools can use this workflow when they discover the repository instructions. `AGENTS.md`, `CODEX.md`, and `GEMINI.md` now explicitly designate this workflow as the primary path for course work. For tools that do not automatically read those files, give them this instruction at startup:

```text
For LibreUni course work, read AGENTS.md and docs/AGENT_WORKFLOWS.md first. Use libreuni-agent as the primary workflow. Run libreuni-agent --check-config, work in proposal mode, and never claim success unless the workflow returns approved.
```

`libreuni-agent --check-config` reports only whether a key is present, the selected models, and the artifact directory. It never prints the key. A process environment variable is the safest local default. For convenience, the runner also loads `.env` from the repository root when `python-dotenv` is installed; shell environment variables take precedence.

`.env` being Git-ignored protects against ordinary accidental commits, but it is not a security boundary. Any agent or local process with access to the workspace can read it, and a malicious or poorly configured tool could disclose it. Use a local `.env` only on a trusted machine, keep its permissions private, never paste it into prompts or logs, and rotate the key if exposure is suspected. In shared workspaces or CI, prefer the host's secret manager/environment injection. Commit only `.env.example`.

## What happens during a run

1. Inventory loads the repository rules, sourcing rules, repair guidance, manifest data, and target content.
2. Research searches online and fetches a bounded evidence bundle. Failed fetches are excluded.
3. Planning identifies the smallest useful set of changes and the claims that need support.
4. Drafting proposes complete MDX files using only the evidence bundle.
5. Deterministic checks inspect frontmatter, banned filler, references, source-comment bypasses, component hydration, and canonical props.
6. A separate reviewer challenges correctness, prerequisites, sequencing, citations, exercise quality, and MDX safety.
7. The reviser addresses findings. This loop is bounded; unresolved errors produce `blocked`, not a false success.
8. Final checks run `course_stats.py` and `verify_lessons.py`. Approved proposals are saved, and `--apply` writes them to the repository.

## Reading the output

Each run prints a `run_id` and the artifact directory `.libreuni-agent/`. The JSON manifest records sources, plan, review findings, revision history, checks, and status. The important statuses are:

- `approved`: all configured gates passed; proposals are available and may be applied.
- `blocked`: a source, model, deterministic check, repository check, or revision limit prevented approval.
- `failed`: an unexpected execution error occurred and should be investigated before retrying.

Research is not a citation generator. The writer must cite URLs in the fetched evidence bundle, and the reviewer must flag unsupported or fabricated references. Human review remains appropriate for mathematical correctness, high-stakes subjects, and final publication.
