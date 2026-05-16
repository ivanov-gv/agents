# AGENTS.md

Project-level instructions for all AI coding agents (Claude Code, Codex, OpenCode).

## About this repository

This repository is a **cross-agent plugin** that provides shared skills and agents usable across multiple AI coding assistants. It is not a runnable application.

## Repository layout

```
.claude-plugin/plugin.json   — Claude Code plugin manifest
.codex-plugin/plugin.json    — Codex plugin manifest
skills/                      — Reusable skill definitions (SKILL.md per skill)
agents/                      — Shared agent definitions
install.sh                   — Manual install helper for OpenCode and raw setups
AGENTS.md                    — This file (project instructions for agents)
```

## Skills

| Skill | Description |
|-------|-------------|
| `go-conventions` | Go idioms, naming, error handling, project layout |
| `gh-contribute` | Branch strategy, commit format, PR workflow |
| `rust-learning` | Ownership, lifetimes, idiomatic Rust patterns |
| `docker-build` | Multi-stage builds, layer caching, CI integration |

## Agents

| Agent | Description |
|-------|-------------|
| `reviewer` | Code review: bugs, security, style — with structured output |

## Contribution rules

- All skill content lives in `skills/<name>/SKILL.md` — one file per skill, no subdirectories.
- Agent definitions live in `agents/<name>.md`.
- Both plugin manifests (`.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`) must be updated when adding or renaming a skill or agent.
- `install.sh` must also be updated to copy new skill/agent files.
- Follow the `gh-contribute` skill for branch naming and PR format.
- Keep skill files focused and actionable — avoid vague advice.

## What agents should do in this repo

- When asked to add a skill: create `skills/<name>/SKILL.md` and register it in both `plugin.json` files and `install.sh`.
- When asked to add an agent: create `agents/<name>.md` and register it in both `plugin.json` files and `install.sh`.
- When asked to review code: invoke the `reviewer` agent.
- Do not create build artifacts, binaries, or lock files — this repo has no build step.
