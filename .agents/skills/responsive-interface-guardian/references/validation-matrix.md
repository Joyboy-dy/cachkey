# Matrice de validation responsive

## Règle de preuve

Tester avec capture ou inspection visuelle réelle. Une compilation réussie ne valide ni la composition ni l’absence de collision. Indiquer exactement ce qui a été contrôlé et marquer honnêtement tout test impossible.

Quand Playwright est déjà présent dans le projet et qu'un serveur de dev est accessible, exécuter `scripts/audit-viewports.mjs` pour couvrir automatiquement l'overflow horizontal, les chevauchements d'éléments interactifs et les cibles tactiles sous 44 × 44 px sur tous les viewports de `scripts/viewports.json`, avec capture d'écran par dimension. Le script ne dispense pas d'ouvrir les captures : il ne juge ni la lisibilité, ni le cadrage des médias, ni l'esthétique, et n'installe jamais Playwright de lui-même si absent du projet.

Ne jamais remplacer cette liste par un échantillon ou une sélection « prioritaire ». Dans le rapport final, reproduire toutes les dimensions ci-dessous avec l’un des statuts : `validé`, `échec corrigé puis revalidé`, `échec restant` ou `non testé`. Pour `non testé`, fournir la raison.

Sans Playwright disponible, la même logique de détection (overflow horizontal, chevauchements, cibles tactiles) peut être exécutée à la main dans la console du navigateur en redimensionnant la fenêtre aux dimensions ci-dessous ; s'inspirer de la fonction `pageAudit` de `scripts/audit-viewports.mjs` pour ne rien oublier de systématique.

## Viewports minimaux

### Surfaces très étroites

- 240 × 320
- 280 × 653
- 320 × 568

Sous 280 px, conserver uniquement le contenu et les actions essentiels avec une dégradation progressive explicite.

### Téléphones

- 360 × 640
- 375 × 812
- 390 × 844
- 412 × 915
- 430 × 932

### Tablettes

- 600 × 960
- 768 × 1024
- 820 × 1180
- 912 × 1368

### Petits ordinateurs et zones critiques

- 1024 × 600
- 1024 × 695
- 1034 × 695
- 1040 × 695
- 1180 × 800
- 1279 × 800

### Desktop

- 1280 × 720
- 1366 × 768
- 1440 × 900
- 1536 × 864
- 1920 × 1080
- 2560 × 1440

## Variantes à contrôler

- portrait et paysage ;
- zoom 125 %, 150 % et 200 % ;
- police système augmentée ;
- textes augmentés de 30 % ;
- navigation clavier et focus visible ;
- mode tactile ;
- navigation interne, retour arrière et remontage ;
- images et données lentes ;
- état sans image ;
- loading, vide, erreur, succès et données longues ;
- canvas/WebGL indisponible si présent ;
- `prefers-reduced-motion`.

## Critères d’acceptation

La tâche n’est terminée que si :

1. aucun viewport contrôlé ne présente de scroll horizontal involontaire ;
2. aucun texte, bouton, menu, graphique, média ou canvas ne se chevauche ;
3. aucun CTA essentiel n’est coupé ou inaccessible ;
4. les cartes changent de structure avant de devenir trop étroites ;
5. les textes restent lisibles ;
6. les médias ne sont ni étirés ni mal cadrés ;
7. les cibles tactiles atteignent au moins 44 × 44 px ;
8. le zoom à 200 % reste utilisable ;
9. le contenu essentiel reste visible sur les surfaces très étroites ;
10. les composants dynamiques survivent à la navigation et au remontage ;
11. lint, tests, types et build pertinents passent ;
12. le rapport final distingue tests exécutés, tests non exécutés et limites restantes.

Après chaque correction, retester le viewport en échec, ses voisins immédiats et les dimensions extrêmes.
