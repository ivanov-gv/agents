---
summary: How Claude Code and Codex load repository instructions, and how to split knowledge, rules and procedures so agents get the right context.
rules: ../../skills/code-general-documentation/SKILL.md
updated: 2026-11-05
---

# Agent instructions: background

## Content model

| Kind | Test | Where | Delivery | Freshness check |
| --- | --- | --- | --- | --- |
| Knowledge | "I know": architecture, domain, component docs | `docs/`, component READMEs | Routed from AGENTS.md: "if X, read doc Y" | Link check in CI, docs updated in the same change, periodic doc gardening |
| Mandatory language rules | Must hold for every edit in that language | `docs/engineering/<lang>.md` | By path for Claude (`.claude/rules` with `paths`); a summary line and link in the root AGENTS.md for Codex, so routed and not guaranteed; a compliance reviewer checks them at the end | Generated `.claude/rules` with a drift check; rules mapped to linters |
| Procedures | "I can": investigate a failure, cut a release | Skills (this plugin for personal ones) | On demand | Pinned versions; replay a few tasks after upgrades |
| Enforcement | Mechanically checkable | Linters, formatters, tests, CI | Deterministic | CI itself |

Routing ("if X, read Y") is followed by the model and is fine for knowledge. It is not enough for must-follow rules:
in Vercel's evals, skills went uninvoked in 56% of cases. Keep the few must-follow lines inline in the root AGENTS.md,
deliver language rules by path where the agent supports it, and turn what you can into checks.

## How the agents load instructions

| | Claude Code | Codex |
| --- | --- | --- |
| Root file | `AGENTS.md`, unless a `CLAUDE.md` or `CLAUDE.local.md` is in the working directory or above; then only those (import with `@AGENTS.md`) | `AGENTS.md` (`AGENTS.override.md` replaces it at the same level) |
| Started in a subdirectory | Loads the working directory and every directory above it, so the root file is included when `AGENTS.md` is what it reads | Includes the root file through the chain below; without a project root, checks only the current directory |
| Imports | `@path` in `CLAUDE.md` and `AGENTS.md` | None, so `@path` in a shared `AGENTS.md` is plain text for Codex |
| Personal file | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` |
| Scoping | `.claude/rules/*.md` with `paths` frontmatter, loaded when matching files are touched; a subdirectory's `AGENTS.md` when a file there is opened with Read | AGENTS.md chain from the project root to the **startup directory**, fixed for the session |
| Size limit | Context-bound | `project_doc_max_bytes`, 32 KiB default, shared across the whole chain |
| Custom agents | `.claude/agents/*.md` or a plugin's `agents/` | `.codex/agents/*.toml` or `~/.codex/agents/` (plugins cannot ship them) |

Consequences:

- Codex never loads a deeper AGENTS.md later. Start single-component sessions in the component directory
  (`codex --cd services/api`); at the root, the repo map tells the agent which guideline to read.
- A large root file silently truncates nested files for Codex. Keep the root around 60–100 lines.
- `CLAUDE.local.md` counts as a `CLAUDE.md`: an uncommitted personal file silently stops Claude reading the root
  `AGENTS.md` unless it imports it. Subagents started without project instructions do not get these files either.
- `codex debug prompt-input` prints the model-visible prompt input as JSON, so it shows the chain, including from a
  linked worktree. It confirms what is loaded, not what a model does with it.
- No agent hooks. They fire only for some tools (an agent editing through the shell bypasses them), Codex runs them
  only after per-machine trust, and they fail silently. Rules being loaded does not prove they were followed either.
  Instead, end each task with a fresh read-only compliance reviewer (the `compliance-review` skill), and enforce what
  is checkable with linters, git hooks and CI.

## Why rules are not copied into nested AGENTS.md

Generating each guideline into the AGENTS.md of each component that uses it puts its full text in front of Codex without
a link. These are the reasons against it:

- It only helps Codex started inside a component; Claude loads rules by path.
- One edit to one guideline changes each of those files, so reviews of AGENTS.md turn into noise.
- Hand-written notes end up buried under generated text: in one repository, about 350 of 430 lines across five files.

The cost of not copying: Codex has a guideline's full text only if the agent opens the link, and nothing confirms that it
did. That is why must-follow lines stay inline in the root, and why checks and the compliance review back them up.

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
