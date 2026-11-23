#!/bin/sh
# Runs opencode non-interactively as the developer subagent. See ../SKILL.md.
# Usage: run-opencode.sh <worktree> <model> <log name> <task text>
# The developer rules come first; the project's own AGENTS.md applies on top.
set -u
worktree=$1; model=$2; name=$3; task=$4
rules="$(dirname "$0")/../developer-rules.md"
opencode=${OPENCODE:-$HOME/.opencode/bin/opencode}
log_dir=${AGENTS_LOG_DIR:-$HOME/.agents/logs}
mkdir -p "$log_dir"
log="$log_dir/$name.log"
rules_text=$(cat "$rules") || exit 1
cd "$worktree" || exit 1
start=$(date +%s)
"$opencode" run --auto --archived --model "$model" --title "$name" "$rules_text

$task" >"$log" 2>&1
status=$?
echo "exit $status after $(( $(date +%s) - start ))s log $log"
tail -40 "$log"
