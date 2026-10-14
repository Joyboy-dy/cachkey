# Authentification

L'authentification repose sur [Better Auth](https://www.better-auth.com), monté dans l'API
Elysia (`apps/api/src/auth.ts`) et stocké dans PostgreSQL via l'adaptateur Prisma.

## Topologie

```
Navigateur ──▶ apps/web (TanStack Start, APP_URL)
                 ├─ pages SSR (gardes de routes)
                 └─ /api/*  ──proxy──▶ apps/api (Elysia, API_INTERNAL_URL)
                                         └─ /api/auth/* → Better Auth → PostgreSQL
```

- Le proxy (`apps/web/src/server/api.ts`) transmet les cookies, l'IP cliente (`x-forwarded-for`,
  utilisée par le rate limiting de Better Auth) et renvoie les `Set-Cookie`.
- Les gardes SSR lisent la session via une server function (`apps/web/src/lib/auth/session.ts`)
  qui appelle `GET /api/auth/get-session` avec les cookies de la requête, et propagent un
  éventuel cookie de session rafraîchi.
- La session est mise en cache par TanStack Query (clé `["auth","session"]`, 60 s) et vidée à
  chaque connexion / déconnexion / réinitialisation.

## Routes

| Route              | Accès     | Rôle                                                            |
| ------------------ | --------- | --------------------------------------------------------------- |
| `/`                | tous      | Redirige vers `/welcome` ou `/sign-in`                          |
| `/sign-in`         | invité    | Email + mot de passe, Google, GitHub                            |
| `/sign-up`         | invité    | Création de compte                                              |
| `/forgot-password` | invité    | Demande de lien de réinitialisation                             |
| `/check-email`     | invité    | Confirmation d'envoi (`reason=verify` ou `reset`) + renvoi      |
| `/verify-email`    | tous      | Arrivée du lien de vérification (succès ou `?error=`)           |
| `/reset-password`  | tous      | Saisie du nouveau mot de passe (`?token=`) ou lien invalide     |
| `/welcome`         | connecté  | Page de bienvenue temporaire                                    |

Les pages invité redirigent vers `/welcome` (ou `?redirect=`) si une session existe.
Les pages protégées (layout `_authenticated`) redirigent vers `/sign-in?redirect=<chemin>`.
Le paramètre `redirect` n'accepte que des chemins relatifs (`safeRedirectPath`) pour éviter
les redirections ouvertes.

## Parcours

**Inscription** — `signUp.email` → Better Auth crée le compte non vérifié et envoie l'email de
vérification → `/check-email`. Si l'adresse existe déjà, la réponse est identique (pas
d'énumération des comptes).

**Vérification** — le lien `…/api/auth/verify-email?token=…&callbackURL=/verify-email` valide
l'adresse, ouvre une session (`autoSignInAfterVerification`) puis redirige vers `/verify-email`.
Lien expiré (1 h) ou invalide → `/verify-email?error=…` avec formulaire de renvoi.

**Connexion** — `signIn.email`. Compte non vérifié → Better Auth renvoie un lien
(`sendOnSignIn`) et l'utilisateur est dirigé vers `/check-email`. Ce lien utilise le callback
par défaut `/`, qui transmet une éventuelle erreur à `/verify-email`.

**OAuth (Google, GitHub)** — `signIn.social` ; en cas d'échec Better Auth revient sur la page
d'origine avec `?error=`, traduit par `getOAuthErrorMessage`. Les comptes OAuth sont liés
automatiquement à un compte existant de même email (fournisseurs de confiance).

**Mot de passe oublié** — `requestPasswordReset` (réponse identique que le compte existe ou
non) → email → `/api/auth/reset-password/:token` → `/reset-password?token=…` →
`resetPassword` → toutes les sessions sont révoquées, un email de confirmation est envoyé →
`/sign-in?reset=success`.

**Déconnexion** — `signOut`, purge du cache de session, retour à `/sign-in`.

## Règles

- Mot de passe : 10 à 128 caractères (`packages/shared/src/auth-schemas.ts`, aligné sur la
  configuration Better Auth).
- Sessions : 7 jours, prolongées toutes les 24 h d'activité. Cookies `httpOnly`, `Secure`
  automatiquement lorsque `APP_URL` est en HTTPS.
- Liens de vérification et de réinitialisation : 1 heure, usage unique.
- Formulaires : soumission désactivée avant l'hydratation et repli natif en `POST`, pour qu'aucun
  identifiant ne puisse se retrouver dans une URL.
- Les erreurs serveur ne sont jamais affichées brutes : les codes Better Auth sont traduits
  (`apps/web/src/lib/auth/errors.ts`).

## Emails

`packages/emails` contient les templates React Email (vérification, réinitialisation, mot de
passe modifié) et deux transports implémentant `EmailTransport` :

- `smtp` (nodemailer) — Mailpit en développement, ou tout relais SMTP ;
- `resend` — API HTTP Resend, sélectionné avec `EMAIL_PROVIDER=resend`.

L'API choisit le transport au démarrage (`apps/api/src/email.ts`). Un échec d'envoi est journalisé
sans interrompre le parcours ; l'utilisateur peut redemander un email.
