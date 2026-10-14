# Équipe et accès

## Rôles dans l'organisation

| Rôle               | Ce qu'il permet                                                              |
| ------------------ | ---------------------------------------------------------------------------- |
| **Propriétaire**   | Tout, y compris supprimer l'organisation et transmettre la propriété. Unique. |
| **Administrateur** | Tous les projets, membres, invitations, accès, jetons et journal d'activité. |
| **Membre**         | Uniquement les projets auxquels on lui a donné accès.                        |

La propriété se transmet à un autre membre depuis la page Organisation : il devient
propriétaire, l'ancien propriétaire devient administrateur.

## Inviter

Propriétaires et administrateurs invitent par email, comme administrateur ou membre.
L'invitation est valable 7 jours. Si l'email n'arrive pas, le lien de l'invitation peut être
copié et partagé directement. La personne invitée crée son compte (ou se connecte) avec
l'adresse invitée, puis accepte ou refuse.

## Accès par projet

Un membre ne voit un projet que si on lui en donne l'accès (paramètres du projet, section Accès) :

- **Lecture** : voir les variables et leurs valeurs, les utiliser avec la CLI.
- **Écriture** : en plus, ajouter, modifier, supprimer et importer des variables.
- **Environnements** : l'accès peut couvrir tous les environnements ou seulement certains
  (par exemple `development` et `staging`, sans `production`).

Un projet auquel un membre n'a pas accès n'apparaît nulle part pour lui, ni dans
l'application, ni dans la CLI. Les accès d'un membre sont retirés s'il quitte l'organisation.

## Journal d'activité

Propriétaires et administrateurs consultent la page Activité : qui a fait quoi, quand, sur
quel projet et quel environnement. Le journal note notamment :

- créations, modifications, suppressions, imports et exports de variables ;
- valeurs affichées ou copiées (jamais la valeur elle-même) ;
- lectures par un jeton d'accès et récupérations depuis la CLI (marquées « en ligne de
  commande ») ;
- invitations, changements de rôle, accès accordés ou retirés, jetons créés ou révoqués.

Les événements se filtrent par projet et par type : lectures, modifications, structure
(projets, environnements, jetons) et personnes.

## Appareils connectés

Chaque connexion (navigateur ou terminal) apparaît dans Mon compte → Appareils connectés,
avec son appareil et sa dernière activité. Vous pouvez y déconnecter un appareil, y compris
une session de la CLI.
