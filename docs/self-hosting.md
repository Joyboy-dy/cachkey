# Auto-héberger Cachkey

Cachkey se déploie avec Docker Compose (fichiers dans `deploy/`) : trois conteneurs (web, API,
PostgreSQL), une seule adresse publique. Cachkey est distribué sous [AGPL-3.0](../LICENSE) : si
vous modifiez le code d'une instance ouverte à d'autres personnes, publiez ces modifications.

## Prérequis

- Un serveur avec Docker 24+ et le plugin Compose.
- Un nom de domaine et un reverse proxy TLS (Caddy, Traefik, nginx…). Les cookies de session
  sont sécurisés dès que `APP_URL` est en HTTPS.
- Un moyen d'envoyer des emails : Resend ou un serveur SMTP (confirmation d'adresse,
  invitations, réinitialisation de mot de passe).

## Installation

```bash
git clone https://github.com/Joyboy-dy/cachkey.git && cd cachkey
cp .env.production.example .env.prod
```

Remplissez `.env.prod` (le fichier n'est jamais commité) :

| Variable             | Comment l'obtenir                                                  |
| -------------------- | ------------------------------------------------------------------ |
| `APP_URL`            | L'adresse publique, par ex. `https://cachkey.example.com`          |
| `POSTGRES_PASSWORD`  | `openssl rand -hex 24`                                             |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`                                          |
| `ENCRYPTION_KEY`     | `openssl rand -base64 32` — **à sauvegarder hors du serveur**      |
| `EMAIL_PROVIDER`…    | `resend` + `RESEND_API_KEY`, ou `smtp` + `SMTP_*`                  |
| `CACHKEY_VERSION`    | Une version publiée (`1.0.0`) plutôt que `latest` en production    |

Puis :

```bash
docker compose -f deploy/compose.yaml --env-file .env.prod up -d
```

Au démarrage, l'API applique les migrations de base de données en attente, puis démarre. Le
web n'écoute que sur `127.0.0.1:3000` (modifiable avec `CACHKEY_PORT`) : faites pointer votre
reverse proxy dessus. L'API et PostgreSQL ne sont pas exposés.

Le reverse proxy doit transmettre l'adresse du visiteur dans `X-Forwarded-For` (Caddy le fait
par défaut ; nginx : `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`). Cachkey
s'en sert pour limiter les tentatives de connexion. N'exposez pas le port web sans proxy.

Exemple avec Caddy :

```
cachkey.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

## Mettre à jour

```bash
# Changez CACHKEY_VERSION dans .env.prod, puis :
docker compose -f deploy/compose.yaml --env-file .env.prod pull
docker compose -f deploy/compose.yaml --env-file .env.prod up -d
```

Les migrations de la nouvelle version s'appliquent au redémarrage de l'API. Pour les gérer
vous-même, définissez `CACHKEY_SKIP_MIGRATIONS=true` dans l'environnement de l'API.

## Sauvegarder

Deux éléments, indissociables :

1. **La base** : `docker compose -f deploy/compose.yaml --env-file .env.prod exec postgres pg_dump -U cachkey cachkey > cachkey.sql`
2. **`ENCRYPTION_KEY`** : toutes les valeurs sont chiffrées avec cette clé. Une base sans sa
   clé est illisible ; ne la changez jamais sans plan de rechiffrement.

## Construire les images soi-même

```bash
docker compose -f deploy/compose.yaml -f deploy/compose.build.yaml --env-file .env.prod build
docker compose -f deploy/compose.yaml -f deploy/compose.build.yaml --env-file .env.prod up -d
```

Les images publiées sont `ghcr.io/joyboy-dy/cachkey-api` et `ghcr.io/joyboy-dy/cachkey-web`
(amd64 et arm64). Les versions `x.y.z` suivent les tags Git `vx.y.z` ; `main` suit la branche
principale. Par défaut, `deploy/compose.yaml` utilise la dernière version publiée
(`CACHKEY_VERSION`, actuellement `0.1.0`).

Dokploy, Coolify et autres plateformes : voir [Déploiement en un clic](one-click-deployment.md).

## Dépannage

- `docker compose -f deploy/compose.yaml --env-file .env.prod ps` : chaque service doit être `healthy`.
- `docker compose -f deploy/compose.yaml --env-file .env.prod logs api` : une variable manquante ou invalide est
  signalée au démarrage, avec son nom.
- Les emails n'arrivent pas : vérifiez `EMAIL_PROVIDER` et ses identifiants. En attendant, les
  invitations peuvent être partagées par lien depuis la page Organisation.
