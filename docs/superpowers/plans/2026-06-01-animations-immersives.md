# Animations immersives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une couche d'animation immersive (reveals, parallaxe, curseur custom, smooth-scroll) à la landing page Ploméo, sans dégrader perf/conversion/accessibilité.

**Architecture:** Vanilla modulaire, **additif** (on ne réécrit pas l'existant). Deux nouveaux fichiers (`assets/css/animations.css`, `assets/js/anim.js`), pilotage par attributs HTML (`data-reveal`, `data-parallax`, `data-mouse`, `.magnetic`, `.tilt`). Smooth-scroll via Lenis **vendorisé en local** (`assets/vendor/lenis.min.js`, même origine — pas de CDN tiers ni de souci SRI). Garde-fous : drapeau `.js-anim` (posé tôt, sauf reduced-motion), gating `pointer:fine` pour la souris, fallback « rien d'invisible sans JS ».

**Tech Stack:** HTML/CSS/JS statique (pas de build), Lenis 1.x (vendorisé localement), IntersectionObserver, requestAnimationFrame.

**Spec :** `docs/superpowers/specs/2026-06-01-animations-immersives-design.md`
**Branche :** `feat/animations-immersives` (le working tree contient aussi des changements non committés du « lot 🔧 », indépendants — ne pas les committer dans ce lot).

---

## Conventions de vérification (pas de suite de tests dans ce projet)

- **Serveur local** (à lancer une fois, en arrière-plan), depuis la racine du projet :
  ```bash
  node -e "const http=require('http'),fs=require('fs'),p=require('path');const root=process.cwd();http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';f=p.join(root,f);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('404')}else{const t={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'}[p.extname(f)]||'application/octet-stream';r.writeHead(200,{'Content-Type':t});r.end(d)}})}).listen(8137,()=>console.log('UP_8137'))"
  ```
- **Playwright (MCP)** : `browser_navigate` vers `http://localhost:8137/index.html`, `browser_console_messages level:error`, `browser_take_screenshot`, `browser_resize`, `browser_evaluate` pour scroller/inspecter. `file://` est bloqué → toujours passer par le serveur.
- **Note intro** : l'intro se joue 1×/session (sessionStorage `plomeo_intro`). Pour revoir l'état initial pendant les tests, ouvrir un onglet privé ou exécuter `sessionStorage.clear()` via `browser_evaluate`.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `assets/css/animations.css` | classes utilitaires, reveals, curseur, barre de progression, Lenis CSS, fallback `:not(.js-anim)`, reduced-motion | **Créer** |
| `assets/js/anim.js` | contrôleur : scrollspy, reveals, Lenis, parallaxe, souris, boucle rAF | **Créer** |
| `assets/vendor/lenis.min.js` | lib Lenis vendorisée (téléchargée, servie en même origine) | **Créer** |
| `index.html` | `<link>` + script `.js-anim` (head), Lenis local + `anim.js` (fin body), éléments curseur/barre, attributs sur les sections, `poster` hero | **Modifier** |
| `assets/js/main.js` | compteurs déclenchés à l'entrée (au lieu d'immédiatement) | **Modifier** |

---

## Task 1 : Fondations CSS + drapeau `.js-anim` + éléments globaux

**Files:**
- Create: `assets/css/animations.css`
- Modify: `index.html` (head : `<link>` + script ; body : éléments curseur/barre)

- [ ] **Step 1 : Créer `assets/css/animations.css`**

```css
/* ============ ANIMATIONS — système immersif (additif) ============
   Vars (--blue, --orange, --ease…) viennent de base.css, chargé avant. */

/* ---- Reveals : état caché UNIQUEMENT si JS actif (.js-anim sur <html>) ---- */
.js-anim [data-reveal]{opacity:0;transition:opacity .9s var(--ease),transform .9s var(--ease)}
.js-anim [data-reveal="up"]{transform:translateY(46px)}
.js-anim [data-reveal="scale"]{transform:translateY(46px) scale(.92)}
.js-anim [data-reveal="fade"]{transform:none}
[data-reveal].is-in{opacity:1;transform:none}

/* ---- Barre de progression scroll ---- */
.scrollbar{position:fixed;top:0;left:0;height:5px;width:100%;transform:scaleX(var(--sp,0));transform-origin:left;
  background:linear-gradient(90deg,var(--blue),var(--orange));z-index:1200;pointer-events:none}

/* ---- Curseur custom (desktop, activé via body.cursor-on) ---- */
.cursordot,.cursorring{position:fixed;top:0;left:0;border-radius:50%;pointer-events:none;z-index:1300;
  transform:translate(-50%,-50%);opacity:0;transition:opacity .3s}
.cursordot{width:8px;height:8px;background:var(--orange)}
.cursorring{width:38px;height:38px;border:2px solid var(--blue);
  transition:opacity .3s,width .25s var(--ease),height .25s var(--ease),background .25s var(--ease)}
body.cursor-on .cursordot,body.cursor-on .cursorring{opacity:1}
body.cursor-on{cursor:none}
.cursorring.hot{width:64px;height:64px;background:rgba(50,50,255,.08)}

/* ---- Tilt 3D ---- */
.tilt{transition:transform .3s var(--ease)}

/* ---- Lenis (smooth-scroll) ---- */
html.lenis,html.lenis body{height:auto}
.lenis.lenis-smooth{scroll-behavior:auto!important}
.lenis.lenis-smooth [data-lenis-prevent]{overscroll-behavior:contain}
.lenis.lenis-stopped{overflow:hidden}

/* ---- Fallback : rien d'invisible si JS absent (reveals existants) ---- */
html:not(.js-anim) .about__photo{clip-path:none!important}
html:not(.js-anim) .about__text>*,
html:not(.js-anim) .about__media::before,
html:not(.js-anim) .about__badge,
html:not(.js-anim) .about__caption,
html:not(.js-anim) .proj,
html:not(.js-anim) .sb__imgwrap img{opacity:1!important;transform:none!important}
html:not(.js-anim) .sb__shutter{display:none!important}

/* ---- Reduced-motion : pas de curseur ni de barre ---- */
@media (prefers-reduced-motion: reduce){
  .cursordot,.cursorring,.scrollbar{display:none!important}
}
```

- [ ] **Step 2 : Ajouter le `<link>` dans `index.html`**

Dans `<head>`, juste après la ligne `<link rel="stylesheet" href="/assets/css/a11y.css">`, ajouter :

```html
<link rel="stylesheet" href="/assets/css/animations.css">
```

- [ ] **Step 3 : Ajouter le script `.js-anim` (anti-flash, a11y) dans le `<head>`**

Juste après la ligne ajoutée à l'étape 2, ajouter :

```html
<script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('js-anim')</script>
```

Pourquoi : pose `.js-anim` avant le premier paint (sauf reduced-motion) → les reveals sont cachés sans flash, et restent visibles en reduced-motion.

- [ ] **Step 4 : Ajouter les éléments globaux dans `index.html`**

Juste après la balise ouvrante `<body>`, avant `<!-- INTRO -->`, ajouter :

```html
<div class="scrollbar" aria-hidden="true"></div>
<div class="cursordot" aria-hidden="true"></div>
<div class="cursorring" aria-hidden="true"></div>
```

- [ ] **Step 5 : Vérifier le chargement**

Lancer le serveur local (voir Conventions). Puis Playwright :
- `browser_navigate` → `http://localhost:8137/index.html`
- `browser_console_messages level:error` → **attendu : seul `favicon.ico` 404 toléré, aucune autre erreur**
- `browser_evaluate` : `() => document.documentElement.classList.contains('js-anim')` → **attendu : `true`**
- `browser_take_screenshot` (desktop) → la page s'affiche normalement (la barre de progression à 0 est invisible).

- [ ] **Step 6 : Commit**

```bash
git add assets/css/animations.css index.html
git commit -m "feat(anim): fondations CSS + drapeau js-anim + elements globaux"
```

---

## Task 2 : Reveals au scroll + scrollspy (anim.js) + tag des sections

**Files:**
- Create: `assets/js/anim.js`
- Modify: `index.html` (scripts Lenis + anim.js ; attributs `data-reveal`/`data-stagger`)

- [ ] **Step 1 : Créer `assets/js/anim.js` (squelette : flags + scrollspy + reveals)**

```js
// Ploméo — animations immersives (vanilla, additif).
// Spec : docs/superpowers/specs/2026-06-01-animations-immersives-design.md
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- Scrollspy : lien de nav actif (tous les modes) ---------- */
  const navLinks = [...document.querySelectorAll('.lhead__nav a')];
  const spied = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (spied.length) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const id = '#' + e.target.id;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    spied.forEach(s => spy.observe(s));
  }

  if (reduce) return; // a11y : aucune animation, contenu statique et visible.
  root.classList.add('js-anim'); // déjà posé par le <head> ; sûr en double.

  /* ---------- Reveals au scroll ---------- */
  const revIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const parent = el.closest('[data-stagger]');
    if (parent) {
      const kids = [...parent.querySelectorAll('[data-reveal]')];
      el.style.transitionDelay = (Math.max(0, kids.indexOf(el)) * 0.09) + 's';
    }
    el.classList.add('is-in');
    revIO.unobserve(el);
  }), { threshold: 0.18 });
  document.querySelectorAll('[data-reveal]').forEach(el => revIO.observe(el));
})();
```

- [ ] **Step 2 : Vendoriser Lenis en local**

Télécharger la lib (version 1.x courante) dans `assets/vendor/` :

```bash
mkdir -p assets/vendor && curl -L https://unpkg.com/lenis@1/dist/lenis.min.js -o assets/vendor/lenis.min.js
```

Vérifier que le fichier fait quelques ko et expose le global `Lenis` (chercher `Lenis` dans le fichier). Noter la version récupérée dans le message de commit.

- [ ] **Step 3 : Ajouter Lenis (local) + anim.js dans `index.html`**

Remplacer la dernière ligne script `<script src="/assets/js/main.js"></script>` par :

```html
<script src="/assets/js/main.js"></script>
<script src="/assets/vendor/lenis.min.js"></script>
<script src="/assets/js/anim.js"></script>
```

L'ordre compte : Lenis avant `anim.js` (qui lit `window.Lenis`). Si le fichier manque, `anim.js` continue sans smooth-scroll (scroll natif).

- [ ] **Step 4 : Taguer les sections non animées (`data-reveal` / `data-stagger`)**

Process — modifier dans `index.html` :
- `<div class="process__head">` → `<div class="process__head" data-reveal="up">`
- `<div class="process__grid">` → `<div class="process__grid" data-stagger>`
- chaque `<div class="pstep">` (×3) → `<div class="pstep" data-reveal="up">`

Zone :
- `<h2>Ploméo intervient <em>partout dans le Var</em></h2>` (laisser tel quel)
- `<div class="zone__communes">` → `<div class="zone__communes" data-stagger>`
- chaque `<span class="zone__chip">` (×8) → `<span class="zone__chip" data-reveal="up">`

FAQ :
- `<div class="faq__list">` → `<div class="faq__list" data-stagger>`
- chaque `<div class="faqitem">` (×5) → `<div class="faqitem" data-reveal="up">`

Contact :
- la `<div>` contenant `contact__eyebrow` (1er enfant de `.contact__inner`) → ajouter `data-reveal="up"`
- `<form class="cform" ...>` → `<form class="cform" data-reveal="up" ...>` (conserver les attributs `action`/`method` existants)

Footer :
- `<div class="foot__inner">` → `<div class="foot__inner" data-stagger>`
- `<div class="foot__brand">` → ajouter `data-reveal="up"`
- chaque `<div class="foot__col">` (×3) → ajouter `data-reveal="up"`

- [ ] **Step 5 : `node --check`**

Run : `node --check assets/js/anim.js`
Expected : aucune sortie d'erreur (exit 0).

- [ ] **Step 6 : Vérifier reveals + scrollspy + fallback**

Serveur lancé. Playwright (`sessionStorage.clear()` puis reload pour neutraliser l'intro) :
- `browser_console_messages level:error` → propre (hors favicon).
- Scroller jusqu'à la FAQ : `browser_evaluate` → `() => { document.querySelector('#faq').scrollIntoView(); return null; }`, attendre ~600ms, puis `() => [...document.querySelectorAll('#faq .faqitem')].every(x => x.classList.contains('is-in'))` → **attendu : `true`**.
- Scrollspy : `() => { document.querySelector('#about').scrollIntoView(); return null; }`, attendre, puis `() => document.querySelector('.lhead__nav a[href="#about"]').classList.contains('active')` → **attendu : `true`**.
- **Fallback** : `() => { document.documentElement.classList.remove('js-anim'); return [...document.querySelectorAll('[data-reveal]')].every(x => getComputedStyle(x).opacity === '1'); }` → **attendu : `true`** (tout visible sans js-anim). Recharger ensuite.

- [ ] **Step 7 : Commit**

```bash
git add assets/js/anim.js index.html
git commit -m "feat(anim): reveals au scroll + scrollspy + tag des sections"
```

---

## Task 3 : Smooth-scroll Lenis + barre de progression + parallaxe scroll

**Files:**
- Modify: `assets/js/anim.js` (ajout Lenis + parallaxe + boucle rAF)
- Modify: `index.html` (attributs `data-parallax`)

- [ ] **Step 1 : Ajouter Lenis + parallaxe + boucle rAF dans `anim.js`**

Insérer le bloc suivant **juste avant** la dernière ligne `})();` de `anim.js` :

```js
  /* ---------- Smooth-scroll Lenis (desktop) ---------- */
  let lenis = null;
  if (fine && window.Lenis) {
    root.style.scrollBehavior = 'auto';
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', ev => {
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        ev.preventDefault();
        lenis.scrollTo(t, { offset: -8 });
      });
    });
  }

  /* ---------- Parallaxe scroll (positions en cache, pas de feedback) ---------- */
  const para = [...document.querySelectorAll('[data-parallax]')].map(el => ({
    el, f: parseFloat(el.dataset.parallax) || 0, top: 0, h: 0
  }));
  function measurePara() {
    para.forEach(p => { p.el.style.transform = ''; });
    para.forEach(p => { const r = p.el.getBoundingClientRect(); p.top = r.top + scrollY; p.h = r.height; });
  }
  measurePara();
  addEventListener('resize', measurePara, { passive: true });

  /* ---------- Boucle rAF unique : Lenis + progression + parallaxe ---------- */
  const bar = document.querySelector('.scrollbar');
  function frame(time) {
    if (lenis) lenis.raf(time);
    const max = root.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--sp', (max > 0 ? scrollY / max : 0).toFixed(4));
    const mid = scrollY + innerHeight / 2;
    para.forEach(p => {
      const off = (p.top + p.h / 2) - mid;
      p.el.style.transform = `translate3d(0, ${(-off * p.f).toFixed(1)}px, 0)`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
```

> Note conflit : un élément ne doit JAMAIS porter à la fois `data-parallax` et `data-mouse` (les deux écrivent `transform`). Les cibles sont disjointes dans ce plan.

- [ ] **Step 2 : Ajouter `data-parallax` sur des éléments décoratifs**

Dans `index.html` :
- About — `<span class="about__wm" aria-hidden="true">Ayoub</span>` → `<span class="about__wm" data-parallax="0.06" aria-hidden="true">Ayoub</span>`

(On reste sobre : un seul élément parallaxe scroll au départ, clairement décoratif. On pourra en ajouter après revue visuelle.)

- [ ] **Step 3 : `node --check`**

Run : `node --check assets/js/anim.js`
Expected : exit 0.

- [ ] **Step 4 : Vérifier smooth-scroll + progression + parallaxe**

Serveur + Playwright (desktop, `sessionStorage.clear()` + reload) :
- `browser_console_messages level:error` → propre.
- Lenis chargé : `() => !!window.Lenis` → **attendu : `true`**.
- Progression : `() => { window.scrollTo(0, document.body.scrollHeight); return null; }`, attendre ~400ms, puis `() => parseFloat(getComputedStyle(document.querySelector('.scrollbar')).getPropertyValue('--sp'))` → **attendu : proche de 1**.
- Parallaxe : remonter en haut, `() => { document.querySelector('#about').scrollIntoView(); return null; }`, attendre, puis `() => document.querySelector('.about__wm').style.transform.includes('translate3d')` → **attendu : `true`**.

- [ ] **Step 5 : Commit**

```bash
git add assets/js/anim.js index.html
git commit -m "feat(anim): smooth-scroll Lenis + barre de progression + parallaxe scroll"
```

---

## Task 4 : Souris — curseur custom, magnétique, tilt 3D, parallaxe souris (desktop)

**Files:**
- Modify: `assets/js/anim.js` (module souris + lerp de l'anneau dans la boucle rAF)
- Modify: `index.html` (`.magnetic`, `.tilt`, `data-mouse`)

- [ ] **Step 1 : Ajouter le module souris dans `anim.js`**

Insérer ce bloc **juste avant** le commentaire `/* ---------- Boucle rAF unique` (donc avant `const bar = ...`) :

```js
  /* ---------- Souris : curseur, parallaxe, magnétique, tilt (desktop) ---------- */
  const dot = document.querySelector('.cursordot');
  const ring = document.querySelector('.cursorring');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  if (fine) {
    body.classList.add('cursor-on');
    const mouseEls = [...document.querySelectorAll('[data-mouse]')].map(el => ({ el, f: parseFloat(el.dataset.mouse) || 0 }));
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }
      const cx = innerWidth / 2, cy = innerHeight / 2;
      mouseEls.forEach(({ el, f }) => {
        el.style.transform = `translate3d(${((mx - cx) * f).toFixed(1)}px, ${((my - cy) * f).toFixed(1)}px, 0)`;
      });
    }, { passive: true });
    document.querySelectorAll('a, button, .tilt, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => ring && ring.classList.add('hot'));
      el.addEventListener('mouseleave', () => ring && ring.classList.remove('hot'));
    });
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - (r.left + r.width / 2)) * 0.35).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.35).toFixed(1)}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    document.querySelectorAll('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(800px) rotateY(${(px * 8).toFixed(2)}deg) rotateX(${(-py * 8).toFixed(2)}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }
```

- [ ] **Step 2 : Ajouter le lerp de l'anneau dans la boucle `frame`**

Dans la fonction `frame`, juste avant `requestAnimationFrame(frame);`, ajouter :

```js
    if (fine && ring) { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
```

- [ ] **Step 3 : Ajouter les classes/attributs dans `index.html`**

- Hero — la carte SVG : `<div class="hero__map" aria-hidden="true">` → `<div class="hero__map" data-mouse="0.02" aria-hidden="true">`
- Hero — les 2 CTA : `<a href="#contact" class="hbtn hbtn--orange">` → ajouter `magnetic` (`class="hbtn hbtn--orange magnetic"`) ; idem `<a href="#work" class="hbtn hbtn--ghost">` → `class="hbtn hbtn--ghost magnetic"`
- Piliers — les liens (×4, identiques) : `<a class="sb__link" href="#contact">Demander un devis</a>` → `<a class="sb__link magnetic" href="#contact">Demander un devis</a>`
- Piliers — les visuels (×4) : `<div class="sb__imgwrap">` → `<div class="sb__imgwrap tilt">`
- About — la photo : `<div class="about__photo">` → `<div class="about__photo tilt">`
- Réalisations — les cartes (×6) : `<article class="proj" data-m="…">` → ajouter `tilt` (`class="proj tilt"`, garder `data-m`)
- Contact — le bouton : `<button class="cbtn" type="submit">` → `<button class="cbtn magnetic" type="submit">`

- [ ] **Step 4 : `node --check`**

Run : `node --check assets/js/anim.js`
Expected : exit 0.

- [ ] **Step 5 : Vérifier (desktop)**

Serveur + Playwright (taille desktop par défaut, `sessionStorage.clear()` + reload) :
- `browser_console_messages level:error` → propre.
- Curseur actif : `() => document.body.classList.contains('cursor-on')` → **attendu : `true`**.
- Magnétique : `browser_hover` sur le CTA « Demander un devis » du hero puis `() => document.querySelector('.hbtn--orange').style.transform.includes('translate')` → **attendu : `true`** (peut nécessiter un léger mousemove ; sinon vérifier qu'aucune erreur n'est levée).
- Capture desktop du hero + d'une section piliers.

- [ ] **Step 6 : Commit**

```bash
git add assets/js/anim.js index.html
git commit -m "feat(anim): curseur custom, magnetique, tilt 3D, parallaxe souris"
```

---

## Task 5 : Compteurs déclenchés à l'entrée du viewport (main.js)

**Files:**
- Modify: `assets/js/main.js` (remplacer `runCounters` immédiat par déclenchement IntersectionObserver + gestion reduced-motion)

- [ ] **Step 1 : Remplacer le bloc compteurs dans `main.js`**

Remplacer ce bloc existant :

```js
// ---- Counters ----
function runCounters(){
  document.querySelectorAll('[data-count]').forEach(el=>{
    const end=parseFloat(el.dataset.count),dec=+el.dataset.dec||0;let t0=null;
    const step=ts=>{t0??=ts;const p=Math.min((ts-t0)/900,1);el.textContent=(end*p).toFixed(dec).replace('.',',');if(p<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  });
}
runCounters();
```

par :

```js
// ---- Counters (déclenchés à l'entrée dans le viewport) ----
const reduceCounters=matchMedia('(prefers-reduced-motion: reduce)').matches;
function runCounter(el){
  const end=parseFloat(el.dataset.count),dec=+el.dataset.dec||0;
  if(reduceCounters){el.textContent=end.toFixed(dec).replace('.',',');return;}
  let t0=null;
  const step=ts=>{t0??=ts;const p=Math.min((ts-t0)/900,1);el.textContent=(end*p).toFixed(dec).replace('.',',');if(p<1)requestAnimationFrame(step);};
  requestAnimationFrame(step);
}
const countIO=new IntersectionObserver((es,obs)=>es.forEach(e=>{if(e.isIntersecting){runCounter(e.target);obs.unobserve(e.target);}}),{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>countIO.observe(el));
```

- [ ] **Step 2 : `node --check`**

Run : `node --check assets/js/main.js`
Expected : exit 0.

- [ ] **Step 3 : Vérifier**

Serveur + Playwright (`sessionStorage.clear()` + reload) :
- En haut de page, le compteur n'a pas encore tourné : `() => document.querySelector('[data-count="19"]').textContent` → **attendu : `"0"`** (avant scroll).
- Scroller vers la réassurance : `() => { document.querySelector('#rea').scrollIntoView(); return null; }`, attendre ~1200ms, puis `() => document.querySelector('[data-count="19"]').textContent` → **attendu : `"19"`**.
- `browser_console_messages level:error` → propre.

- [ ] **Step 4 : Commit**

```bash
git add assets/js/main.js
git commit -m "feat(anim): compteurs declenches a l'entree du viewport"
```

---

## Task 6 : Perf — `poster` du hero + passe accessibilité/fallback

**Files:**
- Modify: `index.html` (`poster` sur la vidéo hero)

- [ ] **Step 1 : Ajouter un `poster` à la vidéo hero**

Dans `index.html`, modifier :

```html
<video class="hero__video" autoplay muted loop playsinline preload="auto">
```

en :

```html
<video class="hero__video" autoplay muted loop playsinline preload="auto" poster="/assets/photos/sdb-premium.jpg">
```

(`sdb-premium.jpg` existe déjà ; évite le flash avant que la vidéo démarre.)

- [ ] **Step 2 : Vérifier reduced-motion (a11y)**

Serveur + Playwright :
- Émuler reduced-motion : `browser_evaluate` ne suffit pas pour `matchMedia` ; utiliser l'émulation Playwright si dispo, sinon vérifier la logique : recharger avec `() => { sessionStorage.clear(); }` puis, dans un contexte reduced-motion, contrôler :
  - `() => document.documentElement.classList.contains('js-anim')` → **attendu : `false`** (le script du head ne le pose pas).
  - `() => [...document.querySelectorAll('[data-reveal]')].every(x => getComputedStyle(x).opacity === '1')` → **attendu : `true`** (tout visible).
  - `() => getComputedStyle(document.querySelector('.cursordot')).display` → **attendu : `"none"`**.

> Si l'émulation reduced-motion n'est pas disponible via l'outil, valider manuellement (OS réglé sur « réduire les animations ») et noter le résultat.

- [ ] **Step 3 : Vérifier le fallback no-JS (rappel)**

`() => { document.documentElement.classList.remove('js-anim'); const ok = getComputedStyle(document.querySelector('.about__photo')).clipPath; return ok; }` → **attendu : `"none"`** (photo non clippée → visible). Recharger ensuite.

- [ ] **Step 4 : Commit**

```bash
git add index.html
git commit -m "perf(anim): poster hero + durcissement a11y/fallback"
```

---

## Task 7 : Vérification finale, captures, nettoyage

**Files:**
- Delete: `demo-animations.html`, `demo-hero.jpeg` (prototypes jetables)

- [ ] **Step 1 : Vérif globale desktop**

Serveur + Playwright, desktop (`sessionStorage.clear()` + reload) :
- `browser_console_messages level:error` → propre (hors favicon).
- Captures : hero, piliers, réalisations, contact.
- Parcourir tout le scroll (`window.scrollTo(0, document.body.scrollHeight)`), revérifier la console → propre.

- [ ] **Step 2 : Vérif mobile**

- `browser_resize` 390×844, reload (`sessionStorage.clear()`).
- `() => document.body.classList.contains('cursor-on')` → **attendu : `false`** (pas de curseur custom sur mobile).
- Les reveals fonctionnent quand même : scroller, vérifier `is-in` sur une section.
- `browser_console_messages level:error` → propre. Capture mobile du hero.

- [ ] **Step 3 : `node --check` final**

Run : `node --check assets/js/anim.js` puis `node --check assets/js/main.js`
Expected : exit 0 pour les deux.

- [ ] **Step 4 : Supprimer les prototypes**

```bash
git rm --cached demo-hero.jpeg 2>/dev/null; rm -f demo-animations.html demo-hero.jpeg
```

(Ces fichiers étaient non suivis ; `rm` suffit. La commande `git rm --cached` ne sert que s'ils avaient été ajoutés.)

- [ ] **Step 5 : Commit final**

```bash
git add -A -- assets index.html docs
git commit -m "chore(anim): nettoyage des prototypes de demo"
```

- [ ] **Step 6 : Récapitulatif**

Confirmer à l'utilisateur : branche `feat/animations-immersives` prête, lister ce qui a été fait, proposer la suite (revue visuelle fine, dosage des effets, merge vers `main`, ou code-review).

---

## Self-Review (auteur du plan)

- **Couverture spec** :
  - Reveals sections non animées (Process/Zone/FAQ/Contact/Footer) → Task 2 ✓
  - Curseur custom + magnétique + tilt + parallaxe souris → Task 4 ✓
  - Barre de progression + parallaxe scroll + smooth-scroll Lenis + nav d'ancre → Task 3 ✓
  - Scrollspy → Task 2 ✓ · Compteurs à l'entrée → Task 5 ✓
  - Garde-fous : `.js-anim` (Task 1), `pointer:fine` (Task 4), reduced-motion (Tasks 1+6), fallback no-JS (Tasks 1+2+6) ✓
  - `poster` hero → Task 6 ✓ · Mobile allégé → Task 7 (vérif) ✓
  - Enrichissements existants (About/Piliers/Réalisations tilt) → Task 4 ✓
- **Placeholders** : aucun TODO/TBD ; code complet à chaque étape.
- **Cohérence des noms** : `.js-anim`, `.is-in`, `--sp`, `.cursordot`/`.cursorring`/`.scrollbar`, `data-reveal`/`data-stagger`/`data-parallax`/`data-mouse`, `.magnetic`/`.tilt` — identiques entre CSS (Task 1), JS (Tasks 2-4) et HTML (Tasks 2-4). `frame`/`measurePara`/`runCounter` définis une seule fois. ✓
- **Conflits transform** : `data-parallax` (about__wm) et `data-mouse` (hero__map) sur des éléments disjoints ; `.tilt`/`.magnetic` sur des éléments encore distincts → pas de double écriture de `transform`. ✓
