# Environment files

## Files

| File                      | Committed | Content                                                      |
| ------------------------- | --------- | ------------------------------------------------------------ |
| `.env.example`            | yes       | Every variable used by the project, example values only.     |
| `.env.production.example` | yes       | Only what is really configurable in production (kept light). |
| `.env.local`              | **no**    | Real local values (dev). Loaded by the package scripts.      |
| `.env.prod`               | **no**    | Real production values, on the server only.                  |

`.gitignore` ignores `.env` and `.env.*`, except the two `*.example` files.

## Loading

- Dev scripts load the root `.env.local` explicitly: `bun --env-file=../../.env.local …`
  (`apps/api`, `apps/web`, `packages/db`).
- `prisma generate` does not need any variable (it runs on `postinstall`).
- The API validates its environment with Zod at startup (`apps/api/src/env.ts`) and
  exits with a readable list of problems. Add every new variable there **and** to
  `.env.example` (plus `.env.production.example` if it matters in production).

## Production rule

- `compose.yaml` (roadmap phase 7) carries most non-sensitive variables and their
  defaults (ports, internal URLs, SMTP defaults…).
- Production env files mainly contain: secrets, environment-dependent values, feature flags.
- A value provided by the environment always overrides the `compose.yaml` default.

## Never

- Commit a real value, even a "temporary" one.
- Display an environment variable name in the UI (see user-facing content rule).
- Read secrets from the browser: only server code (`apps/api`, `apps/web/src/server`,
  server functions) accesses `process.env`.
