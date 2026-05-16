---
name: go-conventions
description: Use when writing or reviewing Go code — package layout, naming (PascalCase/camelCase, acronyms, no stutter), error handling with `%w` wrapping, table-driven tests, context-first I/O signatures, channel-based concurrency, and `go mod` hygiene.
---

# go-conventions

Apply Go project conventions, idioms, and code style when writing or reviewing Go code in this repo.

## Naming

- Exported identifiers use `PascalCase`; unexported use `camelCase`.
- Acronyms stay all-caps: `HTTPClient`, `JSONParser`, `userID`.
- Interface names are single-method + `er` suffix where possible: `Reader`, `Closer`, `Stringer`.
- Avoid stutter: package `auth` should export `Client`, not `AuthClient`.

## Error handling

- Always handle errors explicitly; never assign to `_` unless the error is provably irrelevant.
- Wrap errors with context using `fmt.Errorf("doing X: %w", err)`.
- Define sentinel errors as `var ErrFoo = errors.New("foo")` at package level.
- Use custom error types only when callers need to inspect fields.

## Project layout

Follow the standard Go project layout:
- `cmd/<binary>/main.go` for each binary entry point.
- `internal/` for packages not meant to be imported by external modules.
- `pkg/` only for genuinely reusable, stable public packages.

## Code style

- `gofmt` and `goimports` are non-negotiable; run them before every commit.
- Max line length: 100 characters (enforced by `golangci-lint`).
- Prefer table-driven tests with `t.Run` subtests.
- Use `context.Context` as the first argument to any function that does I/O.
- Avoid `init()`; prefer explicit initialization in `main` or constructors.

## Concurrency

- Never share memory without synchronization; prefer channels for ownership transfer.
- Always cancel contexts and close channels to avoid goroutine leaks.
- Use `sync.WaitGroup` + `errgroup.Group` for fan-out patterns.

## Dependencies

- Keep `go.mod` tidy: `go mod tidy` before committing.
- Prefer standard library over third-party for small utilities.
- Pin dependency versions; never use pseudo-versions in production modules.
