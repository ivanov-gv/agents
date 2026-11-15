---
name: cicd-general
description: "Platform-neutral CI/CD rules: three ways to run every pipeline, test-run mode, job-scoped env vars, CI vs CD zones, artifact identity, registry retention. Use when writing, editing or reviewing any pipeline (GitHub Actions, GitLab CI, Jenkins, etc.)."
---

# CI/CD pipeline rules

Rules for CI/CD pipelines and reusable components on any platform. Platform skills add specifics, for example
`cicd-github`. Background and examples: [CI vs CD](../../docs/cicd/ci-vs-cd.md),
[test-run model](../../docs/cicd/test-run-model.md), [env blocks](../../docs/cicd/env-blocks.md).

## Every workflow

1. Must have 3 ways to run with exactly the same steps and env variables definitions:
    1. Locally with local testing tools (e.g., `nektos/act` for GitHub Actions, GitLab Runner for GitLab)
    2. Via manual trigger with `test_run` input parameter
    3. Default production run
2. Must define `env:` sections in job's scope that map secrets and variables from the platform into named env vars
3. Must use only variables from the closest `env:` block or platform context variables in `steps:` section
4. Must only use variables from `env:` blocks via environment variable syntax
5. Must not use `test_run` for branching in `steps:` sections. Steps must not know whether they're
   running in test-run mode or not.
6. Must use test_run mode if running locally.
7. Must never run automatically on every commit, except for protected branches and the default one. For PR checks
   require manual approval, do not run workflows on every push.

## Test-run mode

- Production and test-run jobs are parallel pairs that run the **same steps and env definitions** (e.g. shared via YAML
  anchors). A switch job selects which one of the pair runs.
- Safety comes from the test-run environment resolving secrets and vars to non-production targets (e.g. a public no-auth
  registry such as `ttl.sh`, a test-run cloud project). Reduced permissions (read-only registry access) are a second
  layer.
- A step that "actually runs" in test-run mode is fine as long as its destination comes from environment-scoped secrets
  or vars. Never add step-level conditions that skip steps in test-run mode; that defeats exercising the same code path.
- CI takes a `commit` input so any commit can be built in test-run mode.
- Every CD path must run for real before merge — locally, via test-run dispatch, and in the default production run.

## CI and CD zones

Workflows are strictly divided into CI and CD parts (devs' and ops' zones):

1. CI workflows run checks and build artifacts to dev registry only.
2. CD workflows pull the CI-built artifact from the dev registry, retag it and pull into the pre / prod registry.
3. CI and the dev registry are parts of devs' responsibility zone. It never touches pre/prod environments or
   registries.
4. CD and the pre/prod registry are parts of ops' responsibility zone. It never writes to dev registry, only reads
   from it.

CI workflows:

1. Must have `ci-` prefix in the name.
2. Must not use a pre/production environment in any way.
3. Must use only dev registry, which is considered a part of the development environment.
4. Must not create tags or releases.

CD workflows:

1. Must have `cd-` prefix in the name.
2. Must be triggered by a release or manual trigger events.
3. Must not be triggered by a push event of any kind, including tags.
4. Must use a pre/production environment in default mode.
5. Must not use a pre/production environment in test-run mode, only test-run environment.
6. Must only pull artifacts from the dev registry, never push to the dev registry.
7. Must only pull artifacts from the dev registry tagged with the commit SHA.
8. Must never use dev registry directly to push to pre/production environments. Must always create a copy of the
   artifact in the environment it deploys to.
9. Must never delete any artifact from pre/production environments.
10. Must never touch any source code. Only pull release-ready artifacts.
11. Must never rebuild from source; the dev registry is always the intermediate artifact store.

## Artifact identity

- The commit SHA is the identity of every deliverable — images, static sites, bundles, anything CI publishes.
- CI publishes every deliverable to the dev registry tagged with the full commit SHA.
- Non-image artifacts are packaged as OCI images so they are addressable by commit.
- Run-scoped CI artifacts (e.g. GitHub Actions artifacts) are not deliverables: CD cannot address them by commit.

## CD smell test

- A CD job is "pull by SHA → copy into the target → deploy". Nothing else.
- If CD needs a lookup, a script, polling, a run ID, or a "newest?" check to find what to deploy, the artifact is not
  versioned properly. Fix the versioning, not CD.

## Eventual consistency

- Every version deploys when it is built. The last one wins.
- Do not add ordering or freshness logic to CD.

## Registry retention

- Retention belongs to the registry, not to CD logic.
- The test-run registry is ephemeral (e.g. `ttl.sh`).
- The dev registry uses count-based cleanup.
- Rollback means deploying an older SHA.
