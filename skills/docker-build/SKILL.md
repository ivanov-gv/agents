# docker-build

Docker image build, optimization, and multi-stage pipeline patterns.

## Multi-stage builds

Always use multi-stage builds to keep production images lean:

```dockerfile
# Stage 1 — build
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /app ./cmd/server

# Stage 2 — run
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

Key rules:
- Builder stage installs compilers, dev tools, SDKs — none of these land in the final image.
- Final stage uses the smallest viable base: `distroless`, `alpine`, or `scratch`.

## Layer caching

Order layers from least-to-most frequently changed:

1. Base image
2. System packages (`apt-get`, `apk`)
3. Dependency manifests (`go.mod`, `package.json`, `Cargo.toml`)
4. Dependency download (`go mod download`, `npm ci`, `cargo fetch`)
5. Source code `COPY . .`
6. Build step

Copying dependency manifests before source code ensures the dependency layer is cached across code-only changes.

## `.dockerignore`

Always maintain a `.dockerignore` to avoid bloating the build context:

```
.git
.idea
**/*.test
**/*_test.go
dist/
node_modules/
```

## Image hygiene

- Pin base image tags to a digest (`FROM golang:1.23-alpine@sha256:...`) in production.
- Run containers as a non-root user:
  ```dockerfile
  RUN adduser -D appuser
  USER appuser
  ```
- Expose only the port(s) the service actually listens on.
- Use `ENTRYPOINT` for the binary and `CMD` for default flags.

## Build commands

```bash
# Build with build args and tag
docker build --build-arg VERSION=$(git describe --tags) -t myapp:latest .

# Inspect image layers
docker image history myapp:latest

# Scan for vulnerabilities
docker scout cves myapp:latest
```

## CI integration

- Build and push only on `main` or tags, not on every PR branch.
- Use `--cache-from` with a registry cache to speed up CI builds:
  ```bash
  docker buildx build \
    --cache-from type=registry,ref=ghcr.io/myorg/myapp:buildcache \
    --cache-to   type=registry,ref=ghcr.io/myorg/myapp:buildcache,mode=max \
    --push -t ghcr.io/myorg/myapp:latest .
  ```
