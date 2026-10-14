# Politique de sécurité

## Signaler une vulnérabilité

Ne publiez pas de faille dans une issue publique. Utilisez le signalement privé de GitHub :
onglet **Security** du dépôt → **Report a vulnerability**
(<https://github.com/Joyboy-dy/cachkey/security/advisories/new>).

Indiquez la version concernée, les étapes pour reproduire et l'impact estimé. Vous recevrez
un accusé de réception sous 7 jours. Le correctif est publié dans une nouvelle version,
puis la faille est décrite publiquement, avec votre accord pour vous en attribuer la
découverte.

## Versions prises en charge

Avant la version 1.0, seule la dernière version publiée reçoit des correctifs de sécurité.

## Périmètre

Concernent cette politique : l'application web, l'API, la CLI, les images Docker publiées et
la configuration de déploiement de ce dépôt. Une instance mal configurée (HTTP sans TLS,
secrets faibles ou commités) relève de son opérateur ; voir
[docs/security.md](docs/security.md).
