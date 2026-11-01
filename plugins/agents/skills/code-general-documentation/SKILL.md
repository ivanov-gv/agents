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
  project language rules live in `docs/engineering/<lang>.md` and are delivered by path (Claude `.claude/rules` with
  `paths`, nested AGENTS.md or hooks for Codex).
- Add a nested AGENTS.md only where a directory needs different rules. Codex loads the chain from the root to its
  startup directory once, within a shared 32 KiB budget, so keep every file in the chain small.
- Prefer enforcement over prose: if a rule can be a linter, test, or CI check, make it one and delete the sentence.
- Write instructions by hand. Do not generate AGENTS.md wholesale with an LLM.
- Be concise — every line consumes context window. Prefer terse rules to verbose explanations.
- Be prescriptive — write rules the agent can follow mechanically ("use X", "never do Y"), not vague advice
  ("consider using X").
- Include code examples for patterns that are hard to describe in words.
- Do not repeat information that is obvious from the code itself (e.g. listing every file).
- Keep one source for each rule; generate agent-specific copies and check them for drift instead of copying by hand.
- Never commit `AGENTS.override.md` or personal settings (`CLAUDE.local.md`, `.claude/settings.local.json`).

## docs/ (knowledge)

- One concept per file, linked with ordinary relative Markdown links; keep a docs index.
- Keep each fact in one place and link to it instead of duplicating it.
- Update docs in the same change as the behavior they describe. Outdated instructions are worse than no instructions.
- An instruction to update docs is not a check: add a link check to CI so routes and links keep resolving.
