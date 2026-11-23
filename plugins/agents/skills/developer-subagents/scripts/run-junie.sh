#!/bin/sh
# Runs JetBrains Junie (junie-lite) non-interactively as the developer subagent. Every run starts cold. See ../SKILL.md.
# Usage: run-junie.sh <worktree> <log name> <task text>
set -u
worktree=$1; name=$2; task=$3
rules="$(dirname "$0")/../developer-rules.md"
log_dir=${AGENTS_LOG_DIR:-$HOME/.agents/logs}
mkdir -p "$log_dir"
log="$log_dir/$name.log"
rules_text=$(cat "$rules") || exit 1
cd "$worktree" || exit 1
start=$(date +%s)
junie --skip-update-check --model junie-lite --system-prompt "$rules_text" \
  --project "$PWD" --task "$task" >"$log" 2>&1
status=$?
echo "exit $status after $(( $(date +%s) - start ))s log $log"
tail -60 "$log"
