#!/usr/bin/env bash
# Run one swarm work unit in an isolated git worktree with opencode + OpenRouter.
# Usage: scripts/swarm/run-unit.sh <role> <unit-id> <target-path> <openrouter-model> [extra instruction]
#   role:   writer | verifier | engineer | sources
#   model:  e.g. openrouter/~anthropic/claude-sonnet-latest   (list: opencode models openrouter)
# Requires OpenRouter auth (see docs/refactor/SWARM_SETUP.md). Never commits or pushes.
set -euo pipefail

role="${1:?role}"; unit="${2:?unit id}"; target="${3:?target path}"; model="${4:?model}"; extra="${5:-}"
repo="$(git rev-parse --show-toplevel)"
branch="swarm/${unit}-${role}"
wt="${repo}/../LibreUni-worktrees/${unit}-${role}"

if [ ! -d "$wt" ]; then
  mkdir -p "$(dirname "$wt")"
  git -C "$repo" worktree add -b "$branch" "$wt" HEAD
fi
[ -e "$wt/node_modules" ] || ln -s "$repo/node_modules" "$wt/node_modules"

prompt="You are the ${role} for work unit ${unit} in LibreUni. Follow AGENTS.md, then docs/refactor/SWARM_PLAYBOOK.md.
Unit definition: find '${unit}' in docs/refactor/PILOT_BACKLOG.md. Target: ${target}.
Only edit files you own for role '${role}' (see the playbook's file-ownership table). Do not commit, push, or edit backlog status.
Finish by writing the evidence packet to docs/refactor/packets/${unit}.md (writer/engineer) or docs/refactor/packets/${unit}-review.md (verifier: re-derive every number independently BEFORE reading the writer's solutions; report defects, do not fix).
${extra}"

cd "$wt"
mkdir -p docs/refactor/packets
opencode run --dir "$wt" -m "$model" --title "${unit}-${role}" "$prompt" | tee "docs/refactor/packets/${unit}-${role}.log"
echo "Done. Review with: git -C '$wt' status && git -C '$wt' diff"
