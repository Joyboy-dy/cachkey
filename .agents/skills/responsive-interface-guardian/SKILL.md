---
name: responsive-interface-guardian
description: "Auditer, corriger, refactoriser et valider le responsive d’une interface web avec des breakpoints guidés par le contenu. Utiliser dès qu’une demande concerne une interface à rendre responsive, un affichage mobile/tablette/desktop, un débordement horizontal, des éléments qui se chevauchent ou se coupent, une navbar trop dense, des cartes trop étroites, des médias déformés, des hauteurs fragiles, le zoom navigateur, les textes longs/traduits, les container queries ou une matrice de tests responsive. S’applique aux interfaces HTML/CSS et aux frameworks comme Next.js, React, Vue ou Svelte, en préservant le design system et le comportement existants."
---

# Responsive Interface Guardian

## Mission

Rendre une interface stable, lisible et utilisable à toutes les dimensions plausibles sans masquer les défauts de mise en page. Déterminer les changements de composition à partir de l’espace réellement requis par le contenu, puis prouver le résultat par une validation visuelle et technique.

## Références à charger

- Toujours lire `references/layout-strategy.md` avant d’analyser ou de modifier l’interface.
- Toujours lire `references/validation-matrix.md` avant d’annoncer la fin de la tâche.
- Lire `references/dynamic-media-and-navigation.md` si l’interface contient navigation, images, vidéos, graphiques, canvas, WebGL, animations, éléments sticky/fixed ou composants dépendants de leur taille.
- Lire `references/next-tailwind-shadcn.md` pour Next.js, React, TypeScript, Tailwind CSS ou shadcn/ui. Pour une autre stack, transposer les principes sans introduire une nouvelle dépendance arbitraire.

## Outillage de validation

`scripts/audit-viewports.mjs` exécute la matrice de `references/validation-matrix.md` avec Playwright : il détecte l'overflow horizontal, les chevauchements entre éléments interactifs et les cibles tactiles sous 44 × 44 px, capture chaque viewport, et écrit un rapport JSON avec un statut par dimension. Vérifier d'abord que Playwright est déjà une dépendance du projet ; si ce n'est pas le cas, ne pas l'installer sans accord et retomber sur l'inspection manuelle décrite dans `references/validation-matrix.md`. Ce script complète l'inspection visuelle humaine des captures, il ne la remplace jamais : un "validé" automatique ne détecte ni une mauvaise lisibilité, ni un média mal cadré, ni un problème purement esthétique.

## Contrat de travail

- Préserver les fonctionnalités, la hiérarchie visuelle, le design system et les composants existants sauf demande contraire.
- Auditer avant de modifier. Ne pas appliquer une collection générique de classes responsive sans comprendre la collision.
- Préférer le plus petit changement cohérent qui corrige la cause structurelle sur toutes les plages concernées.
- Ne jamais utiliser `overflow-hidden`, une hauteur fixe, une réduction excessive de police ou une troncature comme cache-misère.
- Ne jamais désactiver TypeScript, ESLint, les tests ou les règles d’accessibilité pour faire passer la modification.
- Ne jamais affirmer qu’un viewport, un zoom ou un état a été validé sans l’avoir réellement contrôlé.

## Workflow obligatoire

### 1. Établir le périmètre

Identifier les routes, composants, layouts partagés, états dynamiques et fichiers de style concernés. Repérer la stack, les conventions du projet et les commandes disponibles. Inspecter les changements existants avant toute édition et préserver les modifications sans rapport avec la tâche.

### 2. Auditer les contraintes

Mesurer ou estimer pour chaque bloc :

- largeur minimale utile ;
- contenu le plus long et croissance possible de 30 % ;
- taille minimale des actions et cibles tactiles ;
- ratio et comportement des médias ;
- contraintes des grilles, flexboxes, conteneurs et `max-width` ;
- positions `absolute`, `fixed`, `sticky` et hauteurs fixes ;
- états loading, vide, erreur, succès, données longues et média absent.

Produire avant le code un résumé bref des risques, des compositions prévues par plage et des seuils de contenu retenus.

### 3. Concevoir par plages de composition

Définir les seuils exacts où la structure actuelle cesse de tenir. Conserver une composition compacte tant que les minima des colonnes, gaps et paddings ne peuvent pas coexister. Changer de structure avant la collision : empiler, réordonner, regrouper, passer une carte en pleine largeur ou compacter la navigation.

Ne masquer que les informations réellement secondaires. Maintenir accessibles les actions, messages et bénéfices essentiels.

### 4. Implémenter la correction

Utiliser dimensions fluides, minima explicites, retours à la ligne contrôlés, ratios médias, container queries ou breakpoints arbitraires justifiés. Ajouter `min-width: 0` aux enfants flex/grid textuels lorsque nécessaire. Préférer `min-height` aux hauteurs fixes pour le contenu variable.

Corriger la source du débordement. Rechercher aussi les régressions introduites dans les composants voisins et les layouts partagés.

### 5. Valider visuellement et techniquement

Exécuter la matrice de `references/validation-matrix.md` avec les outils disponibles. Si un serveur de dev tourne et que Playwright est déjà présent dans le projet, lancer `node scripts/audit-viewports.mjs --url <url-locale>` pour obtenir un statut objectif par viewport et des captures, puis inspecter visuellement les captures produites. Sinon, procéder à l'inspection manuelle. Tester dans tous les cas les états dynamiques pertinents, le clavier, le tactile, le zoom, l’orientation, les textes longs, les médias lents ou absents et `prefers-reduced-motion` : ce sont des vérifications que le script n'automatise pas entièrement.

Ne pas condenser la matrice en quelques viewports « représentatifs ». Le rapport final doit reprendre chaque dimension obligatoire et lui attribuer un statut explicite : `validé`, `échec corrigé puis revalidé` ou `non testé` avec la raison.

Contrôler au minimum :

- aucun scroll horizontal involontaire ;
- aucun chevauchement ou élément coupé ;
- CTA accessibles et cibles tactiles suffisantes ;
- changement de composition avant compression ;
- texte lisible et média non déformé ;
- composants dynamiques fonctionnels après navigation et remontage ;
- lint, tests ciblés, vérification de types et build selon le projet.

### 6. Corriger puis revalider

Après toute correction issue d’un viewport, rejouer les plages voisines et les layouts partagés. Ne pas considérer le build comme une preuve de responsive.

## Livrable

Avant développement, communiquer :

- risques identifiés ;
- stratégie de composition ;
- breakpoints de contenu et justification.

Après développement, communiquer :

- fichiers modifiés ;
- compositions utilisées par plage ;
- collisions, débordements et hauteurs corrigés ;
- viewports, zooms, états et orientations réellement testés ;
- statut de chaque viewport obligatoire, y compris ceux qui n’ont pas pu être testés ;
- commandes exécutées et résultats ;
- limites non vérifiées ou risques restants.
