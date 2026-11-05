---
name: code-general-documentation
description: How to write README.md, AGENTS.md/CLAUDE.md and docs/ for a project. Read before creating or editing project documentation or agent instructions.
---

# Documentation

## README.md (for humans)

README is the entry point for anyone reading the project. Structure:

1. **Title and one-liner** — Project name and a single sentence describing what it does.
2. **TL;DR / Table of contents** — For long READMEs, start with either a TL;DR summary or a clickable table of contents
   so readers can jump to relevant sections.
3. **Requirements / Goals** — What the project must do. Functional and non-functional requirements.
4. **Solution details** — How the project works: interface, backend, algorithms, deployment. Explain the "why" behind
   non-obvious design decisions.
5. **Ways to improve** — Known limitations and future directions.

Guidelines:

- Write for humans who have never seen the project before.
- Include diagrams, examples, and links to external resources where helpful.
- Keep sections self-contained — a reader should be able to understand a section without reading the entire document.
- Do not duplicate code or configuration that can be found in the source. Reference file paths instead.

## AGENTS.md (for AI agents)

AGENTS.md is the canonical entry point for coding agents: Codex reads it natively and Claude Code reads it as project
instructions. If a `CLAUDE.md` is needed, it contains only `@AGENTS.md` plus Claude-only notes. Background on loading
and evidence: [agent instructions](../../docs/agents/agent-instructions.md).

The root AGENTS.md is a short map, about 60–100 lines:

1. **Repo map** — Top-level directories, what each owns, and which rules apply there.
2. **Commands** — The exact setup, verify, test, and build commands. Agents must not invent others.
3. **Hard rules** — The few must-follow constraints, each with its reason (e.g. never edit generated files; never skip
   or weaken a failing test).
4. **Routing** — "When changing X, read docs/X.md first." Point to knowledge; do not paste it.

Rules:

- Do not put general, cross-project conventions in project instructions. Personal conventions come from this plugin;
  project language rules live in `docs/engineering/<lang>.md`. Claude gets them through `.claude/rules` with `paths`;
  Codex through links from the root AGENTS.md. Do not add agent hooks; check compliance with a reviewer agent and
  enforce with linters, git hooks and CI.
- Never copy a rule into nested AGENTS.md files. A session started in a subdirectory still loads the root file, so a
  rule for the whole repository goes there as one summary line and a link. State it once. A nested AGENTS.md holds only
  what is different about that directory; add one only when something is. No import or "see the root" line is needed.
- A link is not delivery: Codex sees the text only if the agent opens it. Inline what must always hold in the hard
  rules, within the size limit, or make it a check.
- Prefer enforcement over prose: if a rule can be a linter, test, or CI check, make it one and delete the sentence.
- Write instructions by hand. Do not generate AGENTS.md wholesale with an LLM.
- Be concise — every line consumes context window. Prefer terse rules to verbose explanations.
- Be prescriptive — write rules the agent can follow mechanically ("use X", "never do Y"), not vague advice
  ("consider using X").
- Include code examples for patterns that are hard to describe in words.
- Do not repeat information that is obvious from the code itself (e.g. listing every file). Inner directory layouts and
  vocabulary belong in the README or the code; a suppression policy belongs in the linter's config.
- Add a line only if an agent would get something wrong without it and no check catches it. If one rule change touches
  several AGENTS.md files, the rule is in the wrong place.
- Keep one source for each rule. Generate a copy only when a tool requires its own format (`paths` frontmatter), check
  it for drift, and never generate into AGENTS.md. Do not write metadata nothing reads, such as content hashes.
- A new rule replaces what it contradicts: search the existing guidelines and fix the older wording in the same change.
- Say exactly what enforces a rule: name the check and what it misses. A rule only a reviewer reads is reviewed, not
  enforced.
- Verify loading instead of assuming it: run `codex debug prompt-input` from a subdirectory; Claude Code reports
  `AGENTS.md loaded: …` at session start.
- Never commit `AGENTS.override.md` or personal settings (`CLAUDE.local.md`, `.claude/settings.local.json`).

## docs/ (knowledge)

- One concept per file, linked with ordinary relative Markdown links; keep a docs index.
- Keep each fact in one place and link to it instead of duplicating it.
- Update docs in the same change as the behavior they describe. Outdated instructions are worse than no instructions.
- An instruction to update docs is not a check: add a link check to CI so routes and links keep resolving.
