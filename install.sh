#!/usr/bin/env bash
# install.sh — fallback for agents without plugin support (OpenCode, raw setups).
# Prefer the plugin: it also delivers mandatory skills by file path via hooks. See README.md.
#
# Usage: ./install.sh [--target DIR] [--claude-rules]
#   --target DIR     project to install into (default: current directory)
#   --claude-rules   also write .claude/rules/<skill>.md with `paths` frontmatter from
#                    plugins/agents/guidelines.json, so Claude Code loads them by path without the plugin
#
# Copies skills to DIR/.agents/skills/<name>/SKILL.md and docs to DIR/.agents/docs/. Safe to re-run; overwrites only files it owns.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="${REPO_DIR}/plugins/agents"
TARGET_DIR="${PWD}"
CLAUDE_RULES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_DIR="$2"; shift 2 ;;
    --claude-rules) CLAUDE_RULES=1; shift ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

echo "Installing ivanov-gv/agents skills into: ${TARGET_DIR}"

for skill_dir in "${PLUGIN_DIR}"/skills/*/; do
  name="$(basename "${skill_dir}")"
  dest="${TARGET_DIR}/.agents/skills/${name}"
  mkdir -p "${dest}"
  cp -R "${skill_dir}." "${dest}/"
  echo "  [skill] ${name} -> ${dest}/SKILL.md"
done

# Docs are linked from skills as ../../docs/<file>, which resolves to .agents/docs/<file> here.
mkdir -p "${TARGET_DIR}/.agents/docs"
cp -R "${PLUGIN_DIR}/docs/." "${TARGET_DIR}/.agents/docs/"
echo "  [docs]  -> ${TARGET_DIR}/.agents/docs"

if [[ "${CLAUDE_RULES}" == 1 ]]; then
  node - "${PLUGIN_DIR}" "${TARGET_DIR}/.claude/rules" <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const [plugin, out] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(path.join(plugin, 'guidelines.json'), 'utf8'));
fs.mkdirSync(out, {recursive: true});
for (const g of config.guidelines) {
  if (!g.paths?.length) continue;
  if ((g.requires ?? []).some(f => !fs.existsSync(path.join(out, '../..', f)))) continue;
  const body = fs.readFileSync(path.join(plugin, 'skills', g.skill, 'SKILL.md'), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/\]\(\.\.\/\.\.\/docs\//g, '](../../.agents/docs/'); // rules live in .claude/rules/
  const rule = ['---', 'paths:', ...g.paths.map(p => `  - "${p}"`), '---',
    `<!-- Installed from ivanov-gv/agents skills/${g.skill}. Re-run install.sh --claude-rules to update. -->`, body.trimStart()].join('\n');
  const file = path.join(out, `agents-${g.skill}.md`);
  fs.writeFileSync(file, rule);
  console.log(`  [rule]  ${g.skill} -> ${file}`);
}
EOF
fi

echo
echo "Done. Point your agent at .agents/skills if it does not discover it automatically."
