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
- Follow the `contribute-cli` skill for branch naming and PR format.
- Do not create build artifacts, lock files, or binaries — this repo has no build step.

## Release workflow

**Every PR that changes plugin content MUST bump the version.** Without a version bump, installed plugins will not receive the update — Claude Code only refreshes when `version` in the manifest changes.

Files to bump together (keep them in sync):

- `plugins/agents/.claude-plugin/plugin.json` — `version` field
- `plugins/agents/.codex-plugin/plugin.json` — `version` field

Use semver:

- **patch** (`1.1.0 → 1.1.1`) — typo fix, description tweak, doc-only change inside a skill
- **minor** (`1.1.0 → 1.2.0`) — new skill, new agent, new capability added to an existing skill
- **major** (`1.1.0 → 2.0.0`) — skill removed/renamed, breaking change in how a skill is invoked or what it expects

### How updates reach users

Claude Code refreshes installed plugins **only at startup**, and only when it sees a new `version` in `plugin.json`. Mid-session `/reload-plugins` re-reads local files but does not fetch from GitHub.

If a user wants the update without restarting:

```
/plugin marketplace update ivanov-gv      # fetch latest from GitHub
/reload-plugins                            # apply
```

If the cache looks stuck (e.g. `~/.claude/plugins/cache/ivanov-gv/agents/<old-version>/` is still being loaded after the steps above), clear it: `rm -rf ~/.claude/plugins/cache` and restart Claude Code.

### Release checklist

- [ ] Bump `version` in **both** `plugin.json` files (Claude + Codex manifests)
- [ ] If a skill was removed or renamed, note it in the PR description (users may need to clear cache)
- [ ] Merge to `main` — users on auto-update will see the new version next time they start Claude Code
