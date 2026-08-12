# Carte de zone v2 — promotion en prod (hero Itinéraires + section Goutte d'eau)

**Décision utilisateur (2026-08-12, après comparaison du prototype) :**
- **Hero** = variante C « Itinéraires » (routes courbes tracées au survol + temps qui compte) **+ entrée en scène de A** (contour tracé → ondes → cascade de communes).
- **Section Zone** = variante B « Goutte d'eau » (ondes en boucle, temps en badges hors carte, plus d'arcs) **+ entrée en scène de A**.
- Le prototype a validé chaque brique ; ce plan les porte dans la prod.

**Goal :** la carte de prod adopte le mix choisi, tests et build verts, prototype supprimé à la fin.

**Architecture :** un nouveau module `fx.js` (entrée en scène + compteur de minutes) pour ne pas
faire déborder `index.js` ; `paint.js` devient conditionnel au cadrage (`dense`) : hero = arcs +
routes, section = badges + ondes + fils ; le CSS des effets rejoint `zone-map.css`.

## Global Constraints

- Branche `feat/carte-zone-v2` depuis `main`.
- `prefers-reduced-motion: reduce` ⇒ aucune animation ni count-up (garde JS + media queries).
- Pas de lib, pas de canvas — SVG/CSS purs. Commentaires français, ton du code existant.
- Chaînes JS : apostrophes échappées `\'` (leçon du prototype).
- L'onde en pause doit être masquée avec `opacity: 0 !important` (les déclarations d'animation
  battent les déclarations normales — leçon de la revue finale du prototype).
- `index.js` passera à ~207 lignes (dépassement ~200 assumé, +8 lignes d'intégration seulement).
- Après chaque tâche : `npm run test` (111) ; commit dédié.
- Vérification visuelle finale par l'utilisateur (pas de Playwright).

## Leçons du prototype encodées

- TDZ : tout export utilisé pendant l'évaluation d'un autre module doit être déclaré AVANT.
  Ici `fx.js` est une feuille (n'importe que `zones.js`) : pas de cycle.
- Les `@keyframes` avec seulement `from{}` animent vers la valeur calculée au repos, et après
  l'animation (fill both), la valeur se re-résout dynamiquement → les transitions `[data-active]`
  continuent de fonctionner. Validé dans le prototype.
- `el()` (dom.js) ne connaît pas `feTurbulence`/`feDisplacementMap` — sans objet ici (pas de
  filtre rough dans le mix retenu).

---

### Task 1 : `fx.js` + entrée en scène (les deux cadrages)

**Files :** Create `assets/js/site/zone-map/fx.js` ; Modify `assets/js/site/zone-map/index.js`
(imports + 2 appels), `assets/css/zone-map.css` (remplacer l'anim auto du contour, ajouter le
bloc entrée en scène).

`fx.js` :

```js
// Effets de la carte : entrée en scène au défilement et compteur de minutes
// des itinéraires. Isolé pour garder index.js sous la barre des 200 lignes.
import { zoneById } from './zones.js'

/* L'entrée en scène est pilotée par la classe .is-in posée sur le SVG quand il
   devient visible à 25 %. Le rang de cascade (--d) suit l'ordre du DOM : les
   communes sont déjà triées par distance dans buildCommunes. */
export function entree(svg) {
  svg.querySelectorAll('.zm-c').forEach((g, i) => g.style.setProperty('--d', i))
  const obs = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return
    svg.classList.add('is-in')
    obs.disconnect()
  }), { threshold: 0.25 })
  obs.observe(svg)
}

/* Compte 0 → minutes du palier (450 ms) dans le texte de la route survolée.
   Branché comme sink de wireHover : la légende et la ligne d'info le déclenchent
   aussi. Reduced-motion : la valeur s'affiche directement. */
export function compteurSink(svg) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
  const textes = {}
  svg.querySelectorAll('.zm-c:not(.is-hub) .zm-route text').forEach((t) => {
    textes[t.closest('.zm-c').dataset.n] = t
  })
  let raf = 0
  const compter = (c) => {
    const t = textes[c.n]
    if (!t) return
    const fin = parseInt(zoneById(c.z).temps, 10) || 45
    if (RM) { t.textContent = `≤ ${fin} min`; return }
    cancelAnimationFrame(raf)
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 450)
      t.textContent = `≤ ${Math.round(fin * p)} min`
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  return { showCommune: compter }
}
```

`index.js` : importer `{ entree, compteurSink }` ; dans `monterHero` : `entree(svg)` après le
montage et `compteurSink(svg)` ajouté aux sinks de `wireHover` ; dans `monterSection` :
`entree(svg)` (pas de compteur : les routes sont réservées au hero).

`zone-map.css` : remplacer le bloc actuel

```css
@media(prefers-reduced-motion:no-preference){
  .zm-coast{stroke-dasharray:1;stroke-dashoffset:1;animation:zmDraw 2.6s var(--ease) .3s forwards}
}
```

par l'entrée en scène complète (contour keyé sur .is-in, puis ondes, arcs et communes en cascade —
mêmes valeurs que la variante A du prototype : ondes .85s/1s/1.15s, communes 1.2s + 40 ms/rang,
keyframes `zmIn`/`zmRing`/`zmPop` à `from{}` seul).

**Vérif :** 111 tests, build OK. Commit : `feat(zone): entree en scene de la carte au defilement`.

### Task 2 : routes « Itinéraires » dans le hero

**Files :** Modify `assets/js/site/zone-map/paint.js` (le bloc « fil tiré » devient conditionnel :
hero → routes courbes, section → fils actuels), `assets/css/zone-map.css` (styles .zm-route).

Dans `paint.js`, remplacer le bloc fils par :

```js
  // Hero : une route courbe se trace de Toulon vers la commune survolée, avec le
  // temps du palier qui compte (fx.js). Section : le fil droit d'origine.
  svg.querySelectorAll('.zm-c:not(.is-hub)').forEach((g) => {
    const d = g.querySelector('.zm-c__dot')
    const x = Number(d.getAttribute('cx'))
    const y = Number(d.getAttribute('cy'))
    if (!dense) {
      // Point de contrôle décalé de 14 % perpendiculairement : une route, pas une règle.
      const dx = x - CX, dy = y - CY
      const qx = (CX + x) / 2 - dy * 0.14
      const qy = (CY + y) / 2 + dx * 0.14
      g.insertBefore(el('g', { class: 'zm-route' }, [
        el('path', { d: `M${CX} ${CY} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x} ${y}`, pathLength: '1' }),
        el('text', { x, y: y - 16, 'text-anchor': 'middle', text: '' }),
      ]), g.firstChild)
    } else {
      g.insertBefore(el('g', { class: 'zm-lead' }, [
        el('line', { x1: CX, y1: CY, x2: x, y2: y }),
        el('text', {
          x: (CX + x) / 2, y: (CY + y) / 2 - 7, 'text-anchor': 'middle',
          text: `${String(g.dataset.km).replace('.', ',')} km`,
        }),
      ]), g.firstChild)
    }
  })
```

CSS (reprend vc.css du prototype, palette hero) : path orange 2.4, `stroke-dasharray:1 ;
stroke-dashoffset:1` → 0 au survol/is-focus en .45s ; texte blanc cerclé sombre, apparaît avec
un léger retard ; transitions neutralisées sous reduced-motion.

**Vérif :** 111 tests, build OK. Commit : `feat(zone): itineraires traces au survol dans le hero`.

### Task 3 : « Goutte d'eau » dans la section

**Files :** Modify `assets/js/site/zone-map/paint.js` (arcs conditionnels + ondes + badges en
dense), `assets/css/zone-map.css` (.zm-ripple, .zm-badge).

Dans `paint.js` : le bloc arcs passe sous `if (!dense) { … }`. En dense, à la place :

```js
  if (dense) {
    // Deux ondes décalées d'une demi-période : il y a toujours une ondulation en route.
    ;[0, 1].forEach((i) =>
      zones.append(el('circle', { class: 'zm-ripple', cx: CX, cy: CY, r: RMAX, style: `--i:${i}` })))
    // Les temps quittent la carte : badges reliés d'un trait fin, angles étagés.
    const ANG = { r1: -62, r2: -47, r3: -33 }
    ZONES.forEach((z) => {
      const a = (ANG[z.id] * Math.PI) / 180
      const x1 = CX + Math.cos(a) * R[z.id]
      const y1 = CY + Math.sin(a) * R[z.id]
      const x2 = x1 + 34
      const y2 = y1 - 22
      over.append(el('g', { class: 'zm-badge', 'data-zone': z.id }, [
        el('line', { x1, y1, x2, y2 }),
        el('line', { x1: x2, y1: y2, x2: x2 + 26, y2 }),
        el('text', { x: x2 + 32, y: y2 + 5, text: `${z.temps} · ${z.nom}` }),
      ]))
    })
  }
```

(`RMAX` s'importe déjà de `map.js` dans paint.js.) CSS : reprend vb.css du prototype (palette
dense : texte navy cerclé blanc), onde `zmDrop` 6s sous no-preference, pause au survol d'un
palier avec `opacity: 0 !important`, badges estompés/rehaussés par `[data-active]`.

**Vérif :** 111 tests, build OK. Les arcs du hero doivent toujours être là ; plus d'arcs dans la
section. Commit : `feat(zone): ondes et badges de delai dans la section zone`.

### Task 4 : vérification utilisateur, puis nettoyage du labo

1. `npm run dev` → l'utilisateur valide le rendu réel (hero + section + reduced-motion s'il veut).
2. Corrections éventuelles issues de son retour.
3. Passe de revue de code (plugin code-review) sur la branche avant merge.
4. Supprimer `proto-carte.html` + `proto-carte/` ; retirer le bloc « Labo prototype carte »
   du `.gitignore`. Commit : `chore: retire le labo prototype carte`.
5. Merge `feat/carte-zone-v2` → `main`, push.

## Tests

Le mix ne touche que du rendu SVG/CSS (aucune logique de données nouvelle : `fx.js` lit le DOM,
`paint.js` reste du dessin). Comme l'actuel `paint.js`, pas de test unitaire dédié — le projet
n'a pas d'environnement DOM de test (pas de jsdom) et en ajouter un dépasse ce chantier. Le
palier qualité = 111 tests existants verts + build + revue de code + validation visuelle.
