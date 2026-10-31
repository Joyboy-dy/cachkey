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
| `/`                | tous      | Redirige vers `/dashboard` ou `/sign-in`                        |
| `/sign-in`         | invité    | Email + mot de passe, Google, GitHub                            |
| `/two-factor`      | invité    | Second facteur après le mot de passe (code ou code de secours)  |
| `/sign-up`         | invité    | Création de compte                                              |
| `/forgot-password` | invité    | Demande de lien de réinitialisation                             |
| `/check-email`     | invité    | Confirmation d'envoi (`reason=verify` ou `reset`) + renvoi      |
| `/verify-email`    | tous      | Arrivée du lien de vérification (succès ou `?error=`)           |
| `/reset-password`  | tous      | Saisie du nouveau mot de passe (`?token=`) ou lien invalide     |
| `/onboarding`      | connecté  | Créer ou choisir une organisation (si aucune n'est active)      |
| `/dashboard`       | connecté  | Vue d'ensemble (`/welcome` y redirige)                          |
| `/projects`        | connecté  | Projets de l'organisation active ; `/projects/$slug` : détail   |
| `/organization`    | connecté  | Nom, membres et rôles, quitter / supprimer l'organisation       |
| `/account`         | connecté  | Profil : avatar, nom, email, suppression du compte              |
| `/account/security`| connecté  | Mot de passe, double authentification, méthodes de connexion    |
| `/account/sessions`| connecté  | Appareils connectés et révocation                               |

Les pages invité redirigent vers `/dashboard` (ou `?redirect=`) si une session existe.
Les pages protégées (layout `_authenticated`) redirigent vers `/sign-in?redirect=<chemin>`,
puis vers `/onboarding` tant qu'aucune organisation n'est active.
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

**Double authentification** — plugin `twoFactor` (TOTP + codes de secours, table
`two_factors`). Si le compte l'a activée, `signIn.email` ne crée pas de session : il renvoie
`twoFactorRedirect` et pose un cookie de 10 minutes ; `/sign-in` mène alors à `/two-factor`
(en gardant `?redirect=`), qui appelle `twoFactor.verifyTotp` ou `twoFactor.verifyBackupCode`
(option `trustDevice` : 30 jours). Activation depuis `/account/security` : `twoFactor.enable`
(mot de passe) → QR code (`otpauth://`, rendu local avec `uqr`) → `twoFactor.verifyTotp`
(passe `twoFactorEnabled` à vrai) → codes de secours affichés une fois. `twoFactor.disable` et
`twoFactor.generateBackupCodes` demandent le mot de passe. Chaque activation, désactivation et
renouvellement envoie un email (hooks dans `auth.ts`). Les connexions Google / GitHub ne
passent pas par le second facteur (confiance au fournisseur). Le nom affiché par l'application
d'authentification (`issuer`) est « Cachkey » en production et « Cachkey (dev) » en
développement ou sur une adresse locale (`apps/api/src/two-factor-issuer.ts`), pour ne jamais
confondre les codes d'une instance de test avec ceux de la production.

**OAuth (Google, GitHub)** — `signIn.social` ; en cas d'échec Better Auth revient sur la page
d'origine avec `?error=`, traduit par `getOAuthErrorMessage`. Les comptes OAuth sont liés
automatiquement à un compte existant de même email (fournisseurs de confiance).

**Mot de passe oublié** — `requestPasswordReset` (réponse identique que le compte existe ou
non) → email → `/api/auth/reset-password/:token` → `/reset-password?token=…` →
`resetPassword` → toutes les sessions sont révoquées, un email de confirmation est envoyé →
`/sign-in?reset=success`.

**Déconnexion** — `signOut`, purge du cache de session, retour à `/sign-in`.

**Changement d'email** — `changeEmail` (compte vérifié) → lien envoyé à l'adresse actuelle →
lien de vérification envoyé à la nouvelle → mise à jour. Retour sur `/account?email=confirmed`
(ou `?error=`). Une adresse déjà utilisée reçoit la même réponse (pas d'énumération).

**Mot de passe** — `changePassword` (option `revokeOtherSessions`) ; un email de notification
est envoyé (hook `after` dans `auth.ts`). Les comptes sans mot de passe (Google / GitHub)
utilisent `POST /api/account/set-password` (Elysia, `auth.api.setPassword` étant réservé au
serveur).

**Méthodes de connexion** — `listAccounts`, `linkSocial` (retour sur
`/account/security?linked=1` ou `?error=`), `unlinkAccount` ; la dernière méthode ne peut pas
être retirée. Ces actions demandent une session récente (moins d'un jour).

**Sessions** — `listSessions`, `revokeSession`, `revokeOtherSessions`. Le navigateur et le
système sont déduits du user-agent (`lib/user-agent.ts`), jamais affichés bruts.

**Suppression** — `deleteUser` envoie un lien (1 h) ; son ouverture supprime le compte et
redirige vers `/sign-in?deleted=1`.

## Règles

- Mot de passe : 10 à 128 caractères (`packages/shared/src/auth-schemas.ts`, aligné sur la
  configuration Better Auth).
- Sessions : 7 jours, prolongées toutes les 24 h d'activité. Cookies `httpOnly`, `Secure`
  automatiquement lorsque `APP_URL` est en HTTPS.
- Liens de vérification, de réinitialisation, de changement d'email et de suppression :
  1 heure.
- Rate limiting : stocké en base (`rate_limits`), 100 requêtes / min par IP et par route,
  3 à 5 / min pour les actions sensibles, 3 / 10 s sur `/two-factor/*` ; 10 codes faux
  d'affilée bloquent le compte 15 minutes. Le serveur web transmet l'IP cliente
  (`x-forwarded-for`), y compris pour la lecture de session côté serveur.
- Avatar : DiceBear généré localement (`lib/avatar.ts`), style « Clay » uniquement ; seule la
  graine est stockée (`avatarSeed`, l'id de l'utilisateur par défaut). Les organisations
  utiliseront « Shape Grid ». L'image fournie par Google / GitHub n'est pas utilisée.
- Formulaires : soumission désactivée avant l'hydratation et repli natif en `POST`, pour qu'aucun
  identifiant ne puisse se retrouver dans une URL.
- Les erreurs serveur ne sont jamais affichées brutes : les codes Better Auth sont traduits
  (`apps/web/src/lib/auth/errors.ts`).

## Emails

`packages/emails` contient les templates React Email (vérification, réinitialisation, mot de
passe modifié / ajouté, double authentification activée / désactivée / codes renouvelés,
confirmation de changement d'email, suppression de compte) et deux transports implémentant `EmailTransport` :

- `smtp` (nodemailer) — Mailpit en développement, ou tout relais SMTP ;
- `resend` — API HTTP Resend, sélectionné avec `EMAIL_PROVIDER=resend`.

L'API choisit le transport au démarrage (`apps/api/src/email.ts`). Un échec d'envoi est journalisé
sans interrompre le parcours ; l'utilisateur peut redemander un email.
