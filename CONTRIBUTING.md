# Contribuer à Cachkey

Merci de votre intérêt. Cachkey est distribué sous [AGPL-3.0-only](LICENSE) : en proposant
une contribution, vous acceptez qu'elle soit publiée sous cette licence.

## Avant de commencer

- Pour un changement important, ouvrez d'abord une issue pour en discuter.
- Une faille de sécurité ne se signale jamais en issue publique : voir [SECURITY.md](SECURITY.md).
- Lisez [AGENTS.md](AGENTS.md) : il décrit l'architecture et les règles du dépôt, pour les
  personnes comme pour les agents.

## Installer

Prérequis : Bun 1.3+, Docker. Puis suivez « Démarrage local » dans le [README](README.md) :

```bash
bun install
bun run services:up
bun run db:migrate
bun run dev
```

## Règles

- TypeScript strict ; validation partagée dans `packages/shared` (Zod).
- Interface en français, sans jargon ; thèmes clair et sombre ; utilisable dès 320 px de
  large, au clavier et au lecteur d'écran.
- Icônes : Hugeicons, via le composant `<Icon>`.
- Une valeur de secret ne passe que par `apps/api/src/crypto.ts` : jamais dans les logs, ni
  dans les listes, ni dans le cache du navigateur.
- Tout changement visible pour l'utilisateur met à jour la page concernée de `docs/` et
  `CHANGELOG.md` (méthode : `.agents/skills/cachkey-docs`).

## Proposer une modification

1. Créez une branche depuis `main` (`feat/…`, `fix/…`, `docs/…`).
2. Vérifiez avant d'envoyer :
   ```bash
   bun run check
   bun run build
   ```
3. Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org) :
   `feat: …`, `fix: …`, `docs: …`, `chore: …`.
4. Ouvrez une pull request qui explique le besoin, le changement et la façon dont il a été
   vérifié (captures pour l'interface).

## Versions

Cachkey suit le [versionnement sémantique](https://semver.org/lang/fr/). Une version est
publiée en poussant un tag `vX.Y.Z` sur `main` : la CI construit et publie les images
`ghcr.io/joyboy-dy/cachkey-api` et `cachkey-web`. Avant le tag, la section
`[Non publié]` de `CHANGELOG.md` devient la section de la version.
