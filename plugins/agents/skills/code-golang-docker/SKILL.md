---
name: code-golang-docker
description: "Build a Golang app into a Docker image: static binaries, ldflags, multi-stage builds, runtime configuration. Use when writing or reviewing Dockerfiles or deployment config for Go projects."
---

# Build

- `CGO_ENABLED=0` always — static binary, no shared lib dependencies
- Cross-compile explicitly: `GOOS=linux GOARCH=amd64`
- Strip debug info: `-ldflags="-s -w"`
- Remove local paths: `-trimpath`
- Inject version at build time via `-X` ldflags using `git describe` and `git rev-parse`

# Docker

- The Dockerfile and other deployment configuration live in `deploy/`
- Multi-stage build — build in `golang:alpine` (install CA certificates there), copy the binary and CA certs to the
  runtime image
- Prefer the tiniest image possible, a `scratch` image for example (or `distroless`): no shell, no package manager
- Only copy the binary into the final image
- Avoid installing runtime dependencies as much as possible. Keep the runtime the cleanest you can

# Runtime configuration

- No config baked into the image — env vars or mounted files only
- Set `GOMEMLIMIT` to ~85% of the container memory limit
- Secrets come from the cloud provider's secret manager, never from `.env.example`, the image, or code

Details (Dockerfile stages, `.env` workflow, `ENVIRONMENT` values): [service runtime](../../docs/golang/service-runtime.md).
Health checks and graceful shutdown are code rules in `code-golang-conventions`.
