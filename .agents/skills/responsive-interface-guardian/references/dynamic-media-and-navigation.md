# Médias, composants dynamiques et navigation

## Images

- Définir un ratio ou des dimensions intrinsèques.
- Choisir explicitement `object-fit` et `object-position`.
- Protéger les zones importantes du cadrage.
- Prévoir chargement lent, échec et absence d’image.
- Ne jamais étirer une image pour remplir une zone.

## Graphiques, vidéos, canvas et WebGL

- Donner au parent une largeur et une hauteur mesurables.
- Séparer la zone média de la zone texte avec grid ou flex.
- Empêcher titre, légende et contrôles de recouvrir la visualisation.
- Employer `ResizeObserver` lorsque le rendu dépend des dimensions du conteneur.
- Tester le redimensionnement, la navigation interne, le retour arrière et le remontage.
- Nettoyer animations, observers, listeners, contextes et ressources au démontage.
- Prévoir un état de repli si le canvas ou WebGL est indisponible.
- Respecter `prefers-reduced-motion`.

## Navigation

Basculer vers une composition compacte avant que les liens et CTA se rapprochent dangereusement.

- Ne pas compresser le logo.
- Garder le CTA principal accessible.
- Choisir le seuil du menu compact selon la largeur réelle du contenu.
- Utiliser un fond opaque si du contenu défile dessous.
- Stabiliser la hauteur et éviter les sauts de layout.
- Prendre en charge les safe areas mobiles.
- Garantir des cibles tactiles d’au moins 44 × 44 px.
- Tester clavier, focus, ouverture/fermeture, changement de route et retour arrière.

## Sticky, fixed et absolute

- Réserver `absolute` aux superpositions locales, pas à la structure principale.
- Vérifier que les éléments `fixed` ne masquent ni CTA ni contenu à faible hauteur.
- Calculer les offsets sticky à partir des barres réellement présentes.
- Tester les petits ordinateurs à faible hauteur, notamment 1024 × 600.
- Tenir compte des safe areas et du clavier virtuel.
