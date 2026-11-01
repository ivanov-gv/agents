---
summary: Reference layout of a Go service - directories, file names, and how a request flows through the layers.
rules: ../../skills/code-golang-conventions/SKILL.md
updated: 2026-11-01
---

# Go project layout

## Directories

- `cmd/` — Executable entry points. One subdirectory per binary. Each contains only a `main.go` with minimal wiring
  (config loading, dependency init, server start).
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
- `gen/` — Generated code. Do not edit manually. Includes generated data files and mockery-generated test mocks
  (configured in `.mockery.yaml`).
- `test/` — Integration tests (separated from unit tests which live next to source files in `internal/`).
- `deploy/` — Deployment configuration (Dockerfile, etc.).
- `docs/` — Documentation and resources.
- `.env.example` — Template for required environment variables. Copy to `.env` and fill in values. `.env` is gitignored
  and loaded by `Makefile` via `include .env`. See [service runtime](service-runtime.md).

Every folder directly under `internal/` is a category (a type of structure such as `service/`, `client/`, `model/`),
never an individual package. Individual packages live one level deeper inside their category folder.

## File names

- `<package_name>.go` — Main file of a package. Contains the primary type and its core logic (e.g.
  `blacklist/blacklist.go`, `callback/callback.go`).
- `const.go` — Package-level constants and variable declarations.
- `errors.go` — Sentinel errors for the package (`var ErrSomething = errors.New(...)`).
- `mapper.go` — Conversion functions between types of different layers/domains. Placed in the package that owns the
  conversion (e.g. `server/mapper.go` converts between Telegram API types and internal `model/message` types;
  `date/mapper.go` converts between `time.Time` and `int64`).
- `*_test.go` — Unit tests, next to the source file they test.

## Control flow and layers

**Layers** (`main.go` → business logic):

1. `cmd/<binary>/main.go` — Loads config, creates the app, starts the server. Minimal wiring only.
2. `internal/config/` — Reads environment variables into a config struct.
3. `internal/server/` — `RunServer()` starts the server for connecting with the outer world and wires handlers (e.g.
   http server and handlers)
4. `internal/app/` — `NewApp()` initializes all services and business logic. The `App` struct holds all service
   dependencies. Orchestrates services to fulfill the request. Knows about business logic but not about transport or
   external API types.
5. `internal/service/` — Each service is a focused unit doing one thing (finding routes, resolving names, rendering
   messages, etc.). Services receive and return internal model types. Services do not call each other — the app layer
   coordinates them.

In between layers are:

- `internal/model/` — Pure data types and constants. No logic, no dependencies on other layers. Shared across all layers
  as the common language.
- `.../mapper.go` — live at layer boundaries. They convert between external types and internal model types. Mappers are
  always named as `<Source>To<Target>`, `from<Source>` (for external → internal mappers), `to<Target>` (for internal →
  external mappers).
