#!/bin/sh
# Cachkey API container: apply pending database migrations, then start the API.
# Migrations only add or alter what the schema needs; Prisma takes a lock, so several
# replicas starting together apply them once. Set CACHKEY_SKIP_MIGRATIONS=true to manage
# migrations yourself.
set -eu

if [ "${CACHKEY_SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "Applying database migrations…"
  cd /app/db
  bun node_modules/prisma/build/index.js migrate deploy
  cd /app
fi

exec bun /app/dist/index.js
