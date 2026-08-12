# Prototype « carte de zone — 4 variantes » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une page prototype locale (gitignorée) montrant 4 variantes améliorées de la carte de zone, chacune aux deux cadrages (hero + section), pour choisir la gagnante visuellement.

**Architecture :** la page importe les briques de prod (`zones.js`, `map.js`, `dom.js`, `render.mjs`) sans les modifier ; chaque variante n'apporte que sa couche de peinture (`paint-x.js`) et son CSS scopé (`vx.css`). Un harnais (`main.js` + `pane.js`) charge les communes une fois et monte 4 × 2 cadrages.

**Tech stack :** vanilla JS (modules ES), SVG, CSS ; Vite en dev ; Supabase (lecture) avec repli embarqué.

**Spec :** `docs/superpowers/specs/2026-08-12-carte-zone-variantes-ameliorees-design.md`

## Global Constraints

- **Zéro modification du code de prod** (`assets/**`, `index.html`). Le prototype est un consommateur.
- Tous les fichiers du prototype sont **gitignorés** : seuls `.gitignore` et les docs se committent.
- Max ~200 lignes par fichier.
- Animations CSS/SVG pures (`stroke-dashoffset`, `transform`, `opacity`) ; pas de lib, pas de canvas.
- `prefers-reduced-motion: reduce` ⇒ aucune animation, état final direct (boucles comprises).
- Imports **relatifs** (convention du projet — le site vanilla n'a pas d'alias `@/`).
- Français dans les commentaires, ton du code existant (commentaires qui expliquent le pourquoi).
- Vérification visuelle : **l'utilisateur regarde lui-même** (`npm run dev` → `http://localhost:5173/proto-carte.html`). Ne pas lancer Playwright.

## Rappels sur les briques de prod (lues, ne pas modifier)

- `assets/js/site/zone-map/zones.js` exporte : `ZONES` (3 paliers `{id:'r1'|'r2'|'r3', km, temps, nom, pitch}`), `HUB`, `LABELS`, `HERO_LABELS`, `VAR_PATH`, `proj(lon,lat)`, `PX_PER_KM`, `buildCommunes(rows)` (→ `{n, lat, lon, d, hub, major, z}` triés par distance), `FALLBACK`, `zoneById(id)`, `distKm`.
- `assets/js/site/zone-map/map.js` exporte : `VIEW_HERO`, `VIEW_ZONE`, `CX`, `CY`, `R` (`{r1,r2,r3}` en px), `RMAX`, `baseMap(uid, communes, {view, dense})` → `{svg, zones, over, defs, clip}`, `ringLegend()`, `caption(nbParZone)` → `{node, show, showCommune, reset}`, `ctaLink(label, href)`, `wireHover(root, svg, communes, ...sinks)` → `{zone, commune, clear}`. Un *sink* est un objet `{show(id), showCommune(c), reset()}` — toutes les méthodes sont optionnelles (`wireHover` appelle `s[fn]?.(arg)`).
- `assets/js/site/zone-map/paint.js` exporte : `paint({svg, defs, zones, over, uid, dense})` — dégradé radial, cercles `.zm-edge`, arcs de temps `.zm-arc`, fils de survol `.zm-lead`.
- `assets/js/site/zone-map/dom.js` exporte : `el(tag, attrs, children)` (SVG et HTML ; `text:` pour textContent).
- `assets/js/site/render.mjs` exporte : `renderCommunes(rows)` → HTML des puces `.zone__chip`.
- `assets/js/admin/client.js` exporte : `supabase` (client ou `null`), `configured` (bool).
- CSS : `assets/css/zone-map.css` (styles `.zm-*`, palette `--zm1/2/3`, `[data-zone]{--z}`), `assets/css/zone.css` (section `.zone`, `.zone__grid`, puces, paliers), `assets/css/base.css` (variables `--blue --navy --orange --sky --cream --font-display --font-body --ease`).
- Astuce CSS utilisée partout ici : un `@keyframes` avec **seulement `from{}`** anime vers la valeur calculée au repos — pas besoin de connaître l'opacité finale de chaque élément.

---

### Task 1 : Squelette — gitignore, page, onglets, chargement des données

**Files:**
- Modify: `.gitignore` (bloc « Labo temporaire », lignes 36-39)
- Create: `proto-carte.html`
- Create: `proto-carte/proto.css`
- Create: `proto-carte/main.js`
- Create: `proto-carte/variants.js`

**Interfaces:**
- Produces : `VARIANTS` (tableau `{id, cls, nom, paint}`) consommé par `main.js` ; conteneurs `.pt-pane[data-v]` dans lesquels Task 2 monte les cadrages ; fonction `chargerCommunes()` locale à `main.js`.

- [ ] **Step 1 : gitignorer le prototype**

Dans `.gitignore`, sous le bloc « Labo temporaire », ajouter :

```gitignore
# Labo prototype carte (jetable)
proto-carte.html
proto-carte/
```

- [ ] **Step 2 : créer `proto-carte.html`**

Reprendre les `<link>` de polices Google Fonts d'`index.html` (le bloc `fonts.googleapis.com` de son `<head>`) tels quels, puis :

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proto — carte de zone (4 variantes)</title>
<!-- ICI : les <link> de polices copiés d'index.html -->
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/zone.css">
<link rel="stylesheet" href="/assets/css/zone-map.css">
<link rel="stylesheet" href="/proto-carte/proto.css">
<link rel="stylesheet" href="/proto-carte/va.css">
<link rel="stylesheet" href="/proto-carte/vb.css">
<link rel="stylesheet" href="/proto-carte/vc.css">
<link rel="stylesheet" href="/proto-carte/vd.css">
</head>
<body class="proto">
<header class="pt-nav">
  <strong>Carte de zone — variantes</strong>
  <nav>
    <button class="pt-tab is-on" data-v="a">A · Éditoriale +</button>
    <button class="pt-tab" data-v="b">B · Goutte d'eau</button>
    <button class="pt-tab" data-v="c">C · Itinéraires</button>
    <button class="pt-tab" data-v="d">D · Carte d'atelier</button>
  </nav>
</header>
<main id="panes"></main>
<script type="module" src="/proto-carte/main.js"></script>
</body>
</html>
```

(Les 4 CSS de variantes n'existent pas encore : créer aussi `va.css`, `vb.css`, `vc.css`, `vd.css` **vides** avec un commentaire d'en-tête, pour que la page ne 404 pas.)

- [ ] **Step 3 : créer `proto-carte/proto.css` (chrome du harnais)**

```css
/* Harnais du prototype carte — onglets + panneaux. Jetable, jamais commité. */
.proto { margin: 0; background: #e9e9f2 }
.pt-nav { position: sticky; top: 0; z-index: 10; display: flex; gap: 1.2rem; align-items: center;
  flex-wrap: wrap; padding: .7rem 1.2rem; background: #fff;
  box-shadow: 0 1px 8px rgba(0, 0, 40, .08); font-family: var(--font-display) }
.pt-nav nav { display: flex; gap: .4rem; flex-wrap: wrap }
.pt-tab { border: 1px solid rgba(0, 0, 60, .15); background: #fff; border-radius: 20px;
  padding: .45rem .9rem; font: 700 13px var(--font-display); color: var(--navy); cursor: pointer }
.pt-tab.is-on { background: var(--navy); color: #fff }
.pt-pane[hidden] { display: none }

/* Cadrage « hero » : reproduit l'ambiance de la vraie section (dégradé bleu nuit). */
.pv { position: relative; overflow: hidden }
.pv--hero { background: linear-gradient(120deg, var(--blue) 0%, #1a1ab0 52%, var(--navy) 100%);
  padding: 3rem clamp(1rem, 6vw, 5rem) }
.pv--hero .zm-hero { max-width: 660px; margin-inline: auto }
/* Le cadrage « section » réutilise la classe .zone : zone.css fait le reste. */
```

- [ ] **Step 4 : créer `proto-carte/variants.js` (registre, une seule variante témoin pour l'instant)**

```js
// Registre des variantes. Chaque variante = sa classe CSS de scope et sa couche
// de peinture. Le témoin « a » utilise la peinture de PROD telle quelle :
// il valide le harnais avant toute nouveauté (remplacé par paintA en Task 3).
import { paint } from '../assets/js/site/zone-map/paint.js'

export const VARIANTS = [
  { id: 'a', cls: 'va', nom: 'Éditoriale +', paint },
]
```

- [ ] **Step 5 : créer `proto-carte/main.js`**

```js
// Harnais : charge les communes UNE fois, crée un panneau par variante,
// gère les onglets, l'entrée en scène (IntersectionObserver) et la parallaxe.
import { supabase, configured } from '../assets/js/admin/client.js'
import { buildCommunes, FALLBACK } from '../assets/js/site/zone-map/zones.js'
import { VARIANTS } from './variants.js'

async function chargerCommunes() {
  if (!configured || !supabase) return FALLBACK
  const { data, error } = await supabase.from('communes').select('*').order('ordre', { ascending: true })
  if (error || !data?.length) return FALLBACK
  return data
}

const rows = await chargerCommunes()
const communes = buildCommunes(rows)
const main = document.getElementById('panes')

for (const v of VARIANTS) {
  const sec = document.createElement('section')
  sec.className = 'pt-pane'
  sec.dataset.v = v.id
  sec.hidden = v.id !== 'a'
  // Le scope CSS de la variante est porté par le pane : .va .zm-c { … }
  sec.classList.add(v.cls)
  main.appendChild(sec)
  // Task 2 branche ici mountHeroPane / mountZonePane.
  void rows; void communes
}

// Onglets : montrer un pane réarme son entrée en scène (retrait de .is-in,
// l'observer la re-déclenche quand le cadrage devient visible).
document.querySelectorAll('.pt-tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.pt-tab').forEach((x) => x.classList.toggle('is-on', x === b))
  document.querySelectorAll('.pt-pane').forEach((p) => { p.hidden = p.dataset.v !== b.dataset.v })
  document.querySelectorAll(`.pt-pane[data-v="${b.dataset.v}"] .pv`).forEach((p) => p.classList.remove('is-in'))
}))

// Entrée en scène : .is-in posé quand le cadrage est visible à 25 %.
const obs = new IntersectionObserver((entries) => entries.forEach((x) => {
  if (x.isIntersecting) x.target.classList.add('is-in')
}), { threshold: 0.25 })
export const observerPane = (el) => obs.observe(el)

// Parallaxe légère (reprise de la prod), sur le pane visible seulement.
if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
  addEventListener('mousemove', (e) => {
    const dx = ((e.clientX - innerWidth / 2) * 0.02).toFixed(1)
    const dy = ((e.clientY - innerHeight / 2) * 0.02).toFixed(1)
    document.querySelectorAll('.pt-pane:not([hidden]) svg.zm').forEach((s) => {
      s.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
    })
  }, { passive: true })
}
```

- [ ] **Step 6 : vérifier dans le navigateur (utilisateur ou console réseau)**

Run : `npm run dev` (en tâche de fond) puis proposer à l'utilisateur d'ouvrir `http://localhost:5173/proto-carte.html`.
Attendu : page avec la barre d'onglets, panes vides, **zéro erreur console** (vérifiable via `curl -s localhost:5173/proto-carte.html | findstr pt-nav` pour le serveur ; le rendu, c'est l'utilisateur).

- [ ] **Step 7 : commit (uniquement `.gitignore`)**

```bash
git add .gitignore
git commit -m "chore: gitignore le labo prototype carte"
```

---

### Task 2 : `pane.js` — montage des deux cadrages, variante témoin fonctionnelle

**Files:**
- Create: `proto-carte/pane.js`
- Modify: `proto-carte/main.js` (brancher les mounts)

**Interfaces:**
- Consumes : `VARIANTS` (Task 1), briques de prod (voir « Rappels »).
- Produces : `mountHeroPane(sec, v, communes)` et `mountZonePane(sec, v, rows, communes)`. Contrat de peinture : `v.paint(ctx)` avec `ctx = {svg, zones, over, defs, uid, clip, dense, communes}` ; retour **optionnel** `{ sinks: [sink] }` passé à `wireHover` (utilisé par la variante C).

- [ ] **Step 1 : créer `proto-carte/pane.js`**

```js
// Montage d'un cadrage (hero ou section) pour une variante donnée.
// Copie allégée d'index.js (prod) : le prototype ne modifie PAS la prod,
// il duplique ces ~100 lignes de montage — c'est le prix du jetable.
import { ZONES, zoneById } from '../assets/js/site/zone-map/zones.js'
import { baseMap, ringLegend, caption, ctaLink, wireHover, VIEW_HERO, VIEW_ZONE } from '../assets/js/site/zone-map/map.js'
import { el } from '../assets/js/site/zone-map/dom.js'
import { renderCommunes } from '../assets/js/site/render.mjs'
import { observerPane } from './main.js'

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/g, '')
const nbParZone = (communes) => Object.fromEntries(ZONES.map((z) => [z.id, communes.filter((c) => c.z === z.id).length]))

export function mountHeroPane(sec, v, communes) {
  const wrap = el('div', { class: 'pv pv--hero' })
  const root = el('div', { class: 'zm-hero' })
  const { svg, zones, over, defs, clip } = baseMap(`${v.id}h`, communes, { view: VIEW_HERO })
  const extra = v.paint({ svg, zones, over, defs, uid: `${v.id}h`, clip, dense: false, communes })
  const nz = nbParZone(communes)
  const cap = caption(nz)
  const leg = ringLegend()
  root.append(el('div', { class: 'zm-hero__map' }, [svg]), leg, cap.node,
    ctaLink('Votre commune est-elle couverte ?', '#'))
  const { zone } = wireHover(root, svg, communes, cap, ...(extra?.sinks || []))
  leg.querySelectorAll('.zm-legend__i').forEach((b) => {
    ;['mouseenter', 'focus'].forEach((e) => b.addEventListener(e, () => zone(b.dataset.zone)))
    ;['mouseleave', 'blur'].forEach((e) => b.addEventListener(e, () => zone(null)))
  })
  wrap.append(root)
  sec.append(wrap)
  observerPane(wrap)
}

export function mountZonePane(sec, v, rows, communes) {
  const wrap = el('section', { class: 'zone pv pv--zone' })
  const inner = el('div', { class: 'zone__inner' }, [
    el('p', { class: 'zone__eyebrow', text: "Zone d'intervention" }),
    el('h2', { text: 'Ploméo intervient autour de Toulon' }),
    el('div', { class: 'zone__proof' }),
    el('div', { class: 'zone__grid' }, [el('div', { class: 'zone__map' }), el('div', { class: 'zone__paliers' })]),
    el('div', { class: 'zone__search' }),
    el('div', { class: 'zone__communes' }),
  ])
  wrap.append(inner)
  sec.append(wrap)

  const { svg, zones, over, defs, clip } = baseMap(`${v.id}z`, communes, { view: VIEW_ZONE, dense: true })
  const extra = v.paint({ svg, zones, over, defs, uid: `${v.id}z`, clip, dense: true, communes })
  inner.querySelector('.zone__map').replaceChildren(svg)

  const nz = nbParZone(communes)
  inner.querySelector('.zone__proof').replaceChildren(...[
    [String(communes.length), 'communes desservies'],
    [String(nz[ZONES[0].id]), `à moins de ${ZONES[0].temps}`],
    ['Gratuit', 'devis sans engagement'],
  ].map(([b, s]) => el('div', { class: 'zone__proof-i' }, [el('b', { text: b }), el('span', { text: s })])))

  const lignes = ZONES.map((z) => el('button', { type: 'button', class: 'zone__palier', 'data-zone': z.id }, [
    el('div', { class: 'zone__palier-head' }, [
      el('span', { class: 'zone__palier-temps', text: z.temps }),
      el('span', { class: 'zone__palier-nom', text: z.nom }),
      el('span', { class: 'zone__palier-n', text: `${nz[z.id]} communes` }),
    ]),
    el('p', { class: 'zone__palier-pitch', text: z.pitch }),
  ]))
  inner.querySelector('.zone__paliers').replaceChildren(...lignes)

  const box = inner.querySelector('.zone__communes')
  const parNom = Object.fromEntries(communes.map((c) => [c.n, c]))
  box.innerHTML = renderCommunes(rows.map((r) => ({ nom: r.nom, zone: parNom[r.nom]?.z })))
  const puces = [...box.querySelectorAll('.zone__chip')]
  puces.forEach((p) => p.classList.add('is-in'))

  const sink = {
    show: (id) => { lignes.forEach((r) => r.classList.toggle('is-on', r.dataset.zone === id)); puces.forEach((p) => p.classList.remove('is-hit')) },
    showCommune: (c) => { lignes.forEach((r) => r.classList.toggle('is-on', r.dataset.zone === c.z)); puces.forEach((p) => p.classList.toggle('is-hit', p.dataset.n === c.n)) },
    reset: () => { lignes.forEach((r) => r.classList.remove('is-on')); puces.forEach((p) => p.classList.remove('is-hit')) },
  }
  const { zone, commune, clear } = wireHover(inner, svg, communes, sink, ...(extra?.sinks || []))
  lignes.forEach((r) => {
    ;['mouseenter', 'focus'].forEach((e) => r.addEventListener(e, () => zone(r.dataset.zone)))
    ;['mouseleave', 'blur'].forEach((e) => r.addEventListener(e, () => zone(null)))
  })
  puces.forEach((p) => {
    const c = communes.find((x) => x.n === p.dataset.n)
    if (!c) return
    p.addEventListener('mouseenter', () => commune(c))
    p.addEventListener('mouseleave', clear)
  })
  brancherRecherche(inner, communes, commune, clear)
  observerPane(wrap)
}

/* Recherche de commune — copie de la prod (index.js). */
function brancherRecherche(root, communes, commune, clear) {
  const box = root.querySelector('.zone__search')
  const input = el('input', {
    type: 'search', class: 'zone__search-in', autocomplete: 'off',
    placeholder: 'Votre commune ? Ex. Solliès-Pont, La Crau, Bandol…',
    'aria-label': 'Vérifier si votre commune est desservie',
  })
  const out = el('p', { class: 'zone__search-out', 'aria-live': 'polite' })
  box.replaceChildren(input, out)
  input.addEventListener('input', () => {
    const q = norm(input.value)
    out.className = 'zone__search-out'
    if (q.length < 2) { out.textContent = ''; return clear() }
    const hit = communes.find((c) => norm(c.n).startsWith(q)) || communes.find((c) => norm(c.n).includes(q))
    if (hit) {
      const z = zoneById(hit.z)
      out.className = 'zone__search-out is-yes'
      out.dataset.zone = z.id
      out.textContent = `Oui — ${hit.n} : intervention sous ${z.temps} (${z.nom}).`
      commune(hit)
    } else {
      out.className = 'zone__search-out is-no'
      out.textContent = 'Pas dans notre liste — écrivez-nous, on vous dit tout de suite si on peut s’y rendre.'
      clear()
    }
  })
}
```

- [ ] **Step 2 : brancher dans `main.js`**

Dans la boucle `for (const v of VARIANTS)`, remplacer `void rows; void communes` par :

```js
  mountHeroPane(sec, v, communes)
  mountZonePane(sec, v, rows, communes)
```

et ajouter l'import en tête : `import { mountHeroPane, mountZonePane } from './pane.js'`.
⚠️ Import circulaire `main.js ⇄ pane.js` (pane importe `observerPane`) : légal en modules ES ici, car `observerPane` n'est appelé qu'après l'évaluation complète de `main.js`. Ne pas « corriger ».

- [ ] **Step 3 : vérification**

Run : recharger `http://localhost:5173/proto-carte.html` (utilisateur).
Attendu : onglet A = la carte actuelle aux deux cadrages, survol paliers/communes OK, recherche OK, puces liées OK, zéro erreur console.

Contrôle automatisable (sans navigateur) : `npm run test` → toujours 111 tests OK (la prod n'a pas bougé).

- [ ] **Step 4 : pas de commit** (fichiers gitignorés — noter l'avancement, c'est tout).

---

### Task 3 : Variante A « Éditoriale + » — entrée en scène + lisibilité

**Files:**
- Create: `proto-carte/paint-a.js`
- Modify: `proto-carte/va.css` (créé vide en Task 1)
- Modify: `proto-carte/variants.js` (brancher `paintA`)

**Interfaces:**
- Consumes : `paint` (prod), contrat `v.paint(ctx)` de Task 2.
- Produces : `paintA(ctx)` ; variable CSS `--d` (rang de distance) sur chaque `.zm-c`.

- [ ] **Step 1 : `proto-carte/paint-a.js`**

```js
// Variante A « Éditoriale + » : la peinture de prod, plus une chorégraphie
// d'entrée (pilotée par va.css via .is-in) et un rang de cascade par commune.
import { paint } from '../assets/js/site/zone-map/paint.js'

export function paintA(ctx) {
  paint(ctx)
  // Les communes arrivent des plus proches aux plus lointaines : buildCommunes
  // les trie déjà par distance, l'index suffit comme rang.
  ctx.svg.querySelectorAll('.zm-c').forEach((g, i) => g.style.setProperty('--d', i))
}
```

- [ ] **Step 2 : `proto-carte/va.css`**

```css
/* Variante A « Éditoriale + » — scope .va.
   Entrée en scène : contour tracé → ondes en cascade → communes qui poppent.
   Astuce : les @keyframes n'ont qu'un from{} — l'arrivée est la valeur au repos. */

/* Lisibilité (s'applique aussi reduced-motion) : arcs plus francs, estompage
   plus marqué des communes hors palier survolé, capitale plus affirmée. */
.va .zm-arc { opacity: .85; font-weight: 800 }
.va .zm--dense .zm-arc { opacity: .9 }
.va [data-active] .zm-c { opacity: .12 }
.va .zm-c.is-hub .zm-c__lab { font-size: 22px }
.va .zm--dense .zm-c.is-named:not(.is-hub) .zm-c__lab { opacity: .8 }

@media (prefers-reduced-motion: no-preference) {
  /* 1. Le contour du Var se trace (~1 s). On neutralise l'anim de prod (zmDraw
     au chargement) pour la re-déclencher au bon moment, à l'entrée en vue. */
  .va .zm-coast { animation: none; stroke-dashoffset: 1 }
  .va .pv.is-in .zm-coast { animation: zmDraw 1s var(--ease) forwards }

  /* 2. Dégradé + ondes, en cascade après le tracé. */
  .va .pv:not(.is-in) .zm-glow,
  .va .pv:not(.is-in) .zm-edge,
  .va .pv:not(.is-in) .zm-arc { opacity: 0 }
  .va .pv.is-in .zm-glow { animation: vaIn .9s ease .75s both }
  .va .zm-edge { transform-box: fill-box; transform-origin: center }
  .va .pv.is-in .zm-edge { animation: vaRing .7s var(--ease) both }
  .va .pv.is-in .zm-edge[data-zone="r1"] { animation-delay: .85s }
  .va .pv.is-in .zm-edge[data-zone="r2"] { animation-delay: 1s }
  .va .pv.is-in .zm-edge[data-zone="r3"] { animation-delay: 1.15s }
  .va .pv.is-in .zm-arc { animation: vaIn .5s ease both; animation-delay: 1.3s }

  /* 3. Les communes poppent par distance croissante (--d posé par paint-a). */
  .va .pv:not(.is-in) .zm-c { opacity: 0 }
  .va .zm-c { transform-box: fill-box; transform-origin: center }
  .va .pv.is-in .zm-c { animation: vaPop .45s var(--ease) both;
    animation-delay: calc(1.2s + var(--d, 0) * 40ms) }
}

@keyframes vaIn { from { opacity: 0 } }
@keyframes vaRing { from { opacity: 0; transform: scale(.2) } }
@keyframes vaPop { from { opacity: 0; transform: scale(.5) } }
```

- [ ] **Step 3 : brancher dans `variants.js`**

```js
import { paintA } from './paint-a.js'

export const VARIANTS = [
  { id: 'a', cls: 'va', nom: 'Éditoriale +', paint: paintA },
]
```

(l'import de `paint` prod sort de `variants.js` s'il n'y est plus utilisé).

- [ ] **Step 4 : vérification**

Utilisateur : onglet A → au scroll d'arrivée sur chaque cadrage : tracé du contour, puis ondes r1→r2→r3, puis cascade de communes. Rejouable en changeant d'onglet et en revenant. Avec « réduire les animations » (réglage OS) : tout est affiché immédiatement, rien ne bouge.

---

### Task 4 : Variante B « Goutte d'eau » — ondes en boucle + badges hors carte

**Files:**
- Create: `proto-carte/paint-b.js`
- Modify: `proto-carte/vb.css`
- Modify: `proto-carte/variants.js` (ajouter l'entrée B)

**Interfaces:**
- Consumes : `paint` (prod), `paintA` non — B repart de la prod + sa touche ; `CX, CY, R, RMAX` de `map.js` ; `ZONES` de `zones.js` ; `el` de `dom.js`.
- Produces : `paintB(ctx)` ; nœuds `.zm-ripple` (2, `--i:0|1`) et `.zm-badge[data-zone]`.

- [ ] **Step 1 : `proto-carte/paint-b.js`**

```js
// Variante B « Goutte d'eau » : les paliers respirent en ondes lentes ; les
// temps quittent la carte pour des badges reliés d'un trait fin. Sans arcs.
import { paint } from '../assets/js/site/zone-map/paint.js'
import { ZONES } from '../assets/js/site/zone-map/zones.js'
import { CX, CY, R, RMAX } from '../assets/js/site/zone-map/map.js'
import { el } from '../assets/js/site/zone-map/dom.js'

const rad = (deg) => (deg * Math.PI) / 180
// Angles étagés vers le haut-droit : les traits ne se croisent pas.
const ANG = { r1: -62, r2: -47, r3: -33 }

export function paintB(ctx) {
  paint(ctx)
  ctx.over.querySelectorAll('.zm-arc').forEach((t) => t.remove())

  // Deux ondes décalées d'une demi-période : il y a toujours une ondulation en route.
  ;[0, 1].forEach((i) =>
    ctx.zones.append(el('circle', { class: 'zm-ripple', cx: CX, cy: CY, r: RMAX, style: `--i:${i}` })))

  ZONES.forEach((z) => {
    const a = rad(ANG[z.id])
    const x1 = CX + Math.cos(a) * R[z.id]
    const y1 = CY + Math.sin(a) * R[z.id]
    const x2 = x1 + 34
    const y2 = y1 - 22
    ctx.over.append(el('g', { class: 'zm-badge', 'data-zone': z.id }, [
      el('line', { x1, y1, x2, y2 }),
      el('line', { x1: x2, y1: y2, x2: x2 + 26, y2 }),
      el('text', { x: x2 + 32, y: y2 + 5, text: `${z.temps} · ${z.nom}` }),
    ]))
  })
}
```

- [ ] **Step 2 : `proto-carte/vb.css`**

```css
/* Variante B « Goutte d'eau » — scope .vb.
   L'onde : un cercle plein rayon, réduit par transform puis relâché — le
   stroke-width épais au départ s'affine en s'étalant, comme une vraie onde. */
.vb .zm-ripple { fill: none; stroke: var(--sky); stroke-width: 2; opacity: 0;
  transform-box: fill-box; transform-origin: center; pointer-events: none }
@media (prefers-reduced-motion: no-preference) {
  .vb .zm-ripple { animation: vbDrop 6s ease-out infinite;
    animation-delay: calc(var(--i, 0) * 3s) }
}
@keyframes vbDrop {
  0% { transform: scale(.04); opacity: .5; stroke-width: 26 }
  70% { opacity: .16 }
  100% { transform: scale(1); opacity: 0; stroke-width: 2 }
}
/* Le survol d'un palier suspend la respiration : l'attention est ailleurs. */
.vb [data-active] .zm-ripple { animation-play-state: paused; opacity: 0 }

/* Badges hors carte, reliés d'un trait fin. */
.vb .zm-badge line { stroke: var(--z); stroke-width: 1.2; opacity: .55 }
.vb .zm-badge text { fill: #fff; font: 700 13px var(--font-display);
  paint-order: stroke; stroke: rgba(2, 2, 24, .55); stroke-width: 3px }
.vb .zm--dense .zm-badge text { fill: var(--navy); stroke: #fff; stroke-width: 3.5px }
.vb [data-active] .zm-badge { opacity: .25 }
.vb [data-active="r1"] .zm-badge[data-zone="r1"],
.vb [data-active="r2"] .zm-badge[data-zone="r2"],
.vb [data-active="r3"] .zm-badge[data-zone="r3"] { opacity: 1 }
.vb [data-active="r1"] .zm-badge[data-zone="r1"] text,
.vb [data-active="r2"] .zm-badge[data-zone="r2"] text,
.vb [data-active="r3"] .zm-badge[data-zone="r3"] text { fill: var(--z) }
```

- [ ] **Step 3 : ajouter B au registre**

Dans `variants.js` : `import { paintB } from './paint-b.js'` puis
`{ id: 'b', cls: 'vb', nom: 'Goutte d’eau', paint: paintB },`.

- [ ] **Step 4 : vérification**

Utilisateur : onglet B → plus d'arcs sur la carte ; ondes lentes toutes les ~3 s ; badges lisibles aux deux cadrages (sinon ajuster `ANG` / `x2/y2` à l'œil) ; survol d'un palier = badge du palier en avant, ondes en pause. Reduced-motion : pas d'ondes, badges statiques.

---

### Task 5 : Variante C « Itinéraires » — route tracée + temps qui compte

**Files:**
- Create: `proto-carte/paint-c.js`
- Modify: `proto-carte/vc.css`
- Modify: `proto-carte/variants.js` (ajouter l'entrée C)

**Interfaces:**
- Consumes : `paint` (prod), `CX, CY` de `map.js`, `el` de `dom.js` ; contrat `{sinks}` de Task 2 (le count-up est déclenché par `showCommune`, donc aussi par la **recherche** et les puces — pas seulement le survol).
- Produces : `paintC(ctx)` → `{ sinks: [sink] }` ; nœuds `.zm-route` (path + text) par commune.

- [ ] **Step 1 : `proto-carte/paint-c.js`**

```js
// Variante C « Itinéraires » : au survol (ou à la recherche), une route courbe
// se trace de Toulon vers la commune et le temps du palier compte de 0 au max.
import { paint } from '../assets/js/site/zone-map/paint.js'
import { CX, CY } from '../assets/js/site/zone-map/map.js'
import { el } from '../assets/js/site/zone-map/dom.js'

const MIN = { r1: 15, r2: 30, r3: 45 }
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches

export function paintC(ctx) {
  paint(ctx)
  const temps = {}
  ctx.svg.querySelectorAll('.zm-c:not(.is-hub)').forEach((g) => {
    g.querySelector('.zm-lead')?.remove() // la route remplace le fil droit
    const dot = g.querySelector('.zm-c__dot')
    const x = Number(dot.getAttribute('cx'))
    const y = Number(dot.getAttribute('cy'))
    // Point de contrôle décalé de 14 % perpendiculairement : une route, pas une règle.
    const dx = x - CX, dy = y - CY
    const qx = (CX + x) / 2 - dy * 0.14
    const qy = (CY + y) / 2 + dx * 0.14
    const route = el('g', { class: 'zm-route' }, [
      el('path', { d: `M${CX} ${CY} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x} ${y}`, pathLength: '1' }),
      el('text', { x, y: y - 16, 'text-anchor': 'middle', text: `≤ ${MIN[g.dataset.zone]} min` }),
    ])
    g.insertBefore(route, g.firstChild)
    temps[g.dataset.n] = route.querySelector('text')
  })

  // Count-up 0 → minutes du palier (450 ms), déclenché quand une commune s'allume.
  let raf = 0
  const compter = (c) => {
    const t = temps[c.n]
    if (!t) return
    const fin = MIN[c.z] || 45
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
  return { sinks: [{ showCommune: compter }] }
}
```

- [ ] **Step 2 : `proto-carte/vc.css`**

```css
/* Variante C « Itinéraires » — scope .vc. La route se dessine en ~0,45 s
   (stroke-dashoffset 1 → 0, pathLength normalisé), le temps compte en JS. */
.vc .zm-route { pointer-events: none }
.vc .zm-route path { fill: none; stroke: var(--orange); stroke-width: 2.4;
  stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0;
  transition: stroke-dashoffset .45s var(--ease), opacity .12s }
.vc .zm-c:hover .zm-route path, .vc .zm-c:focus-visible .zm-route path,
.vc .zm-c.is-focus .zm-route path { stroke-dashoffset: 0; opacity: 1 }
.vc .zm-route text { fill: #fff; font: 800 15px var(--font-display);
  paint-order: stroke; stroke: rgba(2, 2, 24, .65); stroke-width: 3.5px;
  opacity: 0; transition: opacity .15s .15s }
.vc .zm-c:hover .zm-route text, .vc .zm-c:focus-visible .zm-route text,
.vc .zm-c.is-focus .zm-route text { opacity: 1 }
.vc .zm--dense .zm-route text { fill: var(--navy); stroke: #fff; stroke-width: 4px }
@media (prefers-reduced-motion: reduce) {
  .vc .zm-route path, .vc .zm-route text { transition: none }
}
```

- [ ] **Step 3 : ajouter C au registre**

`import { paintC } from './paint-c.js'` puis `{ id: 'c', cls: 'vc', nom: 'Itinéraires', paint: paintC },`.

- [ ] **Step 4 : vérification**

Utilisateur : onglet C → survol d'une commune : la route se dessine avec un léger galbe + « ≤ 25 min » qui compte ; taper « Bandol » dans la recherche du cadrage section : même trajet dessiné (via `is-focus`). Reduced-motion : route affichée sans tracé progressif, temps sans count-up.

---

### Task 6 : Variante D « Carte d'atelier » — papier, trait manuel, tampons

**Files:**
- Create: `proto-carte/paint-d.js`
- Modify: `proto-carte/vd.css`
- Modify: `proto-carte/variants.js` (ajouter l'entrée D)

**Interfaces:**
- Consumes : `ZONES`, `CX, CY, R`, `el`. **N'appelle PAS** la peinture de prod (pas de dégradé, pas d'arcs) — c'est la rupture.
- Produces : `paintD(ctx)` ; nœuds `.zm-compas[data-zone]`, `.zm-stamp[data-zone]`, `.zm-lead` (propres), `.zm-x` (croix de repère) ; filtre SVG `#<uid>-rough`.

- [ ] **Step 1 : `proto-carte/paint-d.js`**

```js
// Variante D « Carte d'atelier » : la carte punaisée dans le fourgon. Papier,
// trait tremblé (turbulence + displacement), cercles au compas, tampons d'encre.
import { ZONES } from '../assets/js/site/zone-map/zones.js'
import { CX, CY, R } from '../assets/js/site/zone-map/map.js'
import { el } from '../assets/js/site/zone-map/dom.js'

export function paintD({ svg, zones, over, defs, uid }) {
  // Tremblé du trait : un bruit fractal déplace légèrement chaque pixel du tracé.
  const fid = `${uid}-rough`
  const f = el('filter', { id: fid, x: '-5%', y: '-5%', width: '110%', height: '110%' })
  f.append(
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.012', numOctaves: '2', result: 'n' }),
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '4' }),
  )
  defs.append(f)
  svg.querySelector('.zm-coast')?.setAttribute('filter', `url(#${fid})`)

  // Cercles de palier « au compas » (pointillés), même tremblé.
  ;[...ZONES].reverse().forEach((z) =>
    zones.append(el('circle', {
      class: 'zm-compas', 'data-zone': z.id, cx: CX, cy: CY, r: R[z.id], filter: `url(#${fid})`,
    })))

  // Tampons d'encre inclinés, étagés sur le haut-gauche de chaque cercle.
  ZONES.forEach((z, i) => {
    const a = ((-138 + i * 10) * Math.PI) / 180
    const x = CX + Math.cos(a) * R[z.id]
    const y = CY + Math.sin(a) * R[z.id]
    over.append(el('g', { class: 'zm-stamp', 'data-zone': z.id, transform: `rotate(-8 ${x} ${y})` }, [
      el('rect', { x: x - 46, y: y - 15, width: 92, height: 30, rx: 5 }),
      el('text', { x, y: y + 6, 'text-anchor': 'middle', text: `- ${z.temps.toUpperCase()}` }),
    ]))
  })

  // Fil de survol (repris de la prod, à l'encre) + croix de repère de tournée.
  svg.querySelectorAll('.zm-c:not(.is-hub)').forEach((g) => {
    const d = g.querySelector('.zm-c__dot')
    const x = Number(d.getAttribute('cx'))
    const y = Number(d.getAttribute('cy'))
    g.insertBefore(el('g', { class: 'zm-lead' }, [
      el('line', { x1: CX, y1: CY, x2: x, y2: y }),
      el('text', {
        x: (CX + x) / 2, y: (CY + y) / 2 - 7, 'text-anchor': 'middle',
        text: `${String(g.dataset.km).replace('.', ',')} km`,
      }),
    ]), g.firstChild)
    g.append(
      el('line', { class: 'zm-x', x1: x - 4.5, y1: y - 4.5, x2: x + 4.5, y2: y + 4.5 }),
      el('line', { class: 'zm-x', x1: x - 4.5, y1: y + 4.5, x2: x + 4.5, y2: y - 4.5 }),
    )
  })
}
```

- [ ] **Step 2 : `proto-carte/vd.css`**

```css
/* Variante D « Carte d'atelier » — scope .vd. Papier craft, encre, rouille.
   Le hero devient papier lui aussi : la rupture est le sujet, on la montre. */
.vd .pv--hero { background: #ecdfc4 }
.vd .pv--zone { background: #f2e7d0 }
.vd .pv::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background-image: radial-gradient(rgba(91, 70, 50, .07) 1px, transparent 1.4px);
  background-size: 5px 5px }

.vd .zm-land { fill: rgba(120, 90, 50, .07) }
.vd .zm-coast { stroke: #5b4632; stroke-width: 2.6; opacity: .85; animation: none;
  stroke-dasharray: none; stroke-dashoffset: 0 }
.vd .zm-glow, .vd .zm-edge, .vd .zm-arc, .vd .zm-ping { display: none }

.vd .zm-compas { fill: none; stroke: #7a5c3e; stroke-width: 1.6; stroke-dasharray: 2 7;
  opacity: .5; transition: opacity .3s, stroke-width .3s }
.vd [data-active] .zm-compas { opacity: .22 }
.vd [data-active="r1"] .zm-compas[data-zone="r1"],
.vd [data-active="r2"] .zm-compas[data-zone="r2"],
.vd [data-active="r3"] .zm-compas[data-zone="r3"] { opacity: .95; stroke-width: 2.4 }

.vd .zm-stamp { opacity: .78 }
.vd .zm-stamp rect { fill: none; stroke: #b33a2b; stroke-width: 2.4 }
.vd .zm-stamp text { fill: #b33a2b; font: 800 16px var(--font-display); letter-spacing: .12em }
.vd [data-active] .zm-stamp { opacity: .3 }
.vd [data-active="r1"] .zm-stamp[data-zone="r1"],
.vd [data-active="r2"] .zm-stamp[data-zone="r2"],
.vd [data-active="r3"] .zm-stamp[data-zone="r3"] { opacity: 1 }

/* Communes : la croix de repère remplace le point ; étiquettes à l'encre. */
.vd .zm-c__dot { fill: transparent; stroke: none }
.vd .zm-x { stroke: #38301f; stroke-width: 2.2; stroke-linecap: round; pointer-events: none }
.vd .zm-c.is-hub .zm-c__dot { fill: #b33a2b; stroke: #38301f; stroke-width: 2 }
.vd .zm-c__ring { stroke: #b33a2b }
.vd .zm-c__lab { fill: #38301f; stroke: #f2e7d0; letter-spacing: -.01em }
.vd .zm-lead line { stroke: #38301f }
.vd .zm-lead text { fill: #38301f; stroke: #f2e7d0 }

/* Le chrome du hero (légende, ligne d'info, CTA) passe à l'encre sur papier. */
.vd .zm-legend__i { background: rgba(91, 70, 50, .08); border-color: rgba(91, 70, 50, .28);
  color: #5b4632; backdrop-filter: none }
.vd .zm-legend__i b, .vd .zm-legend__i:hover, .vd .zm-legend__i:focus-visible { color: #38301f }
.vd .zm-cap { color: #5b4632 }
.vd .zm-cap.is-on { color: #38301f }
.vd .zm-cap b { color: #38301f }
.vd .zm-cta { color: #38301f; border-bottom-color: rgba(56, 48, 31, .4) }
.vd .zm-hero__map .zm { filter: none }
```

- [ ] **Step 3 : ajouter D au registre**

`import { paintD } from './paint-d.js'` puis `{ id: 'd', cls: 'vd', nom: 'Carte d’atelier', paint: paintD },`.

- [ ] **Step 4 : vérification**

Utilisateur : onglet D → papier aux deux cadrages, contour tremblé, cercles pointillés, 3 tampons lisibles, croix + étiquettes encre, survol paliers/communes fonctionnel (fil à l'encre). Reduced-motion : identique (D n'a pas d'animation propre).

---

### Task 7 : Filet de sécurité final + remise à l'utilisateur

**Files:** aucun nouveau — vérifications.

- [ ] **Step 1 : prouver que la prod n'a pas bougé**

Run : `git status --short`
Attendu : **vide** (tout le prototype est gitignoré ; `.gitignore` et docs déjà committés).

- [ ] **Step 2 : tests et build**

Run : `npm run test` → attendu : 111 tests OK.
Run : `npm run build` → attendu : build OK (le prototype, hors `rollupOptions.input`, n'est pas embarqué).

- [ ] **Step 3 : remise**

Message à l'utilisateur : ouvrir `http://localhost:5173/proto-carte.html`, comparer A/B/C/D aux deux cadrages (+ mode « réduire les animations » si possible), puis désigner **la gagnante et les morceaux à piocher** dans les autres. La promotion en prod (remplacement `paint.js` + CSS + tests adaptés + suppression du prototype) fera l'objet d'un plan séparé une fois le choix connu.

---

## Self-review (faite à l'écriture du plan)

- **Couverture spec :** page proto gitignorée ✔ (T1) ; briques prod importées sans modification ✔ (T2, garde T7) ; données partagées + repli ✔ (T1) ; variante A entrée en scène + lisibilité ✔ (T3) ; B ondes + badges ✔ (T4) ; C routes + count-up, recherche comprise ✔ (T5) ; D papier/tampons ✔ (T6) ; reduced-motion partout ✔ (T3-T6) ; perf CSS/SVG pur ✔ ; sortie du chantier ✔ (T7).
- **Types/signatures :** contrat `v.paint(ctx)` et `{sinks}` définis en T2, respectés en T3-T6 ; `observerPane` exporté T1, consommé T2.
- **Écart spec assumé :** la spec nommait `proto-carte.js` ; le plan découpe en dossier `proto-carte/` (main, pane, 4 paints, 5 css) pour respecter la règle ~200 lignes/fichier. Même esprit, mêmes garanties (tout gitignoré).
