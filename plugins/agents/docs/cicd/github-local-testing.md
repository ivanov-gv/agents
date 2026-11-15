---
summary: How every GitHub workflow gets a Makefile target that runs it locally with nektos/act, and how workflows are linted with actionlint.
rules: ../../skills/cicd-github/SKILL.md
updated: 2026-11-04
---

# Running GitHub workflows locally and linting them

## Local testing with `nektos/act`

Every workflow must have a make target in the root `Makefile`. Let's see an example.

The `ci-pr-checks` workflow is intended to be run on every PR, checking validity of every change before
it's merged into the main branch. Then, its test case must look like this:

```makefile
ACT ?= gh act

.PHONY: test-ci-pr-checks
test-ci-pr-checks:
	$(ACT) pull_request \                         # on pull_request event
		-W .github/workflows/ci-pr-checks.yml \   # run ci-pr-checks
		--secret-file .github/act/secret.env \    # with local secrets
		--var-file .github/act/var.env            # and vars
```

Another example - `cd-pre-release` workflow.

```makefile
ACT ?= gh act

GCLOUD_SCOPE := https://www.googleapis.com/auth/cloud-platform.read-only
# lazy evaluation for gcloud token with read-only scope
GCLOUD_TOKEN = $(eval GCLOUD_TOKEN := $(shell gcloud auth print-access-token --scopes='$(GCLOUD_SCOPE)'))$(GCLOUD_TOKEN)

.PHONY: test-cd-pre-release
test-cd-pre-release:
    $(ACT) release \                                    # on release 
        -W .github/workflows/cd-pre-release.yml \       # run cd-pre-release   
        -e .github/act/event-release-prerelease.json \  # with release event payload, containing release tag and preprelease = true    
        --secret-file .github/act/secret.env \          # with local secrets
        --var-file .github/act/var.env \                # vars
        --env CLOUDSDK_AUTH_ACCESS_TOKEN=$(GCLOUD_TOKEN)# and lazily evaluated gcloud token with read-only scope. 
```

Both of the targets can be run in dry-run mode with `act -n`:

```shell
make test-ci-pr-checks ACT="act -n"
make test-cd-pre-release ACT="act -n" GCLOUD_TOKEN=without-token-evaluation
```

A target that needs real input should stop early with a clear message, and list first under test-all-workflows, so that a
serial run does not fail at the end. Keep a dry run working without it:

```makefile
test-cd-pages:
	$(if $(or $(RUN_ID),$(findstring -n,$(ACT))),,$(error Set RUN_ID: make test-cd-pages RUN_ID=<run ID>))
	$(ACT) workflow_dispatch -W .github/workflows/cd-pages.yml --input run_id=$(RUN_ID)
```

Keep local tokens in the ignored secret file with a committed `secret.env.example`, never on the command line.

A dry run only checks that a workflow parses, so it does not count as testing it.

**When you add or rename a workflow under `.github/workflows/`:**

1. Add or rename the matching target in `Makefile`, mirroring
   the existing ones (`$(ACT) <event> -W .github/workflows/<file>.yml …`).
2. List the target as a prerequisite of a test-all-workflows target.

Nothing else catches a missing test target — `act` only lints the workflows it's
explicitly pointed at.

## Limits of `act`

Checked with act 0.2.88 and the `catthehacker/ubuntu:act-24.04` image. 0.2.96 rejects `upload-artifact@v6` too.

| Limit                                                                                         | What to do                                                                  |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| The artifact server rejects `upload-artifact@v6` ("unauthorized")                             | Use `@v5`; `download-artifact@v8` works. Comment why in the workflow        |
| It also fails with `upload-pages-artifact@v5` ("Unexpected end of JSON input")                | Use `@v4`                                                                   |
| Artifacts need `--artifact-server-path`                                                       | Add it to the shared flags, in an ignored folder                            |
| The runner image has no `gh`                                                                  | Call the API with `curl`, and add `shell: bash` for `pipefail`              |
| Matrix jobs run in parallel on the host network, so they collide on a port. `--concurrent-jobs 1` did not stop this | Add `--network bridge` |
| A forced image pull fails the job when DNS is flaky                                           | Add `--pull=false`, after pulling the image once                            |

Pin older action versions only where a local run needs them, and keep local and production steps the same.

## CI linting with `rhysd/actionlint`

`rhysd/actionlint` is a static checker for GitHub Actions workflows. It's used in `ci-pr-checks`:

```yaml
    # ...
    steps:
       - uses: actions/checkout@v6
       - name: Lint all workflows
         run: actionlint
```
