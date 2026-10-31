# Déploiement en un clic (one-click deployment)

Cachkey s'installe avec Docker Compose, directement ou depuis une plateforme qui sait en
lancer (Dokploy, Coolify…). Les images sont publiques : `ghcr.io/joyboy-dy/cachkey-api` et
`ghcr.io/joyboy-dy/cachkey-web`, pour amd64 et arm64, épinglées sur la version `0.2.0`.

## Trois niveaux de disponibilité

| Niveau                         | Ce que cela veut dire                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| **Catalogue officiel**         | Cachkey apparaît dans la liste de modèles de la plateforme : on le cherche et on le déploie. |
| **Template importable**        | Un fichier fourni par Cachkey, au format de la plateforme, à coller ou importer soi-même.    |
| **Compose compatible**         | Le fichier Docker Compose standard, utilisable partout où Compose fonctionne.                 |

État actuel :

| Plateforme     | Niveau                | Fichier                                                         |
| -------------- | --------------------- | --------------------------------------------------------------- |
| Docker Compose | Compose compatible    | [`deploy/compose.yaml`](../deploy/compose.yaml)                 |
| Dokploy        | Catalogue officiel    | [`deploy/templates/dokploy/cachkey/`](../deploy/templates/dokploy/cachkey) |
| Coolify        | Template importable   | [`deploy/templates/coolify/docker-compose.yml`](../deploy/templates/coolify/docker-compose.yml) |

Cachkey est au **catalogue officiel de Dokploy** depuis le 15 octobre 2026
([Dokploy/templates#1225](https://github.com/Dokploy/templates/pull/1225)). Le catalogue
passe à une nouvelle version de Cachkey une fois sa mise à jour acceptée par les mainteneurs
de Dokploy : il peut donc avoir un peu de retard sur la dernière version publiée. Coolify
exige 1 000 étoiles GitHub avant d'accepter un service.

## Avant de commencer : l'envoi d'emails est obligatoire

Cachkey confirme chaque adresse email avant la première connexion, y compris celle du
premier compte. Prévoyez un serveur SMTP (`EMAIL_PROVIDER=smtp` et `SMTP_*`) ou une clé
[Resend](https://resend.com) (`EMAIL_PROVIDER=resend` et `RESEND_API_KEY`). Sans cela,
l'instance démarre mais personne ne peut se connecter.

`APP_URL` doit être l'adresse exacte par laquelle on ouvre Cachkey, avec `https://` dès que
le domaine est servi en HTTPS : sinon la connexion est refusée (origine différente).

## Docker Compose

Voir [Auto-hébergement](self-hosting.md). Le fichier `deploy/compose.yaml` se suffit à
lui-même : on peut le copier seul sur un serveur, à côté d'un fichier de variables.

## Dokploy

Depuis le catalogue : dans votre projet Dokploy, choisissez **Create Service → Template**,
cherchez « Cachkey » et déployez. Dokploy génère le domaine et les secrets ; renseignez
l'envoi d'emails dans l'onglet **Environment**, puis redéployez. Si vous remplacez le
domaine généré par le vôtre, mettez `APP_URL` à jour (`https://votre-domaine`).

Pour installer la toute dernière version avant son arrivée au catalogue, importez le template
du dépôt vous-même :

1. Dans votre projet Dokploy, créez un service **Compose**.
2. Collez le contenu de `deploy/templates/dokploy/cachkey/docker-compose.yml`.
3. Onglet **Environment** : reprenez les variables de `template.toml` (liste `env`) en
   générant les secrets vous-même :
   ```bash
   openssl rand -hex 32      # POSTGRES_PASSWORD
   openssl rand -base64 48   # BETTER_AUTH_SECRET
   openssl rand -base64 32   # ENCRYPTION_KEY — à sauvegarder hors du serveur
   ```
   Renseignez `APP_URL` et l'envoi d'emails.
4. Onglet **Domains** : ajoutez votre domaine sur le service `cachkey` (l'application web),
   port `3000`. Si vous remplacez le domaine généré par le vôtre, mettez `APP_URL` à jour
   (`https://votre-domaine`) puis redéployez.
5. Déployez. Au premier démarrage, l'API crée la base de données ; les redémarrages
   suivants ne rejouent rien.

## Coolify (« Docker Compose Empty »)

1. Dans votre projet Coolify : **+ New** → **Docker Compose Empty**.
2. Collez le contenu de `deploy/templates/coolify/docker-compose.yml`.
3. Coolify génère le domaine du service `web` et les secrets (`SERVICE_PASSWORD_*`,
   `SERVICE_REALBASE64_32_ENCRYPTION`). Vérifiez le domaine dans la configuration du service
   `web` (port `3000`).
4. Dans **Environment Variables**, remplissez `EMAIL_FROM` et l'envoi d'emails (`SMTP_*` ou
   `RESEND_API_KEY` avec `EMAIL_PROVIDER=resend`).
5. Déployez.

`SERVICE_REALBASE64_*` demande une version récente de Coolify v4 ; si elle n'est pas
reconnue, définissez `ENCRYPTION_KEY` vous-même (`openssl rand -base64 32`).

## Après l'installation

- **Sauvegardez `ENCRYPTION_KEY`** hors du serveur, séparément des sauvegardes de la base :
  sans elle, les valeurs enregistrées sont illisibles. Sur Dokploy et Coolify, elle se trouve
  dans les variables d'environnement du service.
- Les données sont dans le volume PostgreSQL du déploiement : supprimer ce volume efface tout.
- Mettre à jour : changez le numéro de version des deux images, puis redéployez ; l'API
  applique les migrations au démarrage.
