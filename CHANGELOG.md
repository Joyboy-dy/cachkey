# Notes de version

Toutes les évolutions visibles de Cachkey. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions selon le
[versionnement sémantique](https://semver.org/lang/fr/).

## [Non publié]

Première version en préparation.

### Ajouté

- Comptes : inscription par email (avec confirmation), Google ou GitHub ; mot de passe
  oublié ; profil et avatar ; appareils connectés et déconnexion à distance.
- Organisations : rôles propriétaire, administrateur et membre ; invitations par email ou
  par lien ; transmission de la propriété.
- Projets avec environnements (`development`, `staging`, `production` par défaut) et
  variables chiffrées (AES-256-GCM, une clé par projet) ; import et export `.env` ;
  historique des valeurs et restauration.
- Accès par projet en lecture ou écriture, limitable à certains environnements.
- Journal d'activité filtrable (lectures, modifications, structure, personnes).
- Vue d'ensemble : projets, points à surveiller, activité des 14 derniers jours.
- Jetons d'accès en lecture seule, limités à un environnement, avec expiration.
- API publique `/api/v1` (lecture des variables) documentée en OpenAPI.
- CLI `cachkey` : connexion par le navigateur, `init`, `link`, gestion des variables,
  `pull` vers `.env.<environnement>`, `run`.
- Auto-hébergement : images Docker (amd64, arm64), Docker Compose, migrations au démarrage.
- Documentation utilisateur dans `docs/`.
- Licence AGPL-3.0-only.
