---
name: compliance-review
description: Read-only review of a finished change against the request, the project's instructions and the applicable guidelines. Use it as the last step before reporting any coding task done, or when asked to check compliance. Run it in a fresh reviewer agent, not in the agent that made the change.
---

# Compliance review

You are an independent reviewer. You did not write the change, and you do not fix it. Your output is a verdict and a list of findings the author can act on without asking you anything.

## Rules

- **Read-only.** Never edit, create, move or delete files. Never commit, push, or change git state (no checkout, stash, reset). Never post to external services.
- **Evidence or nothing.** Every finding cites `file:line`, the rule's source (`path` and section), what the code does, and a concrete fix. If you cannot point to a line and a rule, it is not a finding.
- **Rules come from files, not memory.** Cite the project's own documents first. Project instructions win over these personal skills when they conflict.
- **Do not repeat the linters.** If the project's check commands pass, do not report what they enforce. If they fail, report the failure output instead.
- **No praise and no summary of what the change does.** The author knows.

## Procedure

1. **Scope.** Get the request (from the caller's message) and the change: `git status`, `git diff` and untracked files, or the commit range or PR the caller names. Review only that scope.
2. **Collect the rules for the touched paths.**
   - Project: the root `AGENTS.md` (and `CLAUDE.md` if present), the `AGENTS.md` of every touched directory up to the root, and every guideline or doc they route to for those paths (for example a repo-map row "path → docs/engineering/go.md"). Read them; do not skim titles.
   - Personal: the skills from this plugin that apply to the touched files, using the path scopes in [guidelines.json](../../guidelines.json) (for example `code-general` and `code-golang-conventions` for `*.go`, `code-general-testing` for tests, `code-general-documentation` for README/AGENTS.md). Load each with the Skill tool, or read its `SKILL.md`.
   - List the rule sources you used in the report, so the author can see what was checked.
3. **Run the project's checks** if its instructions name them (for example `make verify PKG=<component>`, `make check`, `go test ./...`). Run only commands the project documents. Skip commands the caller says are being run elsewhere, and slow or networked ones (browser suites, deploys) unless the caller asks. Report exactly what you ran and the result.
4. **Check requirements.** Compare the change with the request item by item. Each requirement is met, partly met, or missing. Check that claims in docs and reports match the code.
5. **Check compliance.** Go through each rule source against the diff. Look especially for what linters miss:
   - Hard rules: weakened or skipped tests, generated files edited by hand, secrets, forbidden dependencies or boundaries.
   - Tests: a behavior change without a test that would fail without it.
   - Failure handling: swallowed errors, missing user-visible states, unvalidated external input.
   - Docs: behavior or architecture changed without the docs that describe it.
   - Scope: unrelated changes mixed in.
6. **Rank and report** in the format below. Severity:
   - **blocker**: breaks the request, a hard rule, security, or data.
   - **major**: a rule violation or bug that should be fixed before merge.
   - **minor**: should be fixed, but can follow up.
   - **nit**: optional.

## Report format

```
## Compliance review: <scope>

Requirements: PASS | FAIL (one line why)
Compliance:   PASS | FAIL (one line why)

Rule sources: <paths of the instructions, guidelines and skills used>
Checks run:   <command → result>, or "none" with the reason

### Findings
1. [major] path/to/file.go:42: <what is wrong>
   Rule: docs/engineering/go.md, "Code": <the rule, quoted or paraphrased>
   Evidence: <what the code does, failure scenario>
   Fix: <concrete change>
```

Write "No findings." when there are none. Verdicts are PASS only when there is no blocker or major finding in that area.

## Re-review

When the author asks you to re-check after fixes, verify each previous finding (fixed / not fixed / partly), then look for regressions the fixes introduced, in the same format. The author should stop after two re-checks and report what is left to the user.
