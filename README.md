# Cachkey

**Vos secrets. Votre maîtrise.**

Cachkey est une application open source et auto-hébergeable de gestion des secrets techniques,
clés API et variables d'environnement pour les développeurs et les équipes.

> Statut : en développement — phases 1 et 2 terminées (authentification, shell applicatif, gestion du compte). Voir [docs/ROADMAP.md](docs/ROADMAP.md).

## Architecture

Monorepo [Bun](https://bun.sh) (workspaces) en TypeScript strict.

```
apps/
  web/        TanStack Start (Router, Query, Form) · Tailwind CSS v4 · shadcn/ui
  api/        Elysia · Better Auth
packages/
  db/         Prisma (PostgreSQL) — schéma et client
  emails/     Templates React Email + transports (SMTP / Resend)
  shared/     Schémas Zod partagés (validation front et API)
docs/         Plan de développement et documentation technique
```

Le navigateur ne parle qu'à l'application web : toutes les requêtes `/api/*` sont relayées
par le serveur web vers l'API Elysia (`API_INTERNAL_URL`). Une seule origine publique,
donc cookies first-party et aucune configuration CORS. Détails :
[docs/authentication.md](docs/authentication.md).

## Prérequis

- Bun ≥ 1.3
- Docker (PostgreSQL et Mailpit en local)

## Démarrage local

```bash
bun install                 # installe les dépendances et génère le client Prisma
cp .env.example .env.local  # puis renseigner BETTER_AUTH_SECRET (openssl rand -base64 32)
bun run services:up         # PostgreSQL (port 5433) + Mailpit (SMTP 1026, UI 8026)
bun run db:migrate          # applique les migrations
bun run dev                 # web → http://localhost:3000 · api → http://localhost:3001
```

| Service                  | URL                    |
| ------------------------ | ---------------------- |
| Application              | http://localhost:3000  |
| API (interne)            | http://localhost:3001  |
| Boîte mail Mailpit       | http://localhost:8026  |
| Prévisualisation emails  | http://localhost:3002 (`bun run dev:emails`) |

Les ports Docker peuvent être modifiés avec `CACHKEY_POSTGRES_PORT`, `CACHKEY_SMTP_PORT`
et `CACHKEY_MAILPIT_UI_PORT` (pensez à adapter `.env.local`).

## Variables d'environnement

Toutes les variables sont documentées dans [.env.example](.env.example). En local, un seul
fichier `.env.local` à la racine sert à l’API, au web et à Prisma ; en production, partir de
[.env.production.example](.env.production.example) (`.env.prod`). Ces fichiers réels ne sont
jamais commités.

| Variable                                    | Requis | Rôle                                                      |
| ------------------------------------------- | ------ | --------------------------------------------------------- |
| `APP_URL`                                   | oui    | Origine publique (liens des emails, base URL Better Auth) |
| `API_PORT` / `API_INTERNAL_URL`             | oui    | Port de l'API / URL utilisée par le web pour l'atteindre  |
| `DATABASE_URL`                              | oui    | Connexion PostgreSQL                                      |
| `BETTER_AUTH_SECRET`                        | oui    | Secret de signature (≥ 32 caractères)                     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | non    | Active la connexion Google                                |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | non    | Active la connexion GitHub                                |
| `EMAIL_PROVIDER`                            | non    | `smtp` (défaut) ou `resend`                               |
| `EMAIL_FROM`                                | non    | Expéditeur des emails                                     |
| `SMTP_*`                                    | non    | Serveur SMTP (Mailpit par défaut)                         |
| `RESEND_API_KEY`                            | si `resend` | Clé API Resend                                       |

### Configurer les fournisseurs OAuth

Un fournisseur n'est activé que si son identifiant **et** son secret sont définis ; les boutons
apparaissent alors automatiquement sur les pages de connexion et d'inscription.

**Google** — [Google Cloud Console › Identifiants](https://console.cloud.google.com/apis/credentials)

1. Créer un « ID client OAuth » de type _Application Web_.
2. Origine JavaScript autorisée : `http://localhost:3000`
3. URI de redirection autorisée : `http://localhost:3000/api/auth/callback/google`

**GitHub** — [Settings › Developer settings › OAuth Apps](https://github.com/settings/developers)

1. _New OAuth App_.
2. Homepage URL : `http://localhost:3000`
3. Authorization callback URL : `http://localhost:3000/api/auth/callback/github`

En production, remplacer `http://localhost:3000` par la valeur de `APP_URL`.

## Scripts

| Commande                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `bun run dev`             | Web + API en mode développement                    |
| `bun run dev:emails`      | Prévisualisation des templates React Email         |
| `bun run check`           | Format, lint, types, tests et contrats UI          |
| `bun run test`            | Tests unitaires (`bun test`)                       |
| `bun run build`           | Build de production (web et API)                   |
| `bun run typecheck`       | Vérification TypeScript de tous les packages       |
| `bun run lint`            | ESLint                                             |
| `bun run format`          | Prettier                                           |
| `bun run services:up/down`| Démarre / arrête PostgreSQL et Mailpit             |
| `bun run db:migrate`      | Crée / applique une migration (développement)      |
| `bun run db:deploy`       | Applique les migrations (production)               |
| `bun run db:studio`       | Prisma Studio                                      |
| `bun run icons:generate`  | Génère les composants d’icônes depuis `apps/web/public/icons` |

## Identité visuelle

L'interface suit le guide de marque Cachkey 1.0 : Geist / Geist Mono, encre `#1A1A1A`,
blanc chaud `#FFF5F3`, orange `#F97316` réservé aux actions prioritaires (libellé en encre).
Les logos sont les fichiers vectoriels officiels du kit (`apps/web/public/brand`), jamais retapés.
Les polices Geist sont distribuées sous licence SIL OFL 1.1 (`apps/web/public/fonts/LICENSE.txt`).
