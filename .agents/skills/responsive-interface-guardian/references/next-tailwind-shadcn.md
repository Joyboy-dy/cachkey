# Next.js, TypeScript, Tailwind CSS et shadcn/ui

## Préserver la stack

- Respecter App Router, les frontières client/serveur et les composants existants.
- Conserver TypeScript strict, ESLint et les conventions du projet.
- Réutiliser shadcn/ui et les primitives existantes avant d’ajouter un composant.
- Ne pas changer arbitrairement tokens, rayons, typographie, couleurs ou espacements.
- Préférer les classes Tailwind cohérentes avec le projet aux styles isolés.

## Breakpoints dictés par le contenu

Utiliser les breakpoints existants lorsqu’ils correspondent à la collision. Ajouter une variante arbitraire justifiée si nécessaire :

- `min-[1180px]:...`
- `max-[1179px]:...`
- `min-[1280px]:...`

Ne pas activer automatiquement une composition desktop à `lg` si ses colonnes exigent davantage d’espace. Documenter la contrainte ayant déterminé toute valeur arbitraire.

## Primitives utiles

- `min-w-0` sur les enfants flex/grid contenant du texte ;
- `w-full`, `max-w-*`, `mx-auto` pour la largeur éditoriale ;
- `min-h-*` plutôt que `h-*` pour les cartes à contenu variable ;
- `aspect-*`, `object-cover` ou `object-contain` avec position explicite ;
- `flex-wrap`, grilles `minmax()` et container queries lorsque pertinentes ;
- valeurs fluides avec classes arbitraires `clamp()` si les tokens existants ne suffisent pas ;
- `min-h-dvh` ou `min-h-svh` pour les écrans mobiles.

Éviter les valeurs magiques. Si une valeur calculée est nécessaire, la relier à une hauteur de barre, un gap, une largeur minimale ou une autre contrainte identifiable.

## Validation

Utiliser les outils déjà présents dans le projet : navigateur contrôlé, Playwright, Storybook, tests visuels ou inspection manuelle. Ne pas introduire une dépendance lourde uniquement pour une petite correction sans accord.

Exécuter les scripts réellement définis dans `package.json`, notamment lint, vérification TypeScript, tests pertinents et build. Ne jamais inventer un nom de commande.
