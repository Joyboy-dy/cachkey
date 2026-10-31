# Projets et variables

## Projets

Un projet appartient à une organisation. Il a un nom, une description facultative et un
identifiant court (`mon-api`) utilisé dans les adresses, la CLI et l'API.

- Créer, renommer ou supprimer un projet : propriétaires et administrateurs.
- Supprimer un projet efface définitivement ses environnements, variables, historique et
  jetons d'accès.

## Environnements

Chaque projet démarre avec `development`, `staging` et `production`. Un environnement porte
son propre jeu de variables : `DATABASE_URL` peut avoir une valeur différente dans chacun.

- Jusqu'à 20 environnements par projet ; nom de 40 caractères au plus.
- Créer, renommer ou supprimer : propriétaires et administrateurs.

## Briques

Un projet peut être découpé en **briques** : des parties indépendantes, comme le front-end
et l'API d'un même dépôt, qui ont chacune leurs variables. Elles partagent les
environnements, les membres et les **variables partagées** du projet.

```
Projet « Boutique »
├── Environnements : development · staging · production
├── Variables partagées : SENTRY_DSN, APP_NAME…   (reçues par toutes les briques)
├── Brique « web »     : NEXT_PUBLIC_API_URL…
└── Brique « api »     : DATABASE_URL, STRIPE_KEY…
```

- Tout projet a une **brique principale**, qui contient toutes ses variables tant qu'il n'est
  pas découpé : sans seconde brique, rien ne change et la notion n'apparaît nulle part.
- Ajouter, renommer ou supprimer une brique : Paramètres du projet → Briques (propriétaires
  et administrateurs). La brique principale peut être renommée, pas supprimée. Jusqu'à
  10 briques par projet, un seul niveau.
- Dès la deuxième brique, l'onglet Variables affiche un sélecteur de brique à côté de celui
  de l'environnement, avec une entrée « Variables partagées ».
- Une brique reçoit les variables partagées **et** les siennes. Si elle redéfinit une
  variable partagée, sa valeur l'emporte (« Remplace la valeur partagée »).
- L'export d'une brique, `cachkey pull` et les jetons d'accès donnent ce que l'application
  reçoit réellement : variables partagées + variables de la brique.
- Supprimer une brique efface ses variables (dans tous les environnements), leur historique
  et ses jetons d'accès. Les variables partagées et les autres briques ne changent pas.
- Les accès des membres portent sur le projet et ses environnements : une personne qui voit
  un environnement voit toutes ses briques.

## Variables

Une variable a un nom et une valeur.

- **Nom** : lettres, chiffres et `_`, sans commencer par un chiffre (`API_KEY`,
  `next_public_url`), 128 caractères au plus, unique dans l'environnement (et la brique).
- **Valeur** : jusqu'à 64 Ko (assez pour un certificat ou une clé privée). Une valeur peut
  être vide ; elle est alors signalée « Aucune valeur », même quand les valeurs sont
  masquées.
- Jusqu'à 500 variables par environnement (et par brique).

Les valeurs sont chiffrées à l'enregistrement et masquées à l'affichage. Les afficher, les
copier ou les exporter est noté dans le journal d'activité (jamais la valeur elle-même).

## Importer et exporter

- **Importer** un fichier `.env` (collé ou déposé) : les nouvelles variables sont créées ;
  celles qui existent déjà sont ignorées, sauf si vous choisissez de les remplacer. Les
  lignes illisibles sont listées sans bloquer l'import.
- **Exporter** un environnement produit un fichier `.env` prêt à l'emploi.

Format `.env` accepté : `NOM=valeur`, `export NOM=valeur`, commentaires `#`, guillemets
simples (texte littéral), doubles (avec `\n`, `\t`, `\"`… et sur plusieurs lignes si besoin)
ou obliques.

## Historique des valeurs

Chaque modification crée une nouvelle version ; les précédentes sont conservées. Depuis le
détail d'une variable, vous pouvez afficher une ancienne valeur ou la restaurer (ce qui crée
une nouvelle version). Supprimer une variable supprime aussi son historique.

## Qui peut faire quoi

| Action                                     | Lecture | Écriture | Admin / propriétaire |
| ------------------------------------------ | :-----: | :------: | :------------------: |
| Voir les variables et leurs valeurs        |    ✓    |    ✓     |          ✓           |
| Ajouter, modifier, supprimer, importer     |         |    ✓     |          ✓           |
| Gérer environnements, briques, accès, jetons |       |          |          ✓           |

L'accès peut être limité à certains environnements. Voir [Équipe et accès](team-and-access.md).
