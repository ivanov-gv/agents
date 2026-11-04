---
summary: How one workflow runs identical steps in production and test-run mode, and why it is safe.
rules: ../../skills/cicd-general/SKILL.md
updated: 2026-11-04
---

# Test-run model

Workflow diagram with a test-run switch:

```mermaid

graph LR
    A[test-run switch] --> B[build]
    B --> C[push]
    C --> D[retag]
    D --> E[deploy]
    A --> B1[test-run: build]
    B1 --> C1[test-run: retag]
    C1 --> D1[test-run: deploy]
    D1 --> E1[test-run: deploy]
```

Implementation example (GitHub Actions workflow):

```yaml
jobs:
  - switch:
      outputs:
        test_run: ${{ steps.test_run_switch.outputs.test_run }} # true or false
      steps:
        - # decide - default or test-run
        - # set outputs.test_run to true or false 
  - deploy:
      name: Deploy to preprod
      needs: [ switch ]
      if: ${{ needs.switch.outputs.test_run != 'true' }} # depends on switch
      env: &deploy-env        # env anchor
      # ...
      steps: &deploy-steps    # steps anchor
      # ...

  - deploy-test-run:
      name: (test-run) Deploy to preprod
      needs: [ switch ]
      if: ${{ needs.switch.outputs.test_run == 'true' }}
      environment: test-run   # test environment
      permissions:
        registry: read        # protects from accidental writes
      env: *deploy-env        # same envs
      steps: *deploy-steps    # same steps
```

Production and test-run jobs are deployed as **parallel pairs** that share a YAML-anchor step list
(e.g. `*build-and-push-steps`, `*retag-steps`, `*deploy-steps`). The pair is selected by
`needs.switch.outputs.test_run`. Both jobs run the **same steps**.

Safety comes from `environment: test-run` resolving secrets and vars to non-production targets —
for example `vars.ENV_REGISTRY` resolves to a public no-auth sink like `ttl.sh` in the test-run
environment, and WIF credentials resolve to a test-run GCP project. Reduced `permissions:`
(e.g. `packages: read` on GHCR) provide a second layer.

```yaml
  - deploy:
      # ...
      env: &deploy-env
        - ENV_REGISTRY: ${{ vars.ENV_REGISTRY }}
      steps: &deploy-steps
        - docker push ${{ env.ENV_REGISTRY }}/image:tag

  - deploy-test-run:
      # ...       
      environment: test-run
      permissions:
        registry: read
      env: *deploy-env
      steps: *deploy-steps    # same 'docker push', but to a test-run registry
```

This means a step that "actually runs" in the test-run job is fine, as long as its destination
comes from environment-scoped secrets or vars. Do **not** add step-level `if:` skips to make
test-run steps "no-op" — that defeats the purpose of exercising the same code path.

This model has a big disadvantage: outputs don't work because of the YAML anchors. Two jobs
share the same steps and envs list, but the default one needs to reference `needs.previous-job.outputs` and the
test-run one needs to reference `needs.previous-job-test-run.outputs`. For the GitHub Actions workaround, see
[outputs in test-run pairs](github-test-run-outputs.md).

## When a step has no test destination

The model needs a test target for each destination, and some platform steps have none: `actions/deploy-pages` always
publishes to the repository it runs in. With read-only permissions it can only fail, and creating a second site only for
testing can cost more than it saves. The options are:

- Publish through a mechanism with a configurable target, such as pushing to a branch of a test repository. This fully
  follows the model, but needs a second repository and a long-lived deploy key.
- With the owner's approval, make the twin a dummy that logs what production would publish: the artifact, digest, source
  run, and target. Keep real twins for every earlier job. The publish step is then first exercised on a real merge, so
  record the exception and when to revisit it, such as moving to another provider.

A complete workflow using this model: [example GitHub workflow](github-example-workflow.md). In a monorepo:
[monorepo pipelines](github-monorepo.md).
