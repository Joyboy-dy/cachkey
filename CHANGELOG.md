# Notes de version

Toutes les évolutions visibles de Cachkey. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions selon le
[versionnement sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Templates de déploiement : Dokploy (`deploy/templates/dokploy/cachkey/`, prêt pour leur
  catalogue) et Coolify (« Docker Compose Empty »), guide `docs/one-click-deployment.md`.

### Modifié

- `deploy/compose.yaml` utilise les images publiées, épinglées par défaut sur `0.1.0`, et
  fonctionne copié seul ; la construction depuis les sources passe par
  `deploy/compose.build.yaml`.

### Corrigé

- Le conteneur web reçoit `APP_URL` : l'en-tête HSTS s'active en HTTPS.
- Template Dokploy : le service web s'appelle désormais `cachkey` (convention du catalogue
  Dokploy). Sur un déploiement manuel existant, rattachez le domaine au service `cachkey`.

## [0.1.0] — 2026-10-14

Première version publique.

### Ajouté

- Comptes : inscription par email (avec confirmation), Google ou GitHub ; mot de passe
  oublié ; profil et avatar ; appareils connectés et déconnexion à distance.
- Organisations : rôles propriétaire, administrateur et membre ; invitations par email ou
  par lien ; transmission de la propriété.
- Projets avec environnements (`development`, `staging`, `production` par défaut) et
  variables chiffrées (AES-256-GCM, une clé par projet) ; import et export `.env` ;
  historique des valeurs et restauration.
- Accès par projet en lecture ou écriture, limitable à certains environnements.
- Journal d'activité filtrable (consultations, modifications, projets et environnements,
  membres et accès).
- Vue d'ensemble : projets, points à surveiller, activité des 14 derniers jours.
- Jetons d'accès en lecture seule, limités à un environnement, avec expiration.
- API publique `/api/v1` (lecture des variables) documentée en OpenAPI.
- CLI `cachkey` : connexion par le navigateur, `init`, `link`, gestion des variables,
  `pull` vers `.env.<environnement>`, `run`.
- Auto-hébergement : images Docker (amd64, arm64), Docker Compose, migrations au démarrage.
- Documentation utilisateur dans `docs/`.
- Licence AGPL-3.0-only.

### Sécurité

- Limitation des tentatives de connexion : l'adresse du visiteur ne peut plus être falsifiée
  par l'en-tête `X-Forwarded-For`.
- En-têtes de sécurité sur toutes les réponses (pas d'affichage dans un cadre, `nosniff`,
  `Referrer-Policy`, HSTS en HTTPS).
- Redirections après connexion : les chemins contenant des caractères de contrôle ou `\`
  sont refusés.
- Avertissement contre l'hameçonnage sur la page d'autorisation d'un terminal.
- Dépendances : plus aucune vulnérabilité connue (`bun audit`).

[Non publié]: https://github.com/Joyboy-dy/cachkey/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Joyboy-dy/cachkey/releases/tag/v0.1.0
