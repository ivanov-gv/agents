#!/usr/bin/env bash
# SubagentStart hook: emit the agents:* skill registry as additionalContext
# so subagents (which do NOT inherit the parent's skill registry) can still
# discover and invoke skills via the Skill tool.

set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SKILLS_DIR="$PLUGIN_ROOT/skills"
AGENTS_DIR="$PLUGIN_ROOT/agents"

extract_field() {
  # Read a YAML frontmatter scalar (single-line) from a markdown file.
  # $1: file path, $2: field name (e.g. "name", "description")
  awk -v field="$2" '
    BEGIN { in_fm = 0 }
    /^---[[:space:]]*$/ {
      if (in_fm == 0) { in_fm = 1; next } else { exit }
    }
    in_fm && $0 ~ "^"field":[[:space:]]" {
      sub("^"field":[[:space:]]*", "")
      print
      exit
    }
  ' "$1"
}

# Build the context payload.
{
  printf 'Skills from the `agents` plugin (parent session sees them in the main skill registry; you do NOT inherit that registry, so use this listing). Invoke via the Skill tool with skill="agents:<name>".\n\n'

  if [ -d "$SKILLS_DIR" ]; then
    for skill_dir in "$SKILLS_DIR"/*/; do
      [ -d "$skill_dir" ] || continue
      skill_file="$skill_dir/SKILL.md"
      [ -f "$skill_file" ] || continue
      name="$(extract_field "$skill_file" name)"
      desc="$(extract_field "$skill_file" description)"
      [ -n "$name" ] || name="$(basename "$skill_dir")"
      printf -- '- agents:%s — %s\n' "$name" "$desc"
    done
  fi

  if [ -d "$AGENTS_DIR" ]; then
    printf '\nSubagents from the `agents` plugin (invoke via the Agent tool with subagent_type="<name>"):\n\n'
    for agent_file in "$AGENTS_DIR"/*.md; do
      [ -f "$agent_file" ] || continue
      name="$(extract_field "$agent_file" name)"
      desc="$(extract_field "$agent_file" description)"
      [ -n "$name" ] || name="$(basename "$agent_file" .md)"
      printf -- '- %s — %s\n' "$name" "$desc"
    done
  fi
} | jq -Rs '{hookSpecificOutput: {hookEventName: "SubagentStart", additionalContext: .}}'
