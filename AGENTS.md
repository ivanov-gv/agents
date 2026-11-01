# Working on ivanov-gv/agents

One plugin (`plugins/agents`) published through two marketplaces: Claude Code (`.claude-plugin/marketplace.json`) and Codex (`.agents/plugins/marketplace.json`). Read [README.md](README.md) for how delivery works. Content here is loaded into other projects' agent context, so every byte has a cost.

## Commands

- `node scripts/check.mjs`: frontmatter, manifests, path scopes, no hooks, reviewer agents, skill and doc links, docs index, docs coverage, shell syntax. Run before every commit.
- `claude plugin validate .`: Claude marketplace and plugin schema.
- `./install.sh --target <dir> [--claude-rules]`: fallback installer; try it in a scratch directory. `./install.sh --codex-agents` installs the Codex reviewer into `~/.codex/agents`.

## Hard rules

- Skill frontmatter has exactly `name` (equal to the directory) and a one-line `description`. Quote the description if it contains `: `. Agents pick skills by description, so say when to use the skill.
- Keep skill paths stable. Other repositories link to `plugins/agents/skills/<name>/SKILL.md`.
- Skills hold rules and procedures; knowledge goes in `plugins/agents/docs/`: rationale, diagrams, long examples, reference layouts, and setup-specific facts. A skill links to its docs with `../../docs/<file>`. One concept per doc; frontmatter has `summary`, `rules` (the skill it explains) and `updated`; list every doc in `docs/README.md`. Keep each fact in one place: platform skills add specifics and never restate general rules (for example, `cicd-github` builds on `cicd-general`).
- No hooks. They fired only for some tools (shell edits bypassed them) and Codex needed per-machine trust. Rules reach agents through skill descriptions and project instructions; compliance is checked by the `compliance-review` skill run in a fresh reviewer agent at the end of a task; enforcement belongs in each project's Make targets, git hooks and CI.
- Must-follow skills get path globs in `guidelines.json`. The reviewer uses them to pick the skills that apply to a change, and `install.sh --claude-rules` turns them into `.claude/rules`. Such a skill is loaded whole: keep it under the limit in guidelines.json (10 KiB) and move explanations and long examples to docs.
- The reviewer exists twice as thin wrappers of the skill: `plugins/agents/agents/compliance-reviewer.md` (Claude plugin agent, no editing tools) and `plugins/agents/codex/agents/compliance-reviewer.toml` (Codex plugins cannot ship agents; installed with `install.sh --codex-agents`). Change the procedure only in the skill.
- Keep `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` in sync (name, version, description). Bump the version for every release; both agents cache plugins by version.
- No build artifacts, lock files, or binaries.

## Skills

Must-follow, path-scoped in guidelines.json: `code-general`, `code-general-testing`, `code-golang-conventions`, `code-golang-testing`, `code-golang-lint`, `code-golang-docker`, `cicd-github`, `cicd-general`, `code-general-documentation`.

On demand: `code-general-optimisation`, `code-golang-optimisation`, `contribute-cli`, `compliance-review` (through the reviewer agents).

## Adding or changing a skill

1. Create or edit `plugins/agents/skills/<name>/SKILL.md`. Put background and long examples in a doc under `plugins/agents/docs/` and link it. Claude and Codex both discover skills from the directory, so there is no manifest list to update.
2. If it must always apply to certain files, add an entry with path globs to `guidelines.json`, and say in the description which files it covers so agents load it.
3. Add it to the skill lists in this file and README.md (check.mjs enforces this), bump the version in both plugin manifests, then run `node scripts/check.mjs`.
4. After a recurring agent mistake, prefer in order: a linter or test in the project; a sharper rule with a bad/good example here; a new skill.
5. Follow the `contribute-cli` skill for branch naming and PR format.

## Release workflow

**Every PR that changes plugin content MUST bump the version.** Without a version bump, installed plugins will not receive the update — both agents cache plugins by version, and Claude Code only refreshes when `version` in the manifest changes. Skills, docs and agents are auto-discovered, but they still need a bump to ship.

Files to bump together (keep them in sync; `scripts/check.mjs` fails otherwise):

- `plugins/agents/.claude-plugin/plugin.json` — `version` field
- `plugins/agents/.codex-plugin/plugin.json` — `version` field

Use semver:

- **patch** (`1.1.0 → 1.1.1`) — typo fix, description tweak, doc-only change inside a skill or in docs/
- **minor** (`1.1.0 → 1.2.0`) — new skill, new doc, new capability added to an existing skill, new path trigger
- **major** (`1.1.0 → 2.0.0`) — skill removed/renamed, breaking change in how a skill is invoked or what it expects

### How updates reach users

Claude Code refreshes installed plugins **only at startup**, and only when it sees a new `version` in `plugin.json`. Mid-session `/reload-plugins` re-reads local files but does not fetch from GitHub.

If a user wants the update without restarting:

```
/plugin marketplace update ivanov-gv      # fetch latest from GitHub
/reload-plugins                            # apply
```

If the cache looks stuck (e.g. `~/.claude/plugins/cache/ivanov-gv/agents/<old-version>/` is still being loaded after the steps above), clear it: `rm -rf ~/.claude/plugins/cache` and restart Claude Code.

Codex: `codex plugin marketplace upgrade`, then start a new session.

### Release checklist

- [ ] Bump `version` in **both** `plugin.json` files (Claude + Codex manifests)
- [ ] `node scripts/check.mjs` passes
- [ ] If a skill was removed or renamed, note it in the PR description (users may need to clear cache)
- [ ] Merge to `main` — users on auto-update will see the new version next time they start Claude Code
