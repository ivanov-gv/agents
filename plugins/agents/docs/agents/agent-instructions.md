---
summary: How Claude Code and Codex load repository instructions, and how to split knowledge, rules and procedures so agents get the right context.
rules: ../../skills/code-general-documentation/SKILL.md
updated: 2026-11-01
---

# Agent instructions: background

## Content model

| Kind | Test | Where | Delivery | Freshness check |
| --- | --- | --- | --- | --- |
| Knowledge | "I know": architecture, domain, component docs | `docs/`, component READMEs | Routed from AGENTS.md: "if X, read doc Y" | Link check in CI, docs updated in the same change, periodic doc gardening |
| Mandatory language rules | Must hold for every edit in that language | `docs/engineering/<lang>.md` | Deterministic by path: Claude `.claude/rules` with `paths`, nested AGENTS.md or hooks for Codex | Generated adapters with a drift check; rules mapped to linters |
| Procedures | "I can": investigate a failure, cut a release | Skills (this plugin for personal ones) | On demand | Pinned versions; replay a few tasks after upgrades |
| Enforcement | Mechanically checkable | Linters, formatters, tests, CI | Deterministic | CI itself |

Routing ("if X, read Y") is followed by the model and is fine for knowledge. It is not enough for must-follow rules:
in Vercel's evals, skills went uninvoked in 56% of cases. Keep the few must-follow lines inline in AGENTS.md and deliver
language rules by path.

## How the agents load instructions

| | Claude Code | Codex |
| --- | --- | --- |
| Root file | Reads `AGENTS.md`; `CLAUDE.md` only if present (make it `@AGENTS.md`) | `AGENTS.md` (`AGENTS.override.md` replaces it at the same level) |
| Personal file | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` |
| Scoping | `.claude/rules/*.md` with `paths` frontmatter, loaded when matching files are touched | AGENTS.md chain from the project root to the **startup directory**, fixed for the session |
| Size limit | Context-bound | `project_doc_max_bytes`, 32 KiB default, shared across the whole chain |
| Hooks | `.claude/settings.json` | `.codex/hooks.json`; repository hooks must be trusted once via `/hooks` |

Consequences:

- Codex never loads a deeper AGENTS.md later. Start single-component sessions in the component directory
  (`codex --cd services/api`) or inject rules with hooks.
- A large root file silently truncates nested files for Codex. Keep the root around 60–100 lines.
- Hooks can fail to fire (untrusted, some worktree setups), so git hooks and CI stay the backstop.

## Evidence

- Generated (LLM-written) AGENTS.md files reduced success in an ETH Zurich evaluation; human-written ones helped about 4%
  at roughly 20% higher cost. Keep instructions minimal and treat each change as a hypothesis to test.
- OpenAI replaced an oversized AGENTS.md with a short map pointing into repository docs and enforced boundaries
  mechanically.
- Spotify saw early agents comment out failing tests to get green builds, so "never weaken a test" belongs in the hard
  rules.

## Ratchet

When an agent makes a mistake, add, in order of preference: a linter or test; a tool or script; a one-line rule with its
reason. Delete prose rules once a check enforces them.
