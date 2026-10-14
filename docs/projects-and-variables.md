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

## Variables

Une variable a un nom et une valeur.

- **Nom** : lettres, chiffres et `_`, sans commencer par un chiffre (`API_KEY`,
  `next_public_url`), 128 caractères au plus, unique dans l'environnement.
- **Valeur** : jusqu'à 64 Ko (assez pour un certificat ou une clé privée). Une valeur peut
  être vide ; elle est alors signalée « Aucune valeur », même quand les valeurs sont
  masquées.
- Jusqu'à 500 variables par environnement.

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
| Gérer environnements, accès, jetons        |         |          |          ✓           |

L'accès peut être limité à certains environnements. Voir [Équipe et accès](team-and-access.md).
