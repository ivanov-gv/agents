#!/usr/bin/env bash
# install.sh — fallback installer for OpenCode, raw setups, and manual installs.
# Usage: ./install.sh [--target DIR]
#
# By default installs into the current directory. Pass --target to override.
# Safe to run multiple times (idempotent).

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="${REPO_DIR}/plugins/agents"
TARGET_DIR="${PWD}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SKILLS_DEST="${TARGET_DIR}/.agents/skills"
AGENTS_DEST="${TARGET_DIR}/.agents/agents"

echo "Installing ivanov-gv/agents plugin into: ${TARGET_DIR}"

mkdir -p "${SKILLS_DEST}" "${AGENTS_DEST}"

# --- Skills ---

install_skill() {
  local name="$1"
  local src="${PLUGIN_DIR}/skills/${name}/SKILL.md"
  local dest="${SKILLS_DEST}/${name}.md"
  cp "${src}" "${dest}"
  echo "  [skill] ${name} -> ${dest}"
}

install_skill go-conventions
install_skill gh-contribute
install_skill rust-learning
install_skill docker-build

# --- Agents ---

install_agent() {
  local name="$1"
  local src="${PLUGIN_DIR}/agents/${name}.md"
  local dest="${AGENTS_DEST}/${name}.md"
  cp "${src}" "${dest}"
  echo "  [agent] ${name} -> ${dest}"
}

install_agent reviewer

# --- AGENTS.md ---

if [[ ! -f "${TARGET_DIR}/AGENTS.md" ]]; then
  cp "${REPO_DIR}/AGENTS.md" "${TARGET_DIR}/AGENTS.md"
  echo "  [file]  AGENTS.md -> ${TARGET_DIR}/AGENTS.md"
else
  echo "  [skip]  AGENTS.md already exists at ${TARGET_DIR}/AGENTS.md"
fi

echo ""
echo "Done. Skills and agents are in ${TARGET_DIR}/.agents/"
echo "Add .agents/ to your project's agent context path if your tool supports it."
