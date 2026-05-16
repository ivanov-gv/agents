# AGENTS.md

Project-level instructions for AI coding agents working in this repository.

## What this repo is

A **Claude Code marketplace** that hosts a single cross-agent plugin (`agents`) containing reusable skills and agent definitions. The skills/agents content is also consumable by Codex and OpenCode via the `install.sh` fallback.

## Repository layout

```
.claude-plugin/
  marketplace.json          — Marketplace catalog (lists plugins this repo offers)
plugins/
  agents/                   — The plugin
    .claude-plugin/
      plugin.json           — Plugin manifest (name, version, description, author)
    .codex-plugin/
      plugin.json           — Codex-compatible manifest
    skills/
      go-conventions/SKILL.md
      gh-contribute/SKILL.md
      rust-learning/SKILL.md
      docker-build/SKILL.md
    agents/
      reviewer.md
install.sh                  — Idempotent installer for OpenCode / raw setups
AGENTS.md                   — This file
```

## Installation

### Claude Code

```bash
# Add this repo as a marketplace, then install the plugin
/plugin marketplace add ivanov-gv/agents
/plugin install agents@ivanov-gv
```

### Codex

Codex reads `plugins/agents/.codex-plugin/plugin.json`. Vendor or symlink `plugins/agents/` into the Codex plugin search path.

### OpenCode / raw setups

```bash
git clone https://github.com/ivanov-gv/agents.git
./agents/install.sh --target /path/to/your/project
```

This copies skills into `.agents/skills/` and agents into `.agents/agents/` in the target project.

## Skills

| Skill | Description |
|-------|-------------|
| `go-conventions` | Go idioms, naming, error handling, project layout |
| `gh-contribute` | Branch strategy, conventional commits, PR workflow |
| `rust-learning` | Ownership, lifetimes, idiomatic Rust patterns |
| `docker-build` | Multi-stage builds, layer caching, CI integration |

## Agents

| Agent | Description |
|-------|-------------|
| `reviewer` | Structured code review with BLOCK/WARN/NIT severity output |

## Contribution rules

- Add a new skill: create `plugins/agents/skills/<name>/SKILL.md`. No manifest edit needed — Claude Code auto-discovers `skills/`.
- Add a new agent: create `plugins/agents/agents/<name>.md`. Same — auto-discovered.
- Update `install.sh` to copy new skill/agent files for OpenCode users.
- Bump `version` in `plugins/agents/.claude-plugin/plugin.json` for releases.
- Follow the `gh-contribute` skill for branch naming and PR format.
- Do not create build artifacts, lock files, or binaries — this repo has no build step.
