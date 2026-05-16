---
title: Documentation
description: How to write README.md and CLAUDE.md/AGENTS.md for a project.
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

## CLAUDE.md (for AI agents)

CLAUDE.md is the entry point for AI coding agents. It is loaded into the system prompt automatically. Structure:

1. **General conventions** — Project-agnostic rules that apply across all projects (structure, naming, error handling,
   testing, etc.). Put these first so they can be reused across repositories.
2. **Project-specific section** — Build commands, architecture details, and anything unique to this repository.

Guidelines:

- Be concise — every line consumes context window. Prefer terse rules to verbose explanations.
- Be prescriptive — write rules the agent can follow mechanically ("use X", "never do Y"), not vague advice
  ("consider using X").
- Include code examples for patterns that are hard to describe in words.
- Do not repeat information that is obvious from the code itself (e.g. listing every file).
- Keep under 200 meaningful lines if possible — long files get truncated.
- Update when conventions change. Outdated instructions are worse than no instructions.