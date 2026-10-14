# Stratégie de composition responsive

## Auditer la cause

Ne pas réduire le diagnostic à mobile, tablette et desktop. Pour chaque région, déterminer la somme réelle des minima :

`largeurs minimales + gaps + paddings + bordures + zones réservées`

Le breakpoint pertinent se situe avant que cette somme dépasse l’espace disponible. Examiner aussi les titres, traductions, données utilisateur, boutons, badges, menus, graphiques et états asynchrones.

Rechercher explicitement :

- scroll horizontal et enfants plus larges que leur conteneur ;
- flex items sans `min-width: 0` ;
- grilles activées avant que leurs colonnes puissent tenir ;
- `white-space: nowrap` non soutenable ;
- largeurs ou hauteurs fixes incompatibles avec le contenu ;
- éléments absolus utilisés pour structurer une carte ;
- médias sans ratio ou parent mesurable ;
- navigation dont le logo, les liens ou CTA se compressent ;
- contenu essentiel caché à un breakpoint.

## Choisir les compositions

Définir une composition par plage de largeur, pas seulement un ensemble de tailles.

- Surface très étroite : conserver le message, l’action et la navigation essentiels ; accepter une dégradation progressive explicite.
- Téléphone : empiler les zones principales, permettre aux CTA de s’empiler ou de revenir proprement à la ligne.
- Tablette/petit ordinateur : conserver une composition intermédiaire tant que les colonnes desktop ne tiennent pas avec leurs minima.
- Desktop : activer les colonnes uniquement lorsque leur largeur utile, les gaps et les paddings sont disponibles.
- Ultralarge : limiter la longueur de ligne et la largeur éditoriale ; ne pas étirer artificiellement le contenu.

Exemples de transformations :

- hero deux colonnes vers hero empilée ;
- trois cartes vers une principale pleine largeur et deux secondaires ;
- navigation complète vers navigation compacte ;
- toolbar horizontale vers groupes sur plusieurs lignes ;
- tableau vers colonnes prioritaires, cartes ou défilement local explicite si la nature tabulaire l’exige.

## Dimensions fluides

Privilégier selon la stack :

- `clamp()` pour typographie et espacements ;
- `minmax()` avec minima métier pour les grilles ;
- `auto-fit` ou `auto-fill` pour les collections homogènes ;
- `min-width: 0` pour les enfants flex/grid textuels ;
- `width: 100%`, `max-width` et marges automatiques cohérentes ;
- `aspect-ratio` avec `object-fit` et `object-position` explicites ;
- `min-height` pour les cartes textuelles ;
- `dvh` ou `svh` plutôt que `vh` sur mobile ;
- container queries lorsqu’un composant dépend de sa propre largeur.

Pour une grille critique, définir chaque minimum et n’activer la grille que lorsque la somme tient réellement :

```css
grid-template-columns:
  minmax(19rem, 0.8fr)
  minmax(34rem, 1.45fr)
  minmax(19rem, 0.8fr);
```

## Textes et actions

- Réserver `white-space: nowrap` aux libellés dont le conteneur peut garantir la largeur.
- Sinon, autoriser le retour à la ligne ou empiler les actions.
- Donner aux titres une largeur éditoriale et aux paragraphes une longueur de ligne lisible.
- Tester des textes et traductions plus longs de 30 %.
- Maintenir l’interface utilisable à 200 % de zoom.
- Préserver des cibles tactiles d’au moins 44 × 44 px.

## Interdictions

- Ne pas masquer un bug avec `overflow: hidden`.
- Ne pas tronquer une action ou information essentielle.
- Ne pas garder plusieurs colonnes sous leur largeur minimale.
- Ne pas diminuer indéfiniment police et paddings.
- Ne pas ajouter de breakpoint sans relier sa valeur à une contrainte observée.
- Ne pas modifier arbitrairement le design system pour résoudre un problème local.
