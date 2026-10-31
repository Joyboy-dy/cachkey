---
name: cachkey-docs
description: "Use when writing, updating, reviewing or checking the Cachkey user documentation in docs/ — and whenever a change alters user-visible behaviour (CLI commands or options, public API /api/v1, tokens, roles and permissions, limits, encryption, self-hosting, environment variables) so the matching page is updated in the same change."
---

# Cachkey documentation

The documentation lives in `docs/` as Markdown, in French, for users **and** AI agents. It
describes what the code actually does. A future public site will be generated from the same
files, so keep them self-contained and free of repository jargon.

## Map: which page owns which topic

| Page                                | Owns                                                        | Source of truth in code                                       |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `docs/README.md`                    | Index of every page                                         | —                                                             |
| `docs/getting-started.md`           | First account → project → variables → usage → team          | onboarding, `getting-started.tsx`                             |
| `docs/projects-and-variables.md`    | Projects, environments, bricks, variables, import/export, history | `packages/shared/src/secret-schemas.ts`, `brick-schemas.ts`, `dotenv.ts`, `apps/api/src/secrets.ts`, `bricks.ts` |
| `docs/team-and-access.md`           | Roles, invitations, project access, activity log, devices   | `workspace-schemas.ts`, `collaboration-schemas.ts`, `guards.ts`, `auth.ts` |
| `docs/access-tokens.md`             | Service tokens                                              | `token-schemas.ts`, `apps/api/src/tokens.ts`                  |
| `docs/cli.md`                       | Every CLI command and option                                | `apps/cli/src/args.ts` (`HELP`, `VALUE_FLAGS`), `config.ts`, `index.ts` |
| `docs/api.md`                       | Public API `/api/v1`                                        | `publicApiRoutes` in `apps/api/src/tokens.ts`                 |
| `docs/security.md`                  | Encryption, tokens, sessions, 2FA, access control, operator duty | `crypto.ts`, `auth.ts`, `guards.ts`, `two-factor-card.tsx` |
| `docs/self-hosting.md`              | Compose install, update, backup, troubleshooting            | `deploy/`, `.env.production.example`                          |
| `docs/one-click-deployment.md`      | Platforms (Dokploy, Coolify), catalogue status              | `deploy/compose.yaml`, `deploy/templates/`                    |
| `docs/authentication.md`            | Internal auth architecture (contributors)                   | `apps/api/src/auth.ts`, web routes                            |
| `CHANGELOG.md`                      | User-visible changes per version                            | —                                                             |

Add a page only for a new user need, and list it in `docs/README.md`.

## Workflow

1. **Find the impact.** From the diff, list user-visible changes: names, flags, limits,
   permissions, defaults, error codes, routes, variables. Map each to its page above.
2. **Read the code, not memory.** Every number, flag, role and default written must be
   checked in the source file listed. Never document planned behaviour as present.
3. **Edit in place.** Update the owning page; other pages link to it rather than repeating.
4. **Changelog.** Add a line under `## [Non publié]` in `CHANGELOG.md` (Ajouté / Modifié /
   Corrigé / Sécurité).
5. **Check consistency** (below), then report what was verified.

## Consistency checks

- CLI: every command in `HELP` (`apps/cli/src/args.ts`) and every key of `VALUE_FLAGS` plus
  boolean flags appear in `docs/cli.md`, and nothing more.
- API: every route of `publicApiRoutes` appears in `docs/api.md` with its parameters.
- Limits: `MAX_*` constants and `tokenLifetimes` match the numbers in the pages.
- Roles: `memberRoles`, `invitableRoles` and `requireProject(..., "manage" | "write")` match
  the permission tables.
- Env vars: `.env.production.example` matches `docs/self-hosting.md`; `deploy/compose.yaml`
  and both `deploy/templates/` pass the same variables and pin the same image version.
- Catalogues: never write that Cachkey is in a platform catalogue before the PR is merged.
- Links: every relative link in `docs/` resolves (`grep -o "](\([^)]*\.md\)" docs/*.md`).

## Style

- French, plain words, no internal jargon (« jeton d'accès », not « service token » ;
  « variable », not « secret row »). Code identifiers stay in backticks.
- Second person (« vous »), short sentences, tables for reference material, one runnable
  example per concept. Example domains: `cachkey.example.com`; tokens: `ck_…`.
- Never put a real secret, email or internal URL in an example.
- Lines wrapped near 95 characters, like the rest of `docs/`.
