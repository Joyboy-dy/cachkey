# syntax=docker/dockerfile:1.7
#
# Cachkey production images. The build context is the repository root:
#   docker build -f deploy/Dockerfile --target api -t cachkey-api .
#   docker build -f deploy/Dockerfile --target web -t cachkey-web .
# The context filter is deploy/Dockerfile.dockerignore (read next to this file).
#
# Both apps are bundled into a single file each, so the runtime stages carry no node_modules
# (except the Prisma CLI that applies migrations when the API starts).

ARG BUN_VERSION=1.3.14

# OCI metadata shared by the runtime images (the release workflow adds version and source).
FROM oven/bun:${BUN_VERSION}-slim AS runtime
LABEL org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="Félicio de SOUZA" \
      org.opencontainers.image.source="https://github.com/Joyboy-dy/cachkey"

# ── Dependencies (cached while manifests and lockfile are unchanged) ─────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/
# The db package's postinstall runs `prisma generate`, which needs the schema.
COPY packages/db/prisma packages/db/prisma
COPY packages/db/prisma.config.ts packages/db/
RUN bun install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN bun run --filter @cachkey/db generate \
 && bun run --filter @cachkey/api build \
 && bun run --filter @cachkey/web build

# ── Prisma CLI alone, to apply migrations at startup ─────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS migrator
WORKDIR /app/db
RUN echo '{"name":"cachkey-migrator","private":true,"dependencies":{"prisma":"7.10.0"}}' > package.json \
 && bun install --production \
 && rm -rf /root/.bun/install/cache
COPY packages/db/prisma.config.ts ./
COPY packages/db/prisma/schema.prisma prisma/
COPY packages/db/prisma/migrations prisma/migrations

# ── API runtime ──────────────────────────────────────────────────────────────────────────
FROM runtime AS api
WORKDIR /app
ENV NODE_ENV=production API_PORT=3001
COPY --from=migrator --chown=bun:bun /app/db ./db
COPY --from=build --chown=bun:bun /repo/apps/api/dist ./dist
COPY --chmod=755 deploy/api-entrypoint.sh /usr/local/bin/cachkey-api
USER bun
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:' + (process.env.API_PORT ?? 3001) + '/api/health'); process.exit(r.ok ? 0 : 1)"]
ENTRYPOINT ["cachkey-api"]

# ── Web runtime ──────────────────────────────────────────────────────────────────────────
FROM runtime AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 API_INTERNAL_URL=http://api:3001
COPY --from=build --chown=bun:bun /repo/apps/web/dist ./dist
USER bun
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/favicon.svg'); process.exit(r.ok ? 0 : 1)"]
CMD ["bun", "dist/serve.js"]
