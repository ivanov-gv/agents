---
title: Golang Linting
description: Linting Golang source code with golangci-lint. Use for configuring and running the linter.
---

# Linting

Run with: `golangci-lint run ./...`

Configuration lives in `.golangci.yml`. The linter config must **not** contain global exceptions, ignored rules, or
suppression lists. All linter rules apply everywhere.

## Magic numbers (`mnd` linter)

The `mnd` linter flags numeric literals. The correct fix depends on whether the number has domain meaning:

**Use a named constant** when the number has domain/business meaning — it represents a chosen value that someone might
need to find, understand, or change:
```go
const deviceFlowPollInterval = 5 * time.Second // RFC 8628 §3.5
const configDirPermissions = 0700               // owner-only access
const defaultPageSize = 20
const replyArgCount = 2 // <comment-id> <body>
```

**Use `//nolint:mnd`** only when the number is purely structural and has no meaning beyond the syntax — e.g. split
counts, slice index bounds, or length checks that mirror the split:
```go
parts := strings.SplitN(remote, ":", 2) //nolint:mnd // split into host:path
if len(parts) != 2 {                    //nolint:mnd // expect host and path
```

Rule of thumb: if you can give the number a meaningful name, make it a constant. If the only name you can think of is
`two` or `splitCount`, use `//nolint:mnd`.

## Handling other false positives

When a linter reports a false positive, suppress it at the exact line with a `//nolint` comment that specifies the
linter name and explains why:

```go
parts := strings.SplitN(remote, ":", 2) //nolint:mnd // split into host:path
```

Rules:
- Always specify the linter name: `//nolint:mnd`, never bare `//nolint`.
- Always add a `//` comment after the directive explaining **why** it is a false positive.
- Never add global exceptions to `.golangci.yml` — each suppression must be local and justified.
- Fix the issue instead of suppressing whenever possible.

## Pay attention to linter output

Before committing, run `golangci-lint run ./...` and fix every issue. The CI pipeline runs the same linter and will
block merges on violations.
