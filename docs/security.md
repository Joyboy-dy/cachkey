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
- **Double authentification** (Mon compte → Sécurité) : application d'authentification
  (Google Authenticator, 1Password, Aegis…) et 10 codes de secours à usage unique, affichés une
  seule fois. Le secret et les codes sont chiffrés en base. Activer, désactiver ou renouveler
  les codes demande le mot de passe et déclenche un email de notification. Un appareil peut
  être marqué « de confiance » pendant 30 jours. Après 10 codes faux d'affilée, le compte est
  bloqué 15 minutes. Une instance de développement ou locale apparaît dans l'application sous
  « Cachkey (dev) », jamais sous le même nom que la production.
- La double authentification protège la connexion par email et mot de passe. Les connexions
  par Google ou GitHub s'appuient sur la protection de ces comptes : activez-la chez eux aussi.
  `cachkey login` étant autorisé depuis une session du navigateur, il en bénéficie.
- Limitation du nombre de tentatives sur les routes d'authentification, par adresse IP. Derrière
  un reverse proxy, seule l'adresse ajoutée par celui-ci à `X-Forwarded-For` est retenue :
  une adresse inventée par le client ne permet pas de contourner la limite.
- Cookies `HttpOnly`, `SameSite=Lax`, et `Secure` dès que l'instance est servie en HTTPS.

## Navigateur

- Les pages ne peuvent pas être affichées dans le cadre d'un autre site (protection contre
  le détournement de clic, par exemple sur « Autoriser ce terminal »).
- En-têtes `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, et
  `Strict-Transport-Security` dès que l'instance est en HTTPS.
- Les redirections après connexion ne mènent qu'à des pages de l'instance.
- La page d'autorisation d'un terminal rappelle de refuser un code qu'on n'a pas demandé
  soi-même.

## Contrôle d'accès

- Chaque requête vérifie le rôle dans l'organisation et l'accès au projet et à
  l'environnement.
- Un projet inaccessible répond comme un projet inexistant : son existence n'est pas
  révélée.
- Affichages, copies, exports et lectures par jeton sont notés dans le journal d'activité,
  sans jamais la valeur.

## Récupérer un compte sans second facteur

Téléphone et codes de secours perdus : l'administrateur de l'instance peut désactiver la
double authentification du compte, directement en base, après avoir vérifié l'identité de la
personne :

```sql
DELETE FROM two_factors WHERE user_id = (SELECT id FROM users WHERE email = 'alex@exemple.com');
UPDATE users SET two_factor_enabled = false WHERE email = 'alex@exemple.com';
```

La personne se connecte ensuite avec son mot de passe et réactive la double authentification.

## À votre charge (auto-hébergement)

- Servir l'instance en **HTTPS** derrière un reverse proxy.
- Générer des secrets forts (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `POSTGRES_PASSWORD`) et
  ne jamais les commiter.
- Sauvegarder la base **et** `ENCRYPTION_KEY`, séparément.
- Suivre les versions publiées pour les correctifs. Voir [Auto-hébergement](self-hosting.md).
