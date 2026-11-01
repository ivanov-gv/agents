# ivanov-gv/agents

Personal engineering guidelines packaged as one plugin for Claude Code and Codex, so the same skills and rules apply in every project.

## TL;DR

```bash
# Claude Code
/plugin marketplace add ivanov-gv/agents
/plugin install agents@ivanov-gv

# Codex
codex plugin marketplace add ivanov-gv/agents
codex plugin add agents@ivanov-gv
# then open /hooks in Codex once and trust the plugin hooks
```

Update after a release: `/plugin marketplace update ivanov-gv` in Claude Code, or `codex plugin marketplace upgrade` in Codex.

## How it works

The content is split three ways, following the knowledge / rules / procedures model:

- **Skills** (`skills/<name>/SKILL.md`) hold rules and procedures: short, prescriptive, with bad/good examples.
- **Docs** (`docs/`, [index](plugins/agents/docs/README.md)) hold knowledge: rationale, diagrams, long examples, and reference layouts. Skills link to them, and agents read a doc only when the task needs it.
- **Checks** belong in each project's linters and CI. Once a check enforces a rule, its prose can go.

Skills are chosen by the model and are often skipped, even with "MUST USE" in their descriptions. So the plugin delivers skills in two ways:

| Kind | Delivery | Skills |
| --- | --- | --- |
| **Mandatory guidelines.** These must hold whenever you touch matching files. | A hook injects the skill once per session when a touched path or the prompt matches [guidelines.json](plugins/agents/guidelines.json). They remain invocable as skills too. | `code-general`, `code-general-testing`, `code-golang-conventions`, `code-golang-testing`, `code-golang-lint`, `code-golang-docker`, `cicd-github`, `cicd-general`, `code-general-documentation` |
| **Procedures and reference.** Use these on demand. | Skill registry only | `code-general-optimisation`, `code-golang-optimisation`, `contribute-cli` |

Example: in a Go repository, reading or editing `internal/app/app.go` injects `code-general` and `code-golang-conventions` (about 10 KB). Opening `app_test.go` adds the two testing guidelines. A file in `.github/workflows/` adds `cicd-general` and `cicd-github` (about 6 KB). Other files under `.github/`, such as CODEOWNERS, load nothing. Injected skills carry absolute links to their docs, so the agent can open them from any project.

Hook details ([hooks/guidelines.mjs](plugins/agents/hooks/guidelines.mjs)):

- **Claude Code:** injects on `PreToolUse` for Read/Edit/Write/Bash. Claude reads a file before editing it, so the guideline arrives before the first edit.
- **Codex:** injects on `PostToolUse` (`apply_patch`, shell). Codex `PreToolUse` cannot add context, so the guideline arrives one tool call late. Prompt matching (`UserPromptSubmit`) usually delivers it earlier.
- **Both agents:**
  - Deduplicated per session and per subagent.
  - After compaction, `SessionStart` re-injects everything that was loaded before.
  - `requires` restricts a guideline to repositories with a given root file. For example, Go Docker rules apply only where `go.mod` exists.
  - Each injection is logged with the skill and a content hash. The log is at `$CLAUDE_PLUGIN_DATA/guidelines/injections.jsonl`, or `~/.local/state/ivanov-gv-agents/guidelines/` as a fallback.
- **Subagents:** `SubagentStart` also gives subagents the plugin's skill list, because they do not inherit the parent's skill registry.

Project instructions win over these personal defaults: the injected text says so. Project-specific constraints belong in the project's own AGENTS.md, linters, and CI, which collaborators and CI also see.

Requirements: `node` (18+) on PATH for hooks; `bash` and `jq` for the subagent hook.

## Without the plugin

For OpenCode or other agents without plugin support:

```bash
git clone https://github.com/ivanov-gv/agents.git
./agents/install.sh --target /path/to/project                 # .agents/skills/<name>/SKILL.md + .agents/docs/
./agents/install.sh --target /path/to/project --claude-rules  # plus .claude/rules with paths frontmatter
```

## Verify after installing or upgrading an agent

1. In a Go repository, ask the agent to read a `.go` file, then ask "which agents: guidelines were injected?". Expect `code-general` and `code-golang-conventions` only.
2. Check the injection log for the session.
3. Give a small representative task and check that the output follows the guideline. Being loaded does not prove it was followed.

## Repository layout

```
.claude-plugin/marketplace.json     Claude Code marketplace
.agents/plugins/marketplace.json    Codex marketplace
plugins/agents/
  .claude-plugin/plugin.json        Claude manifest (version bump = release)
  .codex-plugin/plugin.json         Codex manifest (same name/version/description)
  guidelines.json                   which skills are mandatory, and their path/prompt triggers
  skills/<name>/SKILL.md            rules and procedures
  docs/                             knowledge linked from skills (index: docs/README.md)
  hooks/                            hooks.json, guidelines.mjs, inject-subagent-skills.sh
scripts/check.mjs                   validation and hook tests
install.sh                          fallback installer
```

Contributing rules for agents and humans: [AGENTS.md](AGENTS.md).
