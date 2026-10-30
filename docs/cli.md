# Ligne de commande (CLI)

La commande `cachkey` apporte vos variables dans le terminal : les lire, les modifier, les
écrire dans un fichier `.env` ou les injecter dans une commande.

## Installer

La CLI demande [Bun](https://bun.sh). Depuis le dépôt :

```bash
cd apps/cli && bun link
cachkey --help
```

Pour un exécutable autonome, sans Bun sur la machine cible :
`bun run --filter @cachkey/cli compile` produit `apps/cli/dist/cachkey`.

## Se connecter

```bash
cachkey login
```

Un code et l'adresse de la page `/device` de votre instance s'affichent. Le navigateur ne
s'ouvre jamais tout seul :

- **Entrée** ouvre le navigateur par défaut ;
- **c** copie l'adresse, à coller dans le navigateur de votre choix (utile si le navigateur par
  défaut est connecté à un autre compte Cachkey).

Sur la page, vérifiez le compte affiché et que le code est le même, puis autorisez. Le
terminal reçoit sa propre session, visible et révocable dans Mon compte → Appareils connectés.
Il agit avec **vos** droits. Un code ne sert qu'une fois : s'il a été utilisé dans le mauvais
navigateur, relancez `cachkey login`.

- L'instance utilisée est, dans l'ordre : `--url`, la variable `CACHKEY_URL`, celle de la
  dernière connexion, puis `http://localhost:3000`.
- Sans navigateur (serveur distant) : `cachkey login --no-browser` ne propose pas de
  l'ouvrir ; ouvrez l'adresse affichée sur un autre appareil. Hors terminal interactif (CI,
  script), rien n'est jamais ouvert.
- La session est enregistrée dans `%APPDATA%\cachkey\credentials.json` (Windows) ou
  `~/.config/cachkey/credentials.json`, lisible par vous seul. `CACHKEY_CONFIG_DIR` change
  ce dossier.

## Lier un dossier

```bash
cachkey init            # crée un projet (nom du dossier par défaut) et y lie ce dossier
cachkey link            # ou : lie ce dossier à un projet existant
```

Le lien est écrit dans `.cachkey.json` : organisation, projet et environnement par défaut,
**sans aucun secret**. Il peut être commité et partagé. La CLI le cherche dans le dossier
courant puis dans ses parents. `--org`, `--project` et `--env` le remplacent ponctuellement.

## Commandes

| Commande                        | Effet                                                                      |
| ------------------------------- | -------------------------------------------------------------------------- |
| `login` / `logout`              | Connecte ou déconnecte ce terminal.                                        |
| `whoami`                        | Compte (ou jeton), organisation, projet et environnement utilisés.         |
| `init [nom]`                    | Crée un projet et y lie le dossier.                                        |
| `link` / `unlink`               | Crée ou retire `.cachkey.json`.                                            |
| `orgs`                          | Liste vos organisations.                                                   |
| `projects [create <nom>]`       | Liste ou crée des projets.                                                 |
| `envs [create <nom>]`           | Liste ou crée des environnements.                                          |
| `secrets`                       | Liste les variables, sans leurs valeurs.                                   |
| `get <NOM>`                     | Affiche une valeur.                                                        |
| `set <NOM> [valeur]`            | Ajoute ou modifie. Sans valeur, elle est saisie au clavier, masquée.       |
| `rm <NOM>`                      | Supprime une variable, après confirmation.                                 |
| `import <fichier>`              | Importe un `.env` ; `--overwrite` remplace les variables existantes.       |
| `pull`                          | Écrit les variables dans un fichier (voir ci-dessous).                     |
| `run -- <commande> [args]`      | Lance la commande avec les variables dans son environnement.               |

Nommez un projet ou un environnement contenant des espaces entre guillemets.

## `pull`

```bash
cachkey pull                       # .env.<environnement> à la racine du projet lié
cachkey pull --env staging,production
cachkey pull --all                 # un fichier par environnement
cachkey pull --output .env         # autre fichier ; « - » affiche dans le terminal
cachkey pull --format json
```

Si le fichier écrit n'est pas ignoré par Git, la CLI vous prévient : ajoutez `.env.*` à
votre `.gitignore`.

## `run`

```bash
cachkey run -- npm run dev
cachkey run --env staging -- bun test
```

Les variables s'ajoutent à l'environnement de la commande lancée (et remplacent celles du
même nom), sans fichier écrit sur le disque. Le code de sortie est celui de la commande.

## Options

| Option                               | Effet                                                         |
| ------------------------------------ | ------------------------------------------------------------- |
| `--org`, `--project`, `--env <id>`   | Remplacent ceux du dossier lié.                               |
| `--all`                              | Tous les environnements (`pull`).                             |
| `--output`, `-o <fichier>`           | Fichier écrit par `pull`.                                     |
| `--format dotenv\|json`              | Format de `pull`.                                             |
| `--url <adresse>`                    | Instance Cachkey.                                             |
| `--token <jeton>`                    | Jeton d'accès (sinon `CACHKEY_TOKEN`).                        |
| `--overwrite`                        | `import` remplace les variables existantes.                   |
| `--yes`, `-y`                        | Pas de confirmation.                                          |
| `--no-browser`                       | `login` ne propose pas d'ouvrir le navigateur.                |
| `-h`, `--help` · `-v`, `--version`   | Aide, version.                                                |

## Sur un serveur ou en CI

Utilisez un [jeton d'accès](access-tokens.md) plutôt qu'une connexion :

```bash
export CACHKEY_URL=https://cachkey.example.com
export CACHKEY_TOKEN=ck_…
cachkey run -- node server.js
```

Avec un jeton, seules `pull`, `run` et `whoami` fonctionnent, sur l'environnement du jeton.

## Traçabilité

Les actions faites depuis la CLI apparaissent dans le journal d'activité, marquées « en
ligne de commande ». Connecté, `pull` et `run` y sont notés comme un export de
l'environnement ; avec un jeton, comme une lecture par ce jeton.
