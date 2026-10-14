# AGENTS.md — Cachkey

Durable rules for coding agents working on this repository. This file is a map: details
live in `.agents/` and in the canonical docs listed below. Keep it under 150 lines.

## Project

Cachkey is an open-source, self-hostable manager for technical secrets, API keys and
environment variables. UI language: **French**. Brand: Cachkey brand kit 1.0.

## Sources of truth

| Topic                          | Where                                                    |
| ------------------------------ | -------------------------------------------------------- |
| Roadmap, current phase         | `docs/ROADMAP.md` — follow phases in order, update it    |
| Authentication flows & routes  | `docs/authentication.md`                                 |
| Human setup & commands         | `README.md` (≤ 150 lines)                                |
| Environment variables          | `.env.example` (all vars), `.env.production.example`     |
| Environment file rules         | `.agents/rules/environment.md`                           |
| shadcn/ui, cursors, focus      | `.agents/rules/shadcn-ui.md`                             |
| Installed agent skills         | `.agents/skills/` (see "Skills" below)                   |
| Database schema                | `packages/db/prisma/schema.prisma`                       |
| Shared validation (Zod)        | `packages/shared/src/`                                   |
| Design tokens                  | `apps/web/src/styles.css` (+ `styles/customs.css`)       |

## Architecture (Bun workspaces)

- `apps/web` — TanStack Start (Router, Query, Form), Tailwind CSS v4, shadcn/ui.
  The web server proxies every `/api/*` request to the API (`src/server/api.ts`):
  one public origin, first-party cookies, no CORS.
- `apps/api` — Elysia + Better Auth (`src/auth.ts`, organization plugin), env validated by
  Zod (`src/env.ts`). Business routes are scoped to the session's active organisation and
  check the caller's role (`src/workspace.ts`); owner/admin write, member reads.
- `packages/db` — Prisma 7 (PostgreSQL). Only models actually needed by the current phase.
- `packages/emails` — React Email templates + `EmailTransport` (SMTP/Mailpit, Resend).
- `packages/shared` — Zod schemas shared by web and API.

Rules:

- Keep UI, auth logic, data access, validation and emails separated as above.
- Extend the module that already owns a behaviour; no speculative abstractions.
- Server/API validation is authoritative; client validation mirrors shared schemas.
- TypeScript only, strict mode, no `any`. No new dependency when the platform or an
  existing package solves the problem.
- Search params are handled by TanStack Router (`validateSearch` + Zod). Do not add `nuqs`.
- No Redis for now. No business features ahead of the roadmap phase.
- Never commit real secrets. Redirect targets must go through `safeRedirectPath`.

## User-facing content (mandatory)

- Every text visible to users is written for users, never for developers.
- Zod messages, errors, confirmations, toasts, notifications, labels, selects, filters
  and all UI copy: clear, natural, short, jargon-free, in **French** by default.
- Never expose environment variable names, internal keys, technical field names, raw
  enums, payloads, backend identifiers, sensitive values or implementation details.
- An error states the problem and, when useful, the expected action
  (« Le numéro de téléphone est requis », not a property name).
- Backend values stay distinct from UI labels: map them (`ADMIN` → « Administrateur »,
  `MEMBER` → « Membre », `OWNER` → « Propriétaire »). Same for statuses, roles,
  categories, filters, enums, `snake_case` values and constants.
- The frontend may know the technical value to talk to the API but must not display it.
- Better Auth error codes are translated in `apps/web/src/lib/auth/errors.ts`; unknown
  codes fall back to a generic message.
- Check every new or changed frontend text against these rules.

## UI conventions

- Respect the brand: Geist / Geist Mono, ink `#1A1A1A`, warm white `#FFF5F3`, orange
  `#F97316` reserved for primary actions and markers, always with an ink label.
  Official logo files only (`apps/web/public/brand`), never re-typed.
- Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-input`…), never raw
  colours in components. Field borders and focus rings must keep ≥ 3:1 contrast.
- Forms use the kit in `apps/web/src/components/form/form.tsx` (TanStack Form +
  shared Zod schema, `revalidateLogic`, focus on first invalid field, POST fallback).
- Inline links use `textLinkVariants` (`components/ui/text-link.ts`).
- UI icons: **Hugeicons only**, through `<Icon icon={…} />` (`components/ui/icon.tsx`,
  icons from `@hugeicons/core-free-icons`). No lucide-react; after `shadcn add`, replace
  the generated lucide imports.
- Avatars: **DiceBear only**, generated locally (`lib/avatar.ts`): users = style **Clay**,
  organisations = style **Shape Grid**. Never other styles, provider images or the HTTP API.
- Brand marks (Google, GitHub…): drop SVGs in `apps/web/public/icons`, run `bun run icons:generate`; import from
  `@/components/icons` (generated, never edited by hand). `bun run icons:migrate` rewrites
  file-level icon imports to the barrel; `check:icons` (in `bun run check`) enforces it.
- Light and dark themes are both mandatory: tokens in `styles.css` (`:root` / `.dark`),
  never colours that only work on one theme; check every screen in both (`lib/theme.ts`).
- Interfaces must work from 320 px wide without horizontal scroll; respect
  `prefers-reduced-motion`.
- shadcn/ui policy (cursors, `customs.css`, `data-slot` contracts): read
  `.agents/rules/shadcn-ui.md` before touching `components/ui/` or global CSS.

## Environment

- `.env.example`: every variable, example values only. `.env.local`: real local values.
  `.env.prod`: real production values. Both real files are git-ignored.
- Details and production rules: `.agents/rules/environment.md`.
- Local services: `bun run services:up` (PostgreSQL on 5433, Mailpit SMTP 1026 / UI 8026).

## Commands

```bash
bun run dev          # web :3000 + api :3001
bun run check        # format, lint, typecheck, tests, UI contracts — run before handing off
bun run build        # production build (web + api)
bun run db:migrate   # Prisma migration (dev)
bun run dev:emails   # React Email preview :3002
```

Before declaring work done: `bun run check` and `bun run build` pass, and the changed
flows were exercised in a browser when UI is involved. Report what was not verified.

## Git

- Never commit or push without explicit approval from the user.
- The remote is `github.com/Joyboy-dy/cachkey`; credentials are pinned to `Joyboy-dy`.

## Skills

Project skills live in `.agents/skills/` (lock file: `skills-lock.json`). Use them when
relevant:

- `ux-ui-audit`, `frontend-aesthetics`, `chromatic-design` — UI audits, polish, colours.
- `form-ux-validation` — any form change.
- `responsive-interface-guardian` — layout or responsive changes.
- `senior-frontend-engineering`, `codebase-architecture-guardian` — structure, ownership.
- `ui-modern-2026` — adopting newer CSS / platform features.
- `container-compose-ghcr-deployment` — roadmap phase 7 (Docker, Compose, GHCR).

## Notes

- `.agents/note_prompts.md` is a personal scratchpad, git-ignored. Do not rely on it.
