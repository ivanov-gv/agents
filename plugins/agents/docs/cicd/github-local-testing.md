---
summary: How every GitHub workflow gets a Makefile target that runs it locally with nektos/act, and how workflows are linted with actionlint.
rules: ../../skills/cicd-github/SKILL.md
updated: 2026-11-01
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

**When you add or rename a workflow under `.github/workflows/`:**

1. Add or rename the matching target in `Makefile`, mirroring
   the existing ones (`$(ACT) <event> -W .github/workflows/<file>.yml …`).
2. List the target as a prerequisite of a test-all-workflows target.

Nothing else catches a missing test target — `act` only lints the workflows it's
explicitly pointed at.

## CI linting with `rhysd/actionlint`

`rhysd/actionlint` is a static checker for GitHub Actions workflows. It's used in `ci-pr-checks`:

```yaml
    # ...
    steps:
       - uses: actions/checkout@v6
       - name: Lint all workflows
         run: actionlint
```
