# Docs

Background knowledge behind the skills: rationale, diagrams, long examples, and reference layouts. Skills hold the rules
and link here; agents read a doc only when the task needs it. One concept per file. Each file's frontmatter names the
skill whose rules it explains.

| Doc | What it explains | Rules in |
| --- | --- | --- |
| [cicd/ci-vs-cd.md](cicd/ci-vs-cd.md) | CI vs CD zones, image flow, the GHCR + Google Cloud setup | `cicd-general`, `cicd-github` |
| [cicd/test-run-model.md](cicd/test-run-model.md) | Running identical steps in production and test-run mode | `cicd-general` |
| [cicd/env-blocks.md](cicd/env-blocks.md) | Why steps read only job-scoped env vars | `cicd-general`, `cicd-github` |
| [cicd/github-test-run-outputs.md](cicd/github-test-run-outputs.md) | Outputs in GitHub test-run pairs: the duplicated env block fix | `cicd-github` |
| [cicd/github-local-testing.md](cicd/github-local-testing.md) | Makefile targets that run workflows with `act`; actionlint | `cicd-github` |
| [cicd/github-example-workflow.md](cicd/github-example-workflow.md) | A complete CI workflow following the rules | `cicd-github` |
| [cicd/github-monorepo.md](cicd/github-monorepo.md) | One workflow per folder, diff-based selection, one required check | `cicd-github` |
| [golang/project-layout.md](golang/project-layout.md) | Go directories, file names, layers and request flow | `code-golang-conventions` |
| [golang/service-runtime.md](golang/service-runtime.md) | Dockerfile stages, env configuration, `ENVIRONMENT` | `code-golang-docker` |
| [agents/agent-instructions.md](agents/agent-instructions.md) | How Claude Code and Codex load instructions; knowledge vs rules vs procedures | `code-general-documentation` |
