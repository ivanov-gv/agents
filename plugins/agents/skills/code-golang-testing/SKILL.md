---
title: Golang Testing
description: Golang specific skill for testing. Must use for writing, editing, updating and maintaining any tests in Golang projects, including unit, integration test and CI/CD tests.
---

# Test

- Use `-count=1 -race` flags to prevent using cached results and test race conditions

## Unit tests

### Tools

Use `github.com/stretchr/testify` for assertions:

- `assert` — for non-fatal checks (test continues on failure, reports all issues at once).
- `require` — for fatal checks where the rest of the test makes no sense if this fails (e.g. nil pointer would panic).

### Test files

Stored next to the source file they test, in the same package (white-box testing). This allows testing unexported
functions directly.

Run with: `go test -count=1 -race ./internal/...`

Structure:

- Name tests as `Test<FunctionOrBehavior>` (e.g. `TestUnify`, `TestFindDirectPaths`, `TestGenerateRoute`).
- Use `t.Run(name, func(t *testing.T) {...})` for subtests when iterating over cases (languages, inputs, etc.).
- Define test constants at the top of the test file for reusable test data.
- Use helper functions prefixed with the context (e.g. `renderTestDirectRoutes(...)`) to build test fixtures inline
  rather than loading from files.
- Use `t.Log` to print intermediate results for debugging.

What to test in unit tests:

- Core logic and algorithms (pathfinding, name matching, rendering).
- Data integrity — validate that constants/maps have all expected keys, no empty values, no accidental duplicates.
- Edge cases — wrong input, fuzzy matching with typos, different alphabets.

## Integration tests

Stored in `test/` directory, separate package. Test the full request-response cycle by starting the actual server (e.g.
HTTP or GRPC) and sending real requests to it.

Run with: `go test -count=1 -race ./test/...`

Rules:

- The code under test must be accessible to a debugger.
- Each integration test must be executable independently using `go test -run "SuiteName/TestName"`, without relying on
  other tests in the suite.
- Use `github.com/stretchr/testify/suite` for tests and its dependencies

### Structure

Use `github.com/stretchr/testify/suite` for context and dependences setup.

- Set up a TestSuite with all dependencies needed: mocks, servers running in separate goroutines and testcontainers
  `github.com/testcontainers/testcontainers-go`.
- Use `assert.Eventually` to wait for the dependencies to be ready.
- Set up each test with the data needed, run tests, clear everything after.
- Use subtests (`t.Run`) to group related scenarios within a single server lifecycle.

### Dependencies

If running a dependency as a goroutine is impossible, then consider these options.

#### Mocking

Use [mockery](https://github.com/vektra/mockery) for generating mocks from interfaces. Configuration in `.mockery.yaml`.
Generated mocks go to `gen/mocks/<package_name>/`. Use the `.EXPECT()` pattern for setting up expectations:

```go
mockClient.EXPECT().
RequestWithContext(mock.Anything, token, "sendMessage", mock.Anything, mock.Anything, mock.Anything).
Return([]byte("{}"), nil)
```

Use `mock.Anything` for arguments you don't care about in a particular test.

#### Docker containers and Testcontainers

The `github.com/testcontainers/testcontainers-go` lib is highly unreliable, so use it if no other options are suitable.

- Run a single container with full control over the execution
- Connect to the container, if needed
- Run a docker-compose.yml suite for complex setups
- Do not run containers directly without Testcontainers, because in case of an unexpected shutdown, the containers will
  not be garbage collected.

## CI/CD

All tests must be runnable in CI/CD with exactly the same command for running tests locally, including all its
dependencies. If a CI/CD test unexpectedly shuts down, no garbage must be left: no containers, no unattended images,
nothing.
