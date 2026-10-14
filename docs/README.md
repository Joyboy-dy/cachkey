# Documentation de Cachkey

Cachkey garde les variables d'environnement et les secrets techniques de vos projets
(clés d'API, mots de passe de base de données, certificats…), chiffrés, partagés avec votre
équipe et disponibles là où votre code tourne.

## Utiliser Cachkey

| Besoin                                         | Page                                                 |
| ---------------------------------------------- | ---------------------------------------------------- |
| Créer son compte et son premier projet         | [Démarrage](getting-started.md)                      |
| Projets, environnements, variables, historique | [Projets et variables](projects-and-variables.md)    |
| Inviter, rôles, accès par projet, activité     | [Équipe et accès](team-and-access.md)                |
| Donner accès à un serveur ou une CI            | [Jetons d'accès](access-tokens.md)                   |
| Travailler depuis le terminal                  | [Ligne de commande (CLI)](cli.md)                    |
| Lire les variables par HTTP                    | [API publique](api.md)                               |
| Ce qui protège vos secrets                     | [Sécurité](security.md)                              |

## Héberger Cachkey

- [Auto-hébergement](self-hosting.md) : Docker Compose, mises à jour, sauvegardes.
- [Déploiement en un clic](one-click-deployment.md) : Dokploy, Coolify, état des catalogues.

## Contribuer

- [Feuille de route](ROADMAP.md) : phases, décisions et journal.
- [Authentification](authentication.md) : fonctionnement interne (Better Auth, routes).
- [CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md),
  [CHANGELOG.md](../CHANGELOG.md).

Ces pages décrivent le comportement réel du code. Elles sont maintenues avec le skill
`.agents/skills/cachkey-docs` : toute modification visible pour l'utilisateur met à jour la
page concernée dans le même changement.
