---
name: cicd-github
description: GitHub Actions specifics for workflows in .github/workflows and composite actions in .github/actions. MUST USE together with cicd-general before writing, editing or reviewing GitHub Actions.
---

# GitHub Actions rules

These add GitHub specifics to `cicd-general`, which also applies. Examples and background:
[example workflow](../../docs/cicd/github-example-workflow.md),
[outputs in test-run pairs](../../docs/cicd/github-test-run-outputs.md), [env blocks](../../docs/cicd/env-blocks.md),
[local testing](../../docs/cicd/github-local-testing.md), [CI vs CD with GHCR](../../docs/cicd/ci-vs-cd.md#example-github--ghcr--google-cloud),
[monorepo pipelines](../../docs/cicd/github-monorepo.md).

## Every workflow

1. The 3 ways to run are:
    1. Locally with `nektos/act`, in test-run mode
    2. On GitHub Actions using `workflow_dispatch` with `inputs.test_run`
    3. Default production run
2. Each job's `env:` maps `secrets.*` and `vars.*` into named env vars.
3. `steps:` use only variables from the closest `env:` block or the `github.*` context.
4. Steps read those variables only via `${{ env.* }}` in `with:` and `run:`, never `secrets.*` or `vars.*` directly.
5. Do not reference workflow-level `env:` from a job's `env:` block (`${{ env.GLOBAL_ENV_VAR }}`); the substitution does
   not work in `act`.

## Test-run pairs

- A `switch` job outputs `test_run` (e.g. via the `./.github/actions/test_run` composite action). Each production job
  has a `-test-run` twin selected with `if: needs.switch.outputs.test_run != 'true'` / `== 'true'`.
- Share the pair's `env:` and `steps:` with YAML anchors (`&deploy-env`/`*deploy-env`, `&deploy-steps`/`*deploy-steps`).
- The test-run twin uses `environment: test-run` and reduced `permissions:` (e.g. `packages: read` on GHCR).
- An anchored `env:` cannot read `needs.<job>.outputs` from the right twin: the test-run job would read the
  production job's output. Duplicate the `env:` block instead: pair each downstream job with its matching upstream
  sibling directly, copy the `env:` section, and keep the steps anchor. Details:
  [outputs in test-run pairs](../../docs/cicd/github-test-run-outputs.md).

- When a platform step cannot be pointed at a test target, such as `actions/deploy-pages`, ask the owner. A dummy twin
  that logs what production would do is an allowed exception once the owner approves it. Record it in a workflow comment
  with when to revisit it. Details: [test-run model](../../docs/cicd/test-run-model.md#when-a-step-has-no-test-destination).

## Monorepos and required checks

1. Use one top-level workflow calling one `ci-<folder>.yml` per folder. Workflows cannot live in subfolders. Called
   workflows take `test_run` as an input and hold the twins.
2. Require one gate job in the top-level workflow, with `if: always()`, depending on every job. It fails on `failure` and
   `cancelled`, and has no twin: a skipped gate counts as passed. Do not use `paths` filters on a required workflow.
3. Select work with a tested planner script that selects everything for anything it cannot classify, and run everything
   before deploying.
4. Do not share a concurrency group between runs on the default branch: GitHub drops older pending runs in a group.
5. A change to `.github/**` must pass a test run locally and on GitHub. Enforce the GitHub run with a PR-only check.

Details and examples: [monorepo pipelines](../../docs/cicd/github-monorepo.md).

## Actions

1. Use composite actions (`.github/actions/`) to abstract away similar steps across workflows. Do not copy-paste steps,
   use actions instead.
2. Must use `$GITHUB_STEP_SUMMARY` to simplify debugging and improve visibility into what happened during the step.
3. Must duplicate the step summary to stdout for easier debugging with `act`. Step summary is unavailable in local runs
   with `nektos/act`.
4. Must use workflow commands (`::error...`, `::warning...`, `::debug...`, `::group...`, etc.) to simplify understanding
   of what happened during the step.
5. A step that pipes a command needs an explicit `shell: bash`. The default has no `pipefail`, so a failed API call piped
   into `jq` looks like an empty, normal result.

## Local runs and linting

1. Every workflow must have a make target in the root `Makefile` that runs it with `$(ACT) <event> -W
   .github/workflows/<file>.yml`, local secret and var files, and an event payload where needed. Targets must also work
   in dry-run mode (`ACT="act -n"`).
2. When you add or rename a workflow, add or rename its target and list it as a prerequisite of the test-all-workflows
   target. Nothing else catches a missing target: `act` only lints the workflows it is pointed at.
3. Lint all workflows with `rhysd/actionlint` in the PR checks workflow (`ci-pr-checks`).

Examples: [local testing and linting](../../docs/cicd/github-local-testing.md).

## Registries

- GHCR is the dev registry. `ghcr.io/${{ github.repository }}:${{ github.tag }}` is a production-grade image ready to be
  deployed.
- CD pulls only images under the `ghcr.io/${{ github.repository }}` prefix, with the triggering release tag or commit
  SHA.
- CD workflows are triggered by `release` or `workflow_dispatch` events.
- Without images, a CI run's artifact takes the dev registry's place. Details:
  [CI vs CD](../../docs/cicd/ci-vs-cd.md#without-docker-images).
