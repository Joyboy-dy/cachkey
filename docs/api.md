# API publique

L'API publique (`/api/v1`) donne aux serveurs et aux scripts un accès **en lecture** aux
variables d'un environnement, avec un [jeton d'accès](access-tokens.md).

La référence interactive (OpenAPI, essais en direct) est servie par chaque instance sur
`https://<votre-instance>/api/v1/docs`, et le schéma brut sur `/api/v1/docs/json`.

## Authentification

Chaque requête envoie le jeton dans l'en-tête `Authorization` :

```
Authorization: Bearer ck_…
```

Un jeton absent, inconnu, révoqué ou expiré reçoit `401` avec
`{ "code": "INVALID_TOKEN", "message": "INVALID_TOKEN" }`. Les réponses portent
`Cache-Control: no-store`.

## `GET /api/v1/token`

Décrit le jeton : son nom, son expiration, l'organisation, le projet, l'environnement et la
brique auxquels il donne accès. Ne lit aucune valeur.

```json
{
  "name": "CI production",
  "expiresAt": "2027-01-12T09:00:00.000Z",
  "organization": { "id": "…", "name": "Acme" },
  "project": { "id": "…", "name": "Mon API", "slug": "mon-api" },
  "environment": { "id": "…", "name": "production", "slug": "production" },
  "brick": { "id": "…", "name": "Principale", "slug": "principale" }
}
```

## `GET /api/v1/secrets`

Toutes les variables de l'environnement du jeton, avec leurs valeurs : les variables
partagées du projet, puis celles de la brique du jeton, qui l'emportent à nom égal.

| Paramètre | Valeurs                                         |
| --------- | ----------------------------------------------- |
| `format`  | `json` (par défaut) ou `dotenv` (fichier `.env`) |

```bash
curl -H "Authorization: Bearer $CACHKEY_TOKEN" https://cachkey.example.com/api/v1/secrets
```

```json
{
  "organization": { "id": "…", "name": "Acme" },
  "project": { "id": "…", "name": "Mon API", "slug": "mon-api" },
  "environment": { "id": "…", "name": "production", "slug": "production" },
  "brick": { "id": "…", "name": "Principale", "slug": "principale" },
  "secrets": { "DATABASE_URL": "postgres://…", "STRIPE_KEY": "sk_live_…" }
}
```

Avec `format=dotenv`, la réponse est du texte (`text/plain`) prêt à écrire dans un `.env`.
Chaque appel est noté dans le journal d'activité de l'organisation, au nom du jeton (jamais
les valeurs).

## Ce que l'API ne fait pas

L'API publique est en lecture seule et limitée à un environnement par jeton. Pour créer ou
modifier des variables depuis un script, utilisez la [CLI](cli.md) connectée à un compte.
Les autres routes de l'instance (`/api/projects`, `/api/auth`…) servent l'application web et
ne sont pas un contrat stable.
