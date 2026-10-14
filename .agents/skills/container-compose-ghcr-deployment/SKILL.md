---
name: container-compose-ghcr-deployment
description: "Use when creating, reviewing, debugging, or hardening Dockerfiles, Docker Compose configuration, container build pipelines, GitHub Container Registry publishing, runtime environment separation, image health checks, or container deployment workflows."
---

# Container, Compose, and GHCR Deployment

Design container delivery that fits the repository instead of forcing the repository to fit containers.

## Use when

Activate when the task explicitly involves Docker/container images, Compose, GHCR, image CI, container runtime configuration, health checks, build contexts, multi-stage builds, or deployment from published images.

Do not activate merely because an application needs deployment. Do not require developers to run Docker locally if the project already has a different supported local workflow.

## Safety rules

- Inspect the existing runtime, package manager, build command, ports, environment files, and CI before writing container files.
- Never copy `.env`, credentials, registry tokens, private keys, local databases, or repository metadata into an image.
- Keep build-time and runtime configuration distinct.
- Do not invent a GHCR owner/image name, secret name, deployment host, port, health endpoint, or production command.
- Pin important runtime/toolchain versions consistently with the repository's declared version policy.
- Prefer non-root runtime users when the application and base image support it.
- Use immutable image references/digests for production promotion when the deployment system supports them.
- Never hide failed builds, tests, or health checks.

## Workflow

### 1. Discover the repository contract

Inspect:

- runtime/version files and package/project manifests;
- package manager lockfiles;
- build and start scripts;
- framework output mode and generated artifacts;
- ports and health/readiness behavior;
- existing Dockerfile/Compose files;
- `.dockerignore` and `.gitignore`;
- CI workflows and registry conventions;
- environment examples/documentation, without copying real secrets.

Use the static preflight scanner for a quick map:

```bash
python scripts/container_preflight.py <project-root> --json
```

It does not build containers unless the agent explicitly chooses a separate runtime validation step.

### 2. Decide what is being containerized

Identify the deployment unit: web app, API, worker, scheduled process, static output, or multiple services. A Dockerfile should have one clear runtime responsibility; Compose may orchestrate several units.

Do not bundle databases/caches into the application image. In Compose, model them as separate services only when the requested environment needs them.

### 3. Build a minimal image

For compiled/bundled applications, prefer a multi-stage build when it materially reduces runtime dependencies or image size:

1. dependency/install stage using the repository's real lockfile and package manager;
2. build stage with only required build-time configuration;
3. runtime stage containing only runtime artifacts and dependencies.

Do not copy the entire repository into the final stage by habit. Do not install development dependencies in the runtime image unless they are required at runtime.

### 4. Harden build context

Create or update `.dockerignore` to exclude at least applicable examples such as:

- VCS metadata;
- local dependencies/caches/build outputs that are rebuilt in-image;
- `.env*` except intentionally safe example files when needed;
- editor/system files;
- test artifacts and coverage unless required by the build;
- local archives/backups.

Never assume a generic ignore list is complete; inspect the actual repository.

### 5. Compose without environment confusion

When Compose is requested:

- distinguish development Compose from deployment Compose if their concerns differ;
- avoid baking production-only assumptions into local developer commands;
- use named services, networks, volumes, and dependency health conditions only where they add value;
- preserve user data volumes deliberately;
- expose ports only when external access is required;
- document required variables by name, not secret value.

A health check should verify the service's real readiness contract. Do not invent `/health` if it does not exist.

### 6. Publish to GHCR safely

For GitHub Actions publishing:

- use repository permissions required for checkout and package publishing, no broader;
- authenticate to GHCR with the workflow-provided token when sufficient, or an explicitly documented secret when not;
- derive image naming from repository/org context or existing conventions;
- build deterministic tags for branch/commit/release needs;
- keep `latest` optional rather than the only deployable reference;
- build before push and surface failures;
- use caching only when it does not compromise correctness.

Do not fabricate production deployment steps after the image push unless the repository contains a deployment target and credentials contract.

### 7. Validate in layers

Static validation:

```bash
python scripts/container_preflight.py <project-root>
```

Then use available project/container tooling, for example only when actually present and appropriate:

- parse/validate Compose config;
- build the image from a clean context;
- run the application with safe non-secret configuration;
- inspect health/readiness;
- exercise the documented port/endpoint;
- verify final image user, entrypoint, and expected files;
- run CI-equivalent checks before publication.

If the current environment lacks a container engine, say so and limit claims to static validation.

## Common failure modes

- Copying `.env` into the image because it makes local testing easier.
- Using a production image as a substitute for a normal local workflow.
- Running a development server inside the production container.
- Mixing build-time public variables and runtime secrets.
- Depending on `depends_on` as if it proved another service is ready.
- Publishing only a mutable `latest` tag.
- Giving GHCR package write permissions to unrelated jobs.
- Claiming the image works after validating YAML only.
- Destructive database initialization in an entrypoint without explicit migration policy.

## Output

Report the detected application/runtime contract, files changed, image/runtime stages, environment-variable expectations, registry/tag strategy, validations actually run, and anything that still requires a real container engine or deployment environment.
