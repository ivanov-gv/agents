---
title: Build a Golang app with Docker
description: Build a Golang app with Docker.
---

# Build

- `CGO_ENABLED=0` always — static binary, no shared lib dependencies
- Cross-compile explicitly: `GOOS=linux GOARCH=amd64`
- Strip debug info: `-ldflags="-s -w"`
- Remove local paths: `-trimpath`
- Inject version at build time via `-X` ldflags using `git describe` and `git rev-parse`

# Docker

- Multi-stage build — build in `golang:alpine`, copy binary to runtime image
- Prefer the tiniest image possible, a `scratch` image for example
- Only copy the binary into the final image
- Avoid installing runtime dependencies as much as possible. Keep the runtime the cleanest you can

# Deploy

- Expose `/healthz` (liveness) and `/readyz` (readiness) for k8s — they are not the same check
- Handle `SIGTERM` with graceful shutdown and a timeout context
- Set `GOMEMLIMIT` to ~85% of the container memory limit
- No config baked into the image — env vars or mounted files only

## Docker

All deployment configuration lives in `deploy/`. Use a multi-stage Dockerfile:

1. **Builder stage** — Full SDK image (e.g. `golang:1.23-alpine`). Install CA certificates, copy sources, build a
   static binary with `CGO_ENABLED=0`.
2. **Runtime stage** — Minimal base image (`scratch` or `distroless`). Copy only the binary and CA certs from the
   builder.
   No shell, no package manager, no extra attack surface.

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
