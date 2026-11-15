---
name: code-golang-conventions
description: Best practices and rules to follow with <good-example> and <bad-example>. Must use in all Go projects. Read before any Golang related task, like writing, editing, updating, reviewing, refactoring, etc.
---

# Convention

Best practices and rules to follow with <good-example> and <bad-example>. Project instructions take precedence where
they differ.

## Project structure

Full reference with every directory and the request flow: [project layout](../../docs/golang/project-layout.md). Read it
before adding a package, binary, or layer.

- `cmd/<binary>/main.go` only wires things together: load config, create the app, start the server.
- Everything not exported to other repos lives in `internal/`; shared code for other repos in `pkg/`.
- Every folder directly under `internal/` must be a category (a type of structure such as `service/`, `client/`,
  `model/`), never an individual package. Individual packages live one level deeper inside their category folder. Do
  not add new packages directly under `internal/`.
- `gen/` holds generated code (including mockery mocks). Never edit it manually.
- Unit tests live next to the source; integration tests in `test/`; deployment config in `deploy/`.
- File names: `<package_name>.go` for the main type, `const.go`, `errors.go` for sentinel errors, `mapper.go` for
  conversions between layers, `*_test.go` for unit tests.

## Layers

- `server` handles transport, `app` orchestrates services, `service` packages each do one thing, `client` packages
  talk to external systems, `config` reads env vars into a struct.
- Services receive and return internal model types and do not call each other — the app layer coordinates them.
- `internal/model/` holds pure data types and constants: no logic, no dependencies on other layers.
- Mappers live at layer boundaries in `mapper.go`, named `<Source>To<Target>`, `from<Source>` (external → internal), or
  `to<Target>` (internal → external).
- Environment-specific behavior (`ENVIRONMENT=PROD|PREPROD`) is injected only in the server layer; app and services stay
  unaware of it. Runtime configuration comes only from environment variables
  ([service runtime](../../docs/golang/service-runtime.md)).

## Services in production

- Expose `/healthz` (liveness) and `/readyz` (readiness) for k8s — they are not the same check
- Handle `SIGTERM` with graceful shutdown and a timeout context

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
- Hold a mutex only inside a small method: `Lock()`, `defer Unlock()` on the next line, and no waiting on the network, a
  channel or another lock. Manual unlocks across branches leave the mutex held after a panic and are easy to miss on one
  path:

<bad-example>

```go
func (f *Feed) Current() Snapshot {
	f.mutex.Lock()
	if f.cached != nil {
		cached := f.cached
		f.mutex.Unlock()
		return *cached
	}
	refresh := f.startRefreshLocked()
	f.mutex.Unlock()
	<-refresh.done
	return *refresh.result
}
```

</bad-example>

<good-example>

```go
func (f *Feed) Current() Snapshot {
	cached, refresh := f.cachedOrRefresh()
	if cached != nil {
		return *cached
	}
	<-refresh.done
	return *refresh.result
}

func (f *Feed) cachedOrRefresh() (*Snapshot, *refreshCall) {
	f.mutex.Lock()
	defer f.mutex.Unlock()
	if f.cached != nil {
		return f.cached, nil
	}
	return nil, f.startRefreshLocked()
}
```

</good-example>

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
