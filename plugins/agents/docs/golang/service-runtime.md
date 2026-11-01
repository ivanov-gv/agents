---
summary: How Go services are configured, packaged and told which environment they run in - env vars, .env, Dockerfile stages, ENVIRONMENT.
rules: ../../skills/code-golang-docker/SKILL.md
updated: 2026-11-01
---

# Go service runtime

## Docker

All deployment configuration lives in `deploy/`. Use a multi-stage Dockerfile:

1. **Builder stage** — Full SDK image (e.g. `golang:1.23-alpine`). Install CA certificates, copy sources, build a
   static binary with `CGO_ENABLED=0`.
2. **Runtime stage** — Minimal base image (`scratch` or `distroless`). Copy only the binary and CA certs from the
   builder. No shell, no package manager, no extra attack surface.

## Environment configuration

Runtime configuration is passed via environment variables, not config files. This keeps the image immutable and
environment-agnostic.

- `.env.example` lists all variables with placeholders. Copy to `.env` for local development.
- `.env` is gitignored and loaded by `Makefile` via `include .env`.
- Secrets (API tokens, etc.) are stored in the cloud provider's secret manager, never in `.env.example` or code.

## Environments

Use the `ENVIRONMENT` variable to distinguish between environments:

- `PROD` — Production. Default behavior.
- `PREPROD` — Pre-production/staging. Enables extra warnings or debug features via post-handlers in the server layer
  (e.g. appending a test environment warning to every response). The app and service layers stay unaware of the
  environment — environment-specific behavior is injected at the server layer only.
