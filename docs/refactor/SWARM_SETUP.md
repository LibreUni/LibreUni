# Swarm setup with OpenRouter

You already have `opencode` 1.17 (`~/.opencode/bin/opencode`), which has a built-in OpenRouter provider and a non-interactive `opencode run`. The repo's [`opencode.json`](../../opencode.json) already loads `AGENTS.md`, so every agent gets the repo rules automatically. A "swarm" here is just: **many `opencode run` processes, each in its own git worktree, each with one work unit, plus a different model re-checking the result.** No framework needed (matches D-0001).

## 1. One-time setup

1. **Key + budget:** at openrouter.ai create an API key *dedicated to this project* and set a **credit limit** on it (e.g. a few dollars to start). This is your hard cost stop.
2. **Authenticate opencode:** `opencode auth login` → choose OpenRouter → paste key. (Don't put the key in the repo; `.env` is not needed.)
3. **Check models:** `opencode models openrouter` lists IDs such as `openrouter/~anthropic/claude-sonnet-latest`. Use the full string with `-m`.
4. **Smoke test (cheap):**
   `opencode run -m openrouter/~anthropic/claude-haiku-latest "Read AGENTS.md and list which docs you would read to edit one OS lesson. Do not edit anything."`
5. Make the script executable: `chmod +x scripts/swarm/run-unit.sh`.
6. Commit the docs/scripts first (or at least have a clean `HEAD`): worktrees branch from `HEAD`, so uncommitted docs are invisible to agents.

## 2. Model tiering (judgment, tune after pilot)
| Job | Tier | Why |
|---|---|---|
| Writer (lesson rebuild) | strong (Sonnet/Opus-class) | prose + correct derivations |
| Verifier | strong, **different vendor family from writer** (e.g. writer Claude, verifier a Gemini/GPT/DeepSeek-class model) | independent errors; correlated mistakes are the main risk |
| Source auditor | mid + web access if available | cheap lookups; must not invent citations |
| Engineer (model/fixture/tests) | strong | code correctness |
| Smoke/setup/triage | cheap (Haiku/Flash-class) | no judgment |

Check current names with `opencode models openrouter`; the `~…-latest` aliases move, so for reproducible batches pin a dated ID.

## 3. Running a unit
```bash
# writer
scripts/swarm/run-unit.sh writer OS-X1 src/content/lessons/operating-systems/interleavings-and-atomicity.mdx \
  openrouter/~anthropic/claude-sonnet-latest
# independent verifier (different model), after the writer finishes
scripts/swarm/run-unit.sh verifier OS-X1 src/content/lessons/operating-systems/interleavings-and-atomicity.mdx \
  openrouter/~deepseek/deepseek-flash-latest
```
Each run uses `../LibreUni-worktrees/<unit>-<role>` on branch `swarm/<unit>-<role>`. Inspect with `git -C ../LibreUni-worktrees/OS-X1-writer diff`. The verifier's worktree should be created from the writer's result: `git -C <verifier-wt> merge swarm/OS-X1-writer` before running (or pass `HEAD` as the writer branch — a small manual step; keep it manual until you trust the loop).

Parallel batch (after exemplars approved), keep to 3–5 at once:
```bash
for u in "OS-02 traps-interrupts-system-calls" "OS-04 processes-threads-context-switches" "OS-07 locks-and-memory-ordering"; do
  set -- $u
  scripts/swarm/run-unit.sh writer "$1" "src/content/lessons/operating-systems/$2.mdx" \
    openrouter/~anthropic/claude-sonnet-latest > /dev/null 2>&1 &
done; wait
```
Do **not** run `check:e2e`/`check:ux`/`check:visual` in parallel (shared ports and `dist/`); only the lightweight `verify_lessons.py`/`course_stats.py` checks run inside units.

## 4. Your role as the integrator (you or one agent)
1. Review each branch diff + evidence packet; keep or reject. Rejections go back as a new unit with the verifier's defect list pasted in the `extra` argument.
2. Merge accepted branches into the refactor branch one at a time (`git merge --no-ff swarm/OS-02-writer`), then run `npm run check:required` once per batch.
3. Update statuses in `PILOT_BACKLOG.md`; update manifests/`course-quality.json` yourself.
4. Clean up: `git worktree remove ../LibreUni-worktrees/OS-02-writer` and delete the branch.

## 5. Order of operations
1. Phase 0: baseline (`npm run check:required`), commit these docs.
2. Phase 1: run **only** OS-X1 and OS-X2 with your best model, review them yourself line by line. Fix the *spec* until you'd accept the output; this is where quality is decided.
3. Then start batches of 3–5 units; measure cost per lesson and defect rate from verifiers; only then widen.
4. Track E (fixtures) are engineer units and need your policy decision OS-E1 first.

## 6. Cost and safety rules
- Start with one lesson end-to-end and read the OpenRouter activity page to learn the real cost per unit before batching.
- Keep the key's credit limit low; raise it deliberately.
- Agents run with your user permissions inside worktrees: never give them the main checkout for batch runs, and review scripts/`package.json` diffs for unexpected changes (a worker should not edit them).
- Never put secrets, transcripts or prompts in `docs/` (see `agent-context/README.md`).

## 7. Later options
- `opencode serve` + `--attach` to share one server across runs (faster startup).
- Custom opencode agents (`.opencode/agent/*.md`) per role if you want the prompts in the repo rather than in the script — document in `HOSTS.md` first.
- Using the idea of challenge sets and leases from `docs/agent-experiments/lesson-quality-panel/agentic-runbook.md` once manual batches work.
