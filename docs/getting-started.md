# Démarrage

Dix minutes pour passer d'un compte vide à un projet dont les variables arrivent dans votre
code.

## 1. Créer un compte

Inscrivez-vous avec une adresse email et un mot de passe, ou avec Google ou GitHub si
l'instance les propose. Avec un email, confirmez votre adresse grâce au lien reçu avant de
vous connecter.

## 2. Créer une organisation

Une organisation regroupe une équipe et ses projets. À la première connexion, Cachkey vous
propose d'en créer une (ou de rejoindre celle qui vous a invité). Vous en êtes le
propriétaire. Vous pouvez appartenir à plusieurs organisations et passer de l'une à l'autre
depuis la barre latérale.

## 3. Créer un projet

Un projet correspond en général à une application ou un dépôt. Il est créé avec trois
environnements : `development`, `staging` et `production`. Vous pouvez en ajouter, les
renommer ou les supprimer.

## 4. Ajouter des variables

Dans un environnement, ajoutez des variables une par une, ou importez un fichier `.env`
existant. Les valeurs sont chiffrées dès leur enregistrement et masquées à l'affichage.
Voir [Projets et variables](projects-and-variables.md).

## 5. Les utiliser

- **Sur votre machine** : installez la [CLI](cli.md), puis
  ```bash
  cachkey login
  cachkey link
  cachkey run -- npm run dev
  ```
- **Sur un serveur ou en CI** : créez un [jeton d'accès](access-tokens.md) limité à un
  environnement et utilisez-le avec la CLI ou l'[API publique](api.md).

## 6. Inviter votre équipe

Depuis la page Organisation, invitez des personnes par email (ou partagez le lien
d'invitation), puis choisissez ce qu'elles voient dans chaque projet. Voir
[Équipe et accès](team-and-access.md).

La carte « Premiers pas », en bas de l'écran, suit ces étapes jusqu'à ce qu'elles soient
toutes faites. Vous pouvez la replier ou la masquer trois jours.
