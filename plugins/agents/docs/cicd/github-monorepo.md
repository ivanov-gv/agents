---
summary: One top-level workflow calling one workflow per folder, with diff-based selection and one required check.
rules: ../../skills/cicd-github/SKILL.md
updated: 2026-11-04
---

# Monorepo pipelines on GitHub Actions

Treat each top-level folder as a project with its own workflow, called from one top-level workflow. Taken from
`ivanov-gv/cg-map`. Background: [test-run model](test-run-model.md).

```text
CI: read-only permissions
ci-all.yml                PR, push to main, nightly, manual (test_run, run_all)
├── switch                production or test-run
├── plan | plan-test-run  diff → folders to run
├── ci-docs.yml           each folder workflow stays thin: it calls the folder's own make target
├── ci-apps-web.yml       verify | verify-test-run, then browser | browser-test-run (matrix)
├── ...
└── CI gate               always reports; the only required check

CD: deployment permissions, no source
cd-pages.yml              after ci-all on main, manual (run_id, test_run)
```

## Layout constraints

- GitHub loads workflows only from the top of `.github/workflows/`, so a folder's workflow cannot live in that folder.
  Name it `ci-<folder>.yml` and keep the logic in the folder's Makefile.
- Jobs inside a called workflow report as `caller / called`. A required check must be a plain job in the top-level
  workflow, so that its name stays stable.
- A workflow can be dispatched only once it exists on the default branch. Add new workflows beside the old ones, test
  them, then remove the old ones in a separate PR, so there is never a gap or a double deployment.

## Test-run pairs in called workflows

- The top-level workflow has the `switch` job and passes `test_run` as a boolean input. Called workflows hold the twins
  and select them with `inputs.test_run`, which also works when they are dispatched alone, so they need no switch job.
- The jobs in the top-level workflow that only call a folder workflow have no twins.

## The required check

GitHub has no "all checks must pass" setting. A required check that never runs because of a `paths` filter stays pending
forever, while a job skipped by `if:` counts as passed. So one workflow always runs, and ends in a gate job:

```yaml
gate:
  name: CI gate
  if: always()
  needs: [switch, plan, plan-test-run, ci-docs, ci-apps-web] # every job, both plan twins included
  runs-on: ubuntu-latest
  permissions: {}
  env:
    RESULTS: ${{ toJSON(needs) }}
```

- It fails on any `failure` or `cancelled` result, and when neither plan twin succeeded. `skipped` passes.
- It has no test-run twin. In a test run, a skipped production gate could report a pass for that commit under the required
  name.
- Folder jobs need `if: ${{ !cancelled() && ... }}`, because they depend on both plan twins and one is always skipped.

## Selecting what runs

- Put the planner in a script with unit tests, not a third-party action or `paths` filters.
- Folders are not independent: record which folders each path also affects, for example shared contracts.
- Fail safe. An unmatched path, an empty diff, or a failed diff selects everything.
- Diff with `--no-renames`, so both sides of a rename count. A checkout with `fetch-depth: 0` and `filter: blob:none` keeps
  the full history cheap, even with large files.
- Add drift tests: every component needs a rule, and folder checks together must cover the full local check.
- Over-select cheap checks. Narrow only what is slow, such as browser tests, and only by area, never by test. Replay the
  commit history through the planner first: it shows how much a rule would really save.
- Run a selected folder's full suite before deploying, and everything nightly, so a wrong mapping cannot reach users.
- Run assertions about docs in the docs job. A docs-only PR must never select a code pipeline, not even for a test that
  reads the root `AGENTS.md`.

## Concurrency

GitHub keeps one pending run per concurrency group and cancels older pending ones, even with `cancel-in-progress: false`.
On the default branch a shared group can drop a web merge's run for a later docs merge, whose diff selects nothing that
needs the web run. Share a group only for PRs:

```yaml
concurrency:
  group: ci-all-${{ github.event_name == 'pull_request' && github.ref || github.run_id }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

The same limit applies to CD. Every default-branch CI run starts the CD workflow, so a group on the whole workflow lets a
docs merge replace a pending web deployment. Put the group on the job that publishes, so that only real deployments
queue.

A cancelled run keeps its checks on the commit. A failed row can sit beside the newer run's passing gate, so read the
gate, not the list.

## Proving workflow changes

Running a workflow is the only way to know it works, so a change to `.github/**` does not need to run every folder on its
PR. It must pass a test run instead, locally and on GitHub:

- A PR-only job fails until a successful `workflow_dispatch` test run exists for the PR's head commit. Limit it with
  `if: github.event_name == 'pull_request'`. It has no twin, because inside a test run it would look for itself.
- Put the mode and inputs in `run-name`, so that the job can identify a qualifying run.
- Exit early unless the PR really changes workflows, since a "select everything" plan also runs this job.
- A workflow not yet on the default branch cannot be dispatched, so only a 404 from looking it up may pass. Any other API
  error must fail.
- CI cannot see local runs, so record them in the PR template.

An open PR keeps its old workflows until a new event, such as updating its branch. Re-running it reuses the old ones. To
test a cutover, update an open PR of the kind it should speed up.

## Dependencies in CI: cache or image

Measure both before choosing. `ivanov-gv/zpcg` builds a CI image, which suits dependencies that are slow to build. For
browser tests in `cg-map`, a cache took 14-36s per job, and the ready-made Playwright image is 878 MB compressed for each
job to pull, so the image would remove mirror risk without being faster.

Caching apt downloads has one trap: apt leaves root-owned `lock` and `partial` entries in its archive folder. Saving then
fails with only a warning, and every job still looks green. Remove them after installing, and confirm a cache entry exists.
