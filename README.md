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
git clone https://github.com/ivanov-gv/agents.git && ./agents/install.sh --codex-agents   # the reviewer agent
```

Update after a release: `/plugin marketplace update ivanov-gv` in Claude Code, or `codex plugin marketplace upgrade` in Codex (and re-run `install.sh --codex-agents` if the reviewer changed).

## How it works

The content is split three ways, following the knowledge / rules / procedures model:

- **Skills** (`skills/<name>/SKILL.md`) hold rules and procedures: short, prescriptive, with bad/good examples.
- **Docs** (`docs/`, [index](plugins/agents/docs/README.md)) hold knowledge: rationale, diagrams, long examples, and reference layouts. Skills link to them, and agents read a doc only when the task needs it.
- **Checks** belong in each project's linters, Make targets, git hooks and CI. Once a check enforces a rule, its prose can go.

| Kind | How it is used | Skills |
| --- | --- | --- |
| **Must-follow guidelines.** These should hold whenever you touch matching files. | The model loads them by description. Their path scopes in [guidelines.json](plugins/agents/guidelines.json) tell the compliance reviewer which apply to a change, and `install.sh --claude-rules` can turn them into a project's `.claude/rules`. | `code-general`, `code-general-testing`, `code-golang-conventions`, `code-golang-testing`, `code-golang-lint`, `code-golang-docker`, `cicd-github`, `cicd-general`, `code-general-documentation` |
| **Procedures and reference.** Use these on demand. | Skill registry only | `code-general-optimisation`, `code-golang-optimisation`, `contribute-cli`, `compliance-review` |

### No hooks

Earlier versions injected the must-follow skills with hooks. That was dropped: hooks fired only for some tools (an agent editing files through the shell bypassed them), Codex ran them only after you trusted them on each machine, and a loaded rule still does not prove it was followed.

### Compliance review

Skills are chosen by the model and are sometimes skipped. So every task should end with a fresh reviewer, read-only by instruction (it can still run check commands), that checks the change against the request, the project's AGENTS.md and guidelines, and the applicable skills here, and reports file:line findings with two verdicts (requirements, compliance). The author fixes the findings and asks for at most two re-checks.

- Claude Code: the `agents:compliance-reviewer` plugin agent ([agents/compliance-reviewer.md](plugins/agents/agents/compliance-reviewer.md)).
- Codex: the `compliance_reviewer` agent ([codex/agents/compliance-reviewer.toml](plugins/agents/codex/agents/compliance-reviewer.toml)). Codex plugins cannot ship agents, so install it once per machine with `install.sh --codex-agents` (into `~/.codex/agents`). Do not also copy it into projects: two files with the same `name` make it unclear which one Codex uses. Ask for it by name: "have compliance_reviewer check the change".
- Both follow the [compliance-review](plugins/agents/skills/compliance-review/SKILL.md) skill, so the procedure is defined once.

Add one line to each project's AGENTS.md workflow so agents run it, for example: "Before reporting done, run the compliance review (Claude `agents:compliance-reviewer`, Codex `compliance_reviewer`)."

Project instructions win over these personal defaults. Project-specific constraints belong in the project's own AGENTS.md, linters, and CI, which collaborators and CI also see.

## Without the plugin

For OpenCode or other agents without plugin support:

```bash
git clone https://github.com/ivanov-gv/agents.git
./agents/install.sh --target /path/to/project                 # .agents/skills/<name>/SKILL.md + .agents/docs/
./agents/install.sh --target /path/to/project --claude-rules  # plus .claude/rules with paths frontmatter
./agents/install.sh --codex-agents                            # only the Codex reviewer, into ~/.codex/agents
```

## Verify after installing or upgrading an agent

1. Make a small change in a Go repository and ask for the compliance review. Expect its report to list `code-general` and `code-golang-conventions` among the rule sources.
2. Give a small representative task and check that the output follows the guideline. Being loaded does not prove it was followed.

## Repository layout

```
.claude-plugin/marketplace.json     Claude Code marketplace
.agents/plugins/marketplace.json    Codex marketplace
plugins/agents/
  .claude-plugin/plugin.json        Claude manifest (version bump = release)
  .codex-plugin/plugin.json         Codex manifest (same name/version/description)
  guidelines.json                   path scopes of the must-follow skills
  skills/<name>/SKILL.md            rules and procedures
  docs/                             knowledge linked from skills (index: docs/README.md)
  agents/compliance-reviewer.md     Claude reviewer agent
  codex/agents/*.toml               Codex reviewer agent (installed by install.sh --codex-agents)
scripts/check.mjs                   validation
install.sh                          fallback installer
```

Contributing rules for agents and humans: [AGENTS.md](AGENTS.md).
