# Sécurité

Ce que Cachkey fait pour protéger vos secrets, et ce qui reste à votre charge. Pour signaler
une faille, voir [SECURITY.md](../SECURITY.md).

## Chiffrement des valeurs

- Chaque valeur est chiffrée en **AES-256-GCM** avant d'être écrite en base, avec un vecteur
  d'initialisation aléatoire à chaque écriture.
- **Chiffrement en enveloppe** : chaque projet a sa propre clé de données, elle-même chiffrée
  par la clé maîtresse de l'instance (`ENCRYPTION_KEY`). La clé maîtresse ne touche jamais
  les valeurs directement.
- Chaque valeur chiffrée est liée à son projet (par sa clé) et à son environnement :
  recopiée dans un autre projet ou un autre environnement, elle ne se déchiffre plus.
- Les noms des variables ne sont pas chiffrés ; ne mettez pas de secret dans un nom.

Sans `ENCRYPTION_KEY`, une copie de la base est illisible. Avec elle, tout est lisible :
conservez-la hors du serveur et séparément des sauvegardes de la base.

## Jetons d'accès

- 32 octets aléatoires ; seule leur empreinte SHA-256 est stockée.
- Lecture seule, un environnement, expiration au choix, révocation immédiate.

## Comptes et sessions

- Mots de passe hachés (Better Auth) ; adresse email confirmée avant la première connexion.
- Sessions de 7 jours, renouvelées à l'usage, révocables depuis Appareils connectés.
- Limitation du nombre de tentatives sur les routes d'authentification.
- Cookies `HttpOnly`, `SameSite=Lax`, et `Secure` dès que l'instance est servie en HTTPS.

## Contrôle d'accès

- Chaque requête vérifie le rôle dans l'organisation et l'accès au projet et à
  l'environnement.
- Un projet inaccessible répond comme un projet inexistant : son existence n'est pas
  révélée.
- Affichages, copies, exports et lectures par jeton sont notés dans le journal d'activité,
  sans jamais la valeur.

## À votre charge (auto-hébergement)

- Servir l'instance en **HTTPS** derrière un reverse proxy.
- Générer des secrets forts (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `POSTGRES_PASSWORD`) et
  ne jamais les commiter.
- Sauvegarder la base **et** `ENCRYPTION_KEY`, séparément.
- Suivre les versions publiées pour les correctifs. Voir [Auto-hébergement](self-hosting.md).
