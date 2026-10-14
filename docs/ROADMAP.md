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
- `deploy/compose.dev.yaml` : PostgreSQL + Mailpit pour le développement local.
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

## Phase 5 — Collaboration & permissions ✅

- Invitations par email (plugin organization de Better Auth) : rôle administrateur ou membre,
  validité 7 jours, renvoi et annulation, page `/invitation/:id` (accepter / refuser, adresse
  vérifiée), invitations reçues affichées à l'onboarding.
- Permissions par projet et par environnement (`ProjectAccess`) : propriétaires et
  administrateurs gèrent tout ; un membre ne voit que les projets partagés avec lui, en lecture
  (afficher, copier, exporter) ou en lecture et écriture, sur tous les environnements ou une
  sélection. Un projet ou environnement non partagé répond 404. Accès retirés quand la
  personne quitte l'organisation ou devient administrateur.
- Journal d'audit (`AuditEvent`, `apps/api/src/audit.ts`) : chaque affichage ou export de
  valeur, chaque modification de variable, d'environnement, de projet, d'accès et de membre,
  avec auteur, projet, environnement, adresse IP et date. Page « Activité » filtrable par type
  et par projet, pagination par curseur. Aucune valeur secrète n'y est jamais écrite.

## Phase 6 — Accès programmatique ✅

- Jetons de service (machine tokens) à portée limitée.
- API publique documentée (OpenAPI via Elysia).
- CLI `cachkey` (pull / run avec injection des variables).

## Phase 7 — Self-hosting & distribution ✅

- Dockerfiles de production (web, api) multi-stage, images publiées sur GHCR.
- `docker-compose.yml` de production, migrations automatiques au démarrage.
- Configuration par variables d'environnement, healthchecks.
- CI GitHub Actions (lint, types, tests, build, publication des images).

## Phase 8 — Version publiable ✅

- Tests e2e des parcours critiques ✅ (`e2e/`, Playwright, en CI) ; revue de sécurité ✅.
- Documentation dans le dépôt, en Markdown (pas de projet séparé) : `docs/` organisé par
  besoin — démarrage, projets et variables, équipe et accès, jetons d'accès, CLI (référence
  complète), API publique, auto-hébergement, sécurité. Lisible par les utilisateurs comme par
  les agents IA ; un skill de projet encadre sa création, sa mise à jour et sa cohérence
  avec le code. ✅ (`docs/README.md`, skill `.agents/skills/cachkey-docs`)
- CONTRIBUTING, SECURITY.md, versionnement sémantique, notes de version (`CHANGELOG.md`) ✅
  (licence : AGPL-3.0-only, adoptée).
- Plus tard (avec un nom de domaine) : page d'accueil et documentation publique générées
  depuis ces mêmes fichiers.

---

## Journal

- **2026-10-14** — Phase 8, revue de sécurité. Corrigé : IP du visiteur lue dans la partie
  falsifiable de `X-Forwarded-For` (contournement de la limite de tentatives, vérifié : 429
  malgré une adresse inventée) ; aucun en-tête de sécurité (ajoutés au serveur de production :
  `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS en HTTPS) ; redirection ouverte via `/	/…` dans
  `safeRedirectPath` ; contrôle de chemin des fichiers statiques ; avertissement anti-hameçonnage
  sur `/device` ; `next`, `mysql2`, `deepmerge-ts` (outils de développement et CLI Prisma) mis à
  jour par `overrides`. Vérifié sans défaut : cloisonnement organisation / projet /
  environnement (404 sur ce qui n'est pas visible), recherche des variables et jetons par
  projet, empreinte SHA-256 des jetons, liaison AAD des valeurs, CSRF (cookies `SameSite=Lax`,
  origine vérifiée), révocation des sessions au changement de mot de passe, fichiers `.env` de
  la CLI en 600. Corrigé aussi : « Premiers pas » réserve sa hauteur en bas des pages,
  « Nouveau projet » de la vue d'ensemble ouvre la création.
- **2026-10-14** — Phase 8, tests e2e (Playwright 1.61, `e2e/`, `bun run e2e`, job CI) : compte
  (inscription, email Mailpit, organisation, déconnexion, reconnexion, mauvais mot de passe),
  variables (création, masquage, affichage, modification, historique, import), accès (invitation,
  lecture limitée à un environnement, refus d'écriture, `production` invisible, journal et jetons
  réservés), CLI réelle (connexion par code, `set`/`get`/`run`, `logout`) et jetons (API
  publique, `pull`, lecture seule, révocation immédiate, valeurs absentes du journal). Constaté :
  la carte « Premiers pas » dépliée masque les dernières lignes d'une page courte ; « Nouveau
  projet » de la vue d'ensemble n'ouvre pas la création.
- **2026-10-14** — Phase 8, documentation : `docs/` organisé par besoin (démarrage, projets
  et variables, équipe et accès, jetons d'accès, CLI, API publique, sécurité, index), chaque
  chiffre et option vérifiés dans le code. Skill `cachkey-docs` (carte page ↔ code,
  vérifications de cohérence). `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`. Restent :
  tests e2e et revue de sécurité.
- **2026-10-14** — Licence adoptée : GNU AGPL v3.0 (`AGPL-3.0-only`), texte officiel dans
  `LICENSE`, copyright © 2026 Félicio de SOUZA. Identifiant SPDX dans les `package.json` et
  les métadonnées OCI des images. Licences tierces (polices Geist, motifs visx) inchangées.
- **2026-10-14** — Fichiers de déploiement regroupés dans `deploy/` (`Dockerfile`,
  `Dockerfile.dockerignore`, `api-entrypoint.sh`, `compose.yaml`, `compose.dev.yaml`).
  Vérifié : build et démarrage via `deploy/compose.yaml`, aucun `.env` dans le contexte de
  build, services de développement inchangés. Phase 8 : documentation décidée dans le dépôt.
- **2026-10-14** — Phase 7 terminée : `Dockerfile` multi-étapes (cibles `api` et `web`,
  bundles autonomes sans node_modules, utilisateur non-root, healthchecks), migrations au
  démarrage de l'API, `compose.yaml` de production, CI GitHub Actions (vérifications, build,
  images) et publication GHCR multi-architecture, guide `docs/self-hosting.md`. Vérifié en
  réel : images construites, pile démarrée (postgres → api → web sains), 9 migrations
  appliquées puis aucune au redémarrage, inscription + email + vérification + organisation +
  projet + variable chiffrée + jeton + CLI à travers les conteneurs ; `bun run check` dans
  un conteneur Linux. Non vérifié : exécution réelle des workflows sur GitHub.
- **2026-10-14** — « Premiers pas » disponible sur toutes les pages (tant qu'il reste des étapes),
  animation légère à rebond. Activité récente en panneau latéral détaché (xl+) ou en bottom
  sheet (poignée en bas d'écran), état vide illustré.
- **2026-10-14** — Vue d'ensemble repensée : projets avec leurs compteurs (environnements,
  variables, variables sans valeur, dernière modification), « À surveiller » (jetons qui
  expirent, invitations en attente), activité des 14 derniers jours (graphique Bklit),
  dernières actions, démarrage depuis le terminal. « Premiers pas » devient une carte
  flottante (repliable, masquable 3 jours). « Mon compte » quitte la barre latérale pour le
  menu de l'avatar (profil, sécurité, appareils). Manifeste web ajouté.
- **2026-10-14** — CLI : `init` (crée le projet du dossier et s'y lie), `projects create`,
  `envs create` ; `pull` écrit `.env.<environnement>` à la racine du projet, plusieurs
  environnements avec `--env a,b` ou `--all`, avertit si le fichier n'est pas ignoré par Git.
- **2026-10-14** — CLI façon `gh` : `cachkey login` (code validé dans le navigateur sur
  `/device`, session propre au terminal, visible et révocable dans Appareils), `link`
  (`.cachkey.json` sans secret), `orgs`, `projects`, `envs`, `secrets`, `get`, `set` (saisie
  masquée), `rm` (confirmation), `import`, `pull`, `run`, `logout`. Mêmes droits que
  l'utilisateur ; actions marquées « en ligne de commande » dans le journal. Vérifié en
  réel : connexion, lecture, ajout, modification, import, suppression, déconnexion (session
  révoquée, 401).
- **2026-10-14** — Phase 6 terminée : jetons d'accès (lecture seule, un environnement,
  expiration, haché en base, affiché une seule fois, révocation), API publique `/api/v1`
  documentée (OpenAPI + Scalar sur `/api/v1/docs`), CLI `cachkey` (`pull`, `run`, `whoami`),
  lectures par jeton dans le journal d'activité. Variables vides signalées « Aucune valeur »
  même masquées. Vérifié : format, lint, types, tests, build ; en réel (API + CLI +
  navigateur) : création, lecture JSON / .env, jeton invalide ou révoqué refusé (401),
  `run` (variables injectées, code de sortie transmis), 320 px et thème sombre.
- **2026-10-14** — Phase 5 terminée. Vérifié : format, lint, types, tests, build ; en réel
  (API + Mailpit + navigateur) : invitation (email reçu, détails refusés à une autre adresse,
  acceptation), membre sans accès (liste vide, 404), accès en lecture limité à un
  environnement (autres environnements 404, écriture 403, journal 403), journal des
  consultations et des changements de rôle, interface en lecture seule.
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
