---
title: Golang Conventions
description: Best practices and rules to follow with <good-example> and <bad-example>. Must use in all Go projects. Read before any Golang related task, like writing, editing, updating, reviewing, refactoring, etc.
---

# Convention

Best practices and rules to follow with <good-example> and <bad-example>

## Project Structure Convention

- `cmd/` — Executable entry points. One subdirectory per binary. Each contains only a `main.go` with minimal wiring (
  config loading, dependency init, server start).
- `internal/` — Anything and everything unexportable to other repos (e.g. business logic, internal utils, etc.)
- `internal/app/` — Core application/business logic. Orchestrates services.
- `internal/client/` — External API and system clients. One subpackage per client (e.g. `git/`, `github/`, `auth/`).
  Clients handle all communication with external systems and APIs.
- `internal/config/` — Configuration loading from environment variables.
- `internal/server/` — HTTP server, routing, request/response mapping.
- `internal/service/` — Domain services. One package per concern (e.g. `parser/`, `render/`, `name/`). Services may have
  subpackages for internal structure.
- `internal/model/` — Data types and constants. One subpackage per domain (e.g. `timetable/`, `message/`, `callback/`).
  No business logic here.
- `internal/utils/` — Generic reusable helpers not tied to any domain. One subpackage per concern (e.g. `format/`).
- `internal/.../utils` — Reusable helpers tied to a domain.
- `pkg/` — Shared packages for other repos.
- `pkg/model/` — Exported models for other repos.
- `gen/` — Generated code. Do not edit manually. Includes generated data files and mockery-generated test mocks (
  configured in `.mockery.yaml`).
- `test/` — Integration tests (separated from unit tests which live next to source files in `internal/`).
- `deploy/` — Deployment configuration (Dockerfile, etc.).
- `docs/` — Documentation and resources.
- `.env.example` — Template for required environment variables. Copy to `.env` and fill in values. `.env` is gitignored
  and loaded by `Makefile` via `include .env`.

> **Rule**: every folder directly under `internal/` must be a category (a type of structure such as `service/`,
`client/`, `model/`), never an individual package. Individual packages live one level deeper inside their category
> folder. Do not add new packages directly under `internal/`.

## File Naming Conventions

- `<package_name>.go` — Main file of a package. Contains the primary type and its core logic (e.g.
  `blacklist/blacklist.go`, `callback/callback.go`).
- `const.go` — Package-level constants and variable declarations.
- `errors.go` — Sentinel errors for the package (`var ErrSomething = errors.New(...)`).
- `mapper.go` — Conversion functions between types of different layers/domains. Placed in the package that owns the
  conversion (e.g. `server/mapper.go` converts between Telegram API types and internal `model/message` types;
  `date/mapper.go` converts between `time.Time` and `int64`).
- `*_test.go` — Unit tests, next to the source file they test.

## Control Flow and Layers

**Layers** (`main.go` → business logic):

1. `cmd/<binary>/main.go` — Loads config, creates the app, starts the server. Minimal wiring only.
2. `internal/config/` — Reads environment variables into a config struct.
3. `internal/server/` — `RunServer()` starts the server for connecting with the outer world and wires handlers (e.g.
   http server and handlers)
4. `internal/app/` — `NewApp()` initializes all services and business logic. The `App` struct holds all service
   dependencies. Orchestrates services to fulfill the request. Knows about business logic but not about transport or
   external API types.
5. `internal/service/`) — Each service is a focused unit doing one thing (finding routes, resolving names, rendering
   messages, etc.). Services receive and return internal model types. Services do not call each other — the app layer
   coordinates them.

In between layers are:

- `internal/model/` — Pure data types and constants. No logic, no dependencies on other layers. Shared across all layers
  as the common language.
- `.../mapper.go` - live at layer boundaries. They convert between external types and internal model types. Mappers are
  always named as `<Source>To<Target>`, `from<Source>` (for external → internal mappers), `to<Target>` (for internal →
  external mappers).

## Code Structure

### Service pattern

Services are structs with unexported fields, created via `New<ServiceName>(...)` constructors that accept dependencies
as arguments and return a pointer:

<good-example>

```go
func NewPathFinder(deps ...) *PathFinder {
return &PathFinder{...}
}

type PathFinder struct {
field1 Type1 // unexported fields
field2 Type2
}
```

</good-example>

Services with no state still follow the struct pattern (`type BlackListService struct{}`).

### Naming

- **Underscore prefix for shadowed builtins**: When a local variable would shadow an import or builtin, prefix with
  `_` (e.g. `_config`, `_app`, `_timetable`, `_message`, `_callback`).
- **Import aliases**: When a package name collides with a local variable or another import, use `<purpose>_<package>`
  alias (e.g. `callback_model "...model/callback"`, `model_render "...model/render"`).
- **Type IDs as distinct types**: Use named types for IDs (`type StationId int`, `type TrainId int`) to get compile-time
  safety.
- **Map type aliases**: Define map type aliases when the map signature is long or used often (
  `type StationIdToStationMap map[StationId]Stop`, `type TrainIdSet map[TrainId]struct{}`).
- **Enum pattern**: Use `iota` for internal enums. Use typed string constants for values that appear in serialized data.
- **Sentinel errors**: Defined in `errors.go` as package-level `var Err... = errors.New(...)`.
- **Only meaningful names**: prefer using readable names, understandable without context. `fileIterator` instead of
  `iter`, `func ParseTimetable(additionalRoutesHttpPaths ...string)` instead of `func P(paths ...string)`

### Model structs

Models use flat structs with a `Type` field + optional data fields per variant instead of interfaces:

```go
type Callback struct {
Type             Type
UpdateData       UpdateData       // populated when Type == UpdateType
ReverseRouteData ReverseRouteData // populated when Type == ReverseRouteType
}
```

Consumers switch on the `Type` field and read the corresponding data.

### Logic structure

Use laconic and precise comments throughout the code for faster understanding.
It's always easier to read comments, than plain unfamiliar code, especially on code reviews. Example:

<good-example>

```go
package p

// ReadSomeImportantInfo reads *1st thing* from *2nd thing* for *3rd thing* purpose with *4th thing* details
func ReadSomeImportantInfo() {
	// read from *1st thing*
	...
	// convert to *2nd thing*
	...
	// validation for the *3rd thing* purpose
	...
	// add *4th thing* details
	...
}
```

</good-example>

Less nesting is better. Examples:

<bad-example>

```go
package p

func BadFunction(user User, data []int) error { // A bad example:
	if user.IsActive {
		if len(data) > 0 {
			avg := calculateAverage(data)
			if avg > 50 {
				err := storeResult(avg)
				if err != nil {
					return err // Deeply nested return
				}
				return nil
			} else {
				return errors.New("average too low") // Another nested return
			}
		} else {
			return errors.New("no data to process")
		}
	} else {
		return errors.New("user is inactive")
	}
}

```

</bad-example>

<good-example>

```go

func GoodFunction(user User, data []int) error { // A good example:
// Use a guard clause for the 'IsActive' check
if !user.IsActive {
return errors.New("user is inactive")
}

// Use a guard clause for the 'len(data)' check
if len(data) == 0 {
return errors.New("no data to process")
}

avg := calculateAverage(data)

// Use a guard clause for the 'avg' check
if avg <= 50 {
return errors.New("average too low")
}

// Process the main logic without deep nesting
err := storeResult(avg)
if err != nil { // Handle the potential error with an early return
return err
}

return nil
}

```

</good-example>

### Other

- Use `github.com/samber/lo` for functional collection operations (`lo.Map`, `lo.Filter`, `lo.Must`, `lo.Flatten`, etc.)
  instead of writing manual loops when the intent is clearer with a functional style.
- Use generics for reusable utility functions operating on maps/slices (see `internal/utils/`). Also use generic
  functions in service code when the pattern is clear (e.g. `GetMessage[T any](map, key) T`).
- Define interfaces at the consumer side, not the provider side.

## Error handling

In general, every error has to have:

- **Pointer** to the place where the error occurred
- **Context** providing details about what happened
- **Result** that has to be read and understood by a human or agent

### Errors

Pattern for errors:

<good-example>

```go
package A

func B(s string) error { /* ... */ }

func A() error {
	parameter := "important input parameter"
	err := B(parameter)
	if err != nil {
		// Errorf with the function name, parameters in [] and %w
		return fmt.Errorf("B [parameter='%s']: %w", parameter, err)
	}
	return nil
}

```

</good-example>

According to the rule:

1. Pointer: "B ..." – points to the B function call
2. Context: "\[parameter='%s']"
3. Result: "... %w"

If a function is called more than once in the same scope, then make those calls and errors distinguishable.

### Logging

Pattern for logging:

<good-example>

```go
package main

func main() {
	const logfmt = "main: " // constant logfmt with the function name
	_app, err := app.NewApp()
	if err != nil {
		// log with logfmt + the function name and context passed
		log.Fatal().Str("some more context", "if needed").Err(fmt.Errorf(logfmt+"app.NewApp: %w", err)).Send()
	}
}
```

</good-example>

According to the rule:

1. Pointer: logfmt + the function name
2. Context: .Str("some more context", "if needed")
3. Result: Fatal + err

Details:

- For logging use `github.com/rs/zerolog/log` by default, if nothing else mentioned.
