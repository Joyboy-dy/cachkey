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

## Phase 2 — Shell applicatif & compte utilisateur ✅

- Shell : sidebar repliable (état mémorisé), top bar avec fil d'Ariane, zone de contenu.
- Pages : vue d'ensemble (premiers pas), projets (état vide), mon compte (Profil, Sécurité, Appareils).
- Profil : nom, avatar DiceBear « Clay » (propositions, rendu local), changement d'email avec
  double confirmation (ancienne puis nouvelle adresse).
- Mot de passe : modification (option « déconnecter les autres appareils »), ajout d'un mot de
  passe pour les comptes créés via Google / GitHub (`POST /api/account/set-password`).
- Méthodes de connexion : relier / dissocier Google et GitHub (jamais la dernière méthode).
- Appareils connectés : liste lisible, déconnexion d'un appareil ou de tous les autres.
- Suppression de compte confirmée par email.
- Rate limiting Better Auth persistant en base (`rate_limits`, sans Redis), règles renforcées
  sur les actions sensibles.
- Icônes : Hugeicons (`components/ui/icon.tsx`) partout, hors logos de marque.
- Thème : suit l'appareil par défaut ; bouton soleil / lune dans la top bar du dashboard
  (bascule directe, choix mémorisé en cookie, appliqué avant l'affichage, fondu via View
  Transitions).

## Phase 3 — Organisations & projets ✅

- Organisations via le plugin `organization` de Better Auth (tables `organizations`,
  `members`, `invitations`, organisation active sur la session). Avatar DiceBear « Shape Grid ».
- Onboarding (`/onboarding`) : création de la première organisation ou choix parmi les siennes ;
  le dashboard exige une organisation active. À chaque connexion, la première organisation est
  activée automatiquement.
- Sélecteur d'organisation dans la sidebar (changement, création).
- Page Organisation : nom, membres et rôles (changement de rôle, retrait), quitter, supprimer.
- Rôles : propriétaire et administrateur gèrent l'organisation et les projets, membre en lecture.
  Contrôlés côté API (`apps/api/src/workspace.ts`).
- Projets : CRUD (`/api/projects`), identifiant d'URL unique par organisation et stable au
  renommage, liste, détail, paramètres, suppression confirmée par le nom.

## Phase 4 — Environnements & secrets ✅

- Environnements par projet : `development`, `staging` et `production` créés avec chaque
  projet (et ajoutés aux projets existants par migration), puis création, renommage et
  suppression par les propriétaires et administrateurs (20 au plus par projet).
- Chiffrement au repos par enveloppe (`apps/api/src/crypto.ts`) : la clé maître de l'instance
  (`ENCRYPTION_KEY`) ne chiffre que la clé de données de chaque projet ; chaque valeur est
  chiffrée en AES-256-GCM avec cette clé, un IV aléatoire et des données associées qui la lient
  à son environnement.
- Variables (`/api/projects/:slug/environments/:env/secrets`) : liste sans valeurs, création,
  modification, suppression, révélation explicite, copie. Les réponses portent
  `Cache-Control: no-store`. Tous les membres lisent et modifient les variables.
- Import `.env` (fichier ou collage, remplacement optionnel, lignes illisibles signalées) et
  export `.env` ; lecteur compatible dotenv dans `packages/shared/src/dotenv.ts`.
- Historique : chaque changement de valeur crée une version, consultable, révélable et
  restaurable (la restauration crée une nouvelle version).

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

- **2026-10-14** — Refonte UX projets / environnements / variables : onglets Variables et
  Paramètres, sélecteur d'environnement, liste pensée pour des centaines de variables (barre
  d'outils collante, recherche « / », tri, affichage progressif, valeurs longues repliées),
  import avec aperçu et défilement maîtrisé (fichiers `.env.example` acceptés), boutons
  d'enregistrement actifs seulement sur un changement valide, suppressions par dialogue
  (saisie de confirmation, maintien du bouton pour l'organisation et le compte).
- **2026-10-14** — Phase 4 terminée. Vérifié : format, lint, types, tests (chiffrement,
  lecteur `.env`), build ; en réel (API + navigateur) : environnements par défaut et migration
  des projets existants, ajout / doublon refusé / nom invalide refusé, import avec ligne
  illisible, versions et restauration, export, révélation, valeurs chiffrées en base,
  `no-store`, accès refusé sans session, 320 px et thèmes clair et sombre.
- **2026-10-14** — Phase 3 terminée. Vérifié : format, lint, types, tests, build ; en réel
  (API + navigateur) : onboarding, création / changement / suppression d'organisation, CRUD
  projets (identifiants uniques, validation, 404), rôles (membre refusé en écriture : 403,
  administrateur autorisé, changement de rôle depuis l'interface), 320 px. Non couvert : ajout
  de membres par invitation (phase 5).
- **2026-10-14** — Phase 2 terminée. Vérifié : format, lint, types, tests, build ; en réel
  (API + Mailpit + navigateur) : avatar, nom, changement d'email en deux étapes, modification
  et ajout de mot de passe (emails de notification), liste et révocation des sessions,
  suppression de compte, rate limiting en base (429). Non testé en réel : relier / dissocier
  Google et GitHub (identifiants OAuth requis).
- **2026-10-14** — Audit via les skills projet (`.agents/skills`) : contrastes WCAG des champs et du focus, accessibilité des formulaires, responsive 320 px, tests unitaires, `bun run check`, règles d’environnement (`.env.local`, `.env.production.example`), `AGENTS.md` et `.agents/rules/`.
- **2026-10-14** — Refonte des pages d’authentification : mise en page centrée, fond « cipher field » animé (canvas, sans dépendance), logo au-dessus du formulaire, révélation des caractères au survol.
- **2026-10-12** — Phases 0 et 1 réalisées : fondation monorepo et authentification complète.
  Vérifié : format, lint, types, build (web + API) ; parcours inscription → email → vérification
  → bienvenue, connexion / erreurs / déconnexion, gardes de routes, mot de passe oublié →
  réinitialisation → révocation des sessions, liens invalides, anti-énumération.
  Non testé en réel : Google et GitHub (nécessitent des identifiants OAuth) et l'envoi via Resend.
