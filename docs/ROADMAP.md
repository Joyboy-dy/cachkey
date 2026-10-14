# Cachkey — Plan de développement

Ce document est la référence de progression du projet. Chaque phase se termine par une
vérification (lint, types, build, parcours principaux) avant de passer à la suivante.
Une phase n'empiète pas sur la suivante.

Légende : ✅ terminé · 🚧 en cours · ⏳ à venir

---

## Phase 0 — Fondation technique ✅

- Monorepo Bun workspaces (`apps/*`, `packages/*`), TypeScript strict partagé.
- `apps/web` : TanStack Start + Router + Query + Form, Tailwind CSS v4, shadcn/ui adapté à la charte.
- `apps/api` : Elysia (runtime Bun).
- `packages/db` : PostgreSQL + Prisma.
- `packages/emails` : templates React Email + abstraction d'envoi (Mailpit en dev, Resend en prod).
- `packages/shared` : schémas Zod partagés (validation formulaires + API).
- `docker-compose.dev.yml` : PostgreSQL + Mailpit pour le développement local.
- `.env.example` documentés, aucun secret dans le dépôt.
- Lint (ESLint + typescript-eslint), formatage (Prettier), `typecheck`, `build`.

## Phase 1 — Authentification complète ✅

- Better Auth monté dans l'API Elysia (`/api/auth/*`), adaptateur Prisma.
- Inscription email + mot de passe, vérification de l'adresse email obligatoire.
- Connexion / déconnexion, sessions par cookie httpOnly.
- OAuth Google et GitHub (activés uniquement si les identifiants sont configurés).
- Mot de passe oublié → email → réinitialisation → confirmation.
- Renvoi de l'email de vérification, gestion des liens expirés / invalides.
- Protection des routes authentifiées (redirection + `redirect` search param) et
  redirection des pages invitées lorsqu'une session existe.
- Gestion des erreurs (codes Better Auth traduits), états de chargement.
- Page de bienvenue authentifiée temporaire.

## Phase 2 — Compte utilisateur ⏳

- Page profil (nom, avatar), changement d'email avec re-vérification.
- Changement de mot de passe, définition d'un mot de passe pour les comptes OAuth.
- Comptes liés (lier / délier Google, GitHub).
- Liste des sessions actives et révocation.
- Suppression de compte.
- Rate limiting Better Auth persistant en base (sans Redis).

## Phase 3 — Organisations & projets ⏳

- Modèle Organisation (espace d'équipe) et appartenance.
- CRUD projets, navigation applicative (shell / dashboard réel).
- Rôles de base (owner, admin, member).

## Phase 4 — Environnements & secrets ⏳

- Environnements configurables par projet (local, développement, staging, production…).
- Chiffrement des secrets au repos (enveloppe : clé maître de l'instance + clés de données).
- CRUD variables, masquage par défaut, révélation explicite, copie.
- Import / export `.env`.
- Historique des versions d'une variable.

## Phase 5 — Collaboration & permissions ⏳

- Invitations par email.
- Permissions granulaires par projet / environnement.
- Journal d'audit (qui a lu / modifié quoi, quand).

## Phase 6 — Accès programmatique ⏳

- Jetons de service (machine tokens) à portée limitée.
- API publique documentée (OpenAPI via Elysia).
- CLI `cachkey` (pull / run avec injection des variables).

## Phase 7 — Self-hosting & distribution ⏳

- Dockerfiles de production (web, api) multi-stage, images publiées sur GHCR.
- `docker-compose.yml` de production, migrations automatiques au démarrage.
- Configuration par variables d'environnement, healthchecks.
- CI GitHub Actions (lint, types, tests, build, publication des images).

## Phase 8 — Version publiable ⏳

- Tests e2e des parcours critiques, revue de sécurité.
- Documentation utilisateur et d'auto-hébergement, CONTRIBUTING, SECURITY.md.
- Page d'accueil publique, versionnement sémantique, notes de version.

---

## Journal

- **2026-10-14** — Refonte des pages d’authentification : mise en page centrée, fond « cipher field » animé (canvas, sans dépendance), logo au-dessus du formulaire, révélation des caractères au survol.
- **2026-10-12** — Phases 0 et 1 réalisées : fondation monorepo et authentification complète.
  Vérifié : format, lint, types, build (web + API) ; parcours inscription → email → vérification
  → bienvenue, connexion / erreurs / déconnexion, gardes de routes, mot de passe oublié →
  réinitialisation → révocation des sessions, liens invalides, anti-énumération.
  Non testé en réel : Google et GitHub (nécessitent des identifiants OAuth) et l'envoi via Resend.
