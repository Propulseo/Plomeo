# Carte de zone d'intervention — variantes améliorées (design)

Date : 2026-08-12
Statut : validé en dialogue, en attente de relecture de la spec

## Contexte et objectif

La carte de zone (variante « Éditoriale », `assets/js/site/zone-map/` + `assets/css/zone-map.css`)
est en prod depuis le 2026-08-10. Deux faiblesses identifiées : **manque de vie**
(pas d'entrée en scène, peu de réactions) et **lisibilité** perfectible (étiquettes,
arcs de temps). Le site est celui d'un **artisan plombier de Toulon** : le ton doit
rester chaleureux, concret, de proximité — pas techno, pas corporate.

Objectif : construire une **page prototype locale** avec 4 variantes améliorées,
montrées aux deux cadrages (hero + section), pour choisir visuellement la gagnante
avant promotion en prod.

## Architecture du prototype

- `proto-carte.html` + `proto-carte.js` à la racine, **gitignorés** (comme
  l'ancien labo `index-lab.html`). Servis par Vite : `npm run dev` →
  `http://localhost:5173/proto-carte.html`.
- Navigation : 4 onglets (A/B/C/D). Chaque variante affiche ses **deux cadrages**
  (hero puis section) l'un sous l'autre, sur un fond imitant les sections réelles
  du site (mêmes couleurs).
- **Zéro modification du code de prod.** Le prototype importe les briques
  existantes (`zones.js`, `map.js`, `dom.js` : projection, contour du Var,
  communes, survol) ; chaque variante n'apporte que sa couche visuelle
  (son `paint` + son CSS).
- Données : communes chargées une fois depuis Supabase et partagées aux 4
  variantes ; repli embarqué (`FALLBACK`) si la base est injoignable — la page
  fonctionne toujours.

## Les 4 variantes

### A. Éditoriale + (base actuelle + vie + lisibilité)

- Entrée en scène au scroll, jouée une seule fois (`IntersectionObserver`) :
  1. le contour du Var se **trace** (~1 s, `stroke-dashoffset`) ;
  2. les 3 ondes de palier s'étendent de Toulon vers l'extérieur en cascade ;
  3. les communes **poppent** par distance croissante (~40 ms d'écart).
- Lisibilité : étiquettes des grandes villes un peu plus grasses, petites en
  demi-teinte ; arcs « 15 MIN / 30 MIN / 45 MIN » plus contrastés ; au survol
  d'un palier, les communes des autres paliers **s'estompent**.

### B. Goutte d'eau

- Base visuelle de A. Les 3 cercles deviennent des **ondes en boucle** : toutes
  les ~6 s, une ondulation part de Toulon et traverse les 3 rayons — lent,
  opacité faible, jamais clignotant. Clin d'œil métier (goutte d'eau / plombier).
- Les temps **sortent de la carte** : 3 badges « 15 min / 30 min / 45 min » en
  colonne à côté, reliés à leur cercle par un trait fin. Plus d'arcs de texte
  sur la carte → plus épurée.

### C. Itinéraires

- Base visuelle de A. Le survol devient la star : survoler une commune **trace
  une route** de Toulon vers elle (trait orange dessiné en ~0,4 s, courbe
  légère, pas une droite raide) et le temps **compte** (0 → 25 min) près de la
  commune.
- La recherche déclenche le même trajet (taper « Bandol » dessine
  Toulon → Bandol). Message : « on se déplace vraiment chez vous ».
- Au repos : carte calme, pings actuels seulement.

### D. Carte d'atelier

- Rupture assumée, esthétique « carte punaisée dans le fourgon » : fond **papier
  craft** (texture légère), contour du Var au **trait manuel** (léger tremblé,
  façon feutre), communes en repères de tournée (croix/punaise), noms en
  écriture condensée.
- Paliers = **tampons** « -15 MIN / -30 MIN / -45 MIN » légèrement inclinés,
  façon encre ; cercles en pointillés, comme tracés au compas.
- À juger en vrai contre le reste du site (risque : rupture trop forte).

Toutes les variantes conservent l'existant validé : survol commune (fil +
distance), recherche, puces liées, parallaxe, compteur de communes.

## Garde-fous

- **Perf** : animations CSS/SVG pures (`stroke-dashoffset`, `transform`,
  `opacity`) — pas de lib, pas de canvas, rien qui tourne au scroll en continu.
- **Accessibilité** : carte `aria-hidden` (l'info est en texte à côté) ;
  `prefers-reduced-motion` coupe toutes les animations, boucles comprises, et
  montre l'état final.
- **SEO** : inchangé — les puces de communes restent rendues en HTML.

## Tests

- Les briques partagées sont déjà couvertes (111 tests) et ne bougent pas.
- Le prototype est **jetable, non testé**.
- À la promotion de la gagnante : adapter les tests de `paint` à la variante
  retenue — c'est le palier qualité réel.

## Sortie du chantier

1. L'utilisateur regarde le prototype dans son navigateur (pas de Playwright).
2. Il désigne la gagnante + les morceaux à piocher dans les autres variantes.
3. Promotion en prod (remplacement de `paint.js` + CSS, briques partagées
   intactes), adaptation des tests, suppression du prototype, commit.
