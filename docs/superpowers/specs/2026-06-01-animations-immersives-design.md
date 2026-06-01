# Animations immersives — Ploméo (design)

- **Date** : 2026-06-01
- **Statut** : validé, prêt pour plan d'implémentation
- **Périmètre** : `index.html` (landing page). Les pages légales ne sont pas concernées.

## 1. Objectif

Ajouter une couche d'animation **immersive** à la landing page (apparitions de sections,
animations liées à la souris, suivi de scroll) **sans dégrader la conversion ni la performance**.
Le site est statique (HTML/CSS/JS, déploiement Vercel sans build) et destiné à migrer en React/Next ;
on livre l'effet maintenant sans dette de dépendance lourde.

Niveau retenu : **Immersif** (validé via le prototype `demo-animations.html`, jetable).

## 2. Décisions

| Sujet | Choix |
|---|---|
| Niveau d'animation | Immersif |
| Approche technique | **Vanilla modulaire** (0 build, ~0 dépendance) |
| Smooth-scroll | **Lenis** (~4 ko, CDN), désactivé si reduced-motion ou mobile |
| Stratégie d'intégration | **Additif** : on garde l'existant, on ajoute |
| Pilotage des effets | **Attributs HTML** (`data-reveal`, `data-parallax`…) lus par le JS |

## 3. Architecture

### Nouveaux fichiers
- `assets/css/animations.css` — classes utilitaires, keyframes, overrides reduced-motion (~120 l.).
- `assets/js/anim.js` — contrôleur : reveals, scroll (progress + parallaxe), souris
  (curseur, magnétique, tilt, parallaxe souris), init Lenis (~180 l. ; découper si dépassement).
- `index.html` : ajout du `<link>` `animations.css`, du `<script>` Lenis (CDN) puis `anim.js`
  **après** `main.js`, et de la barre de progression + éléments du curseur.

### Principe additif (changements minimaux)
On **conserve** : intro, hero cinétique, reveals existants (`.sb`, `.about`, `.work`, `.blog`),
compteurs, accordéon FAQ, modales. `anim.js` **ajoute** uniquement :
- les features globales (curseur, barre de progression, parallaxe, smooth-scroll, scrollspy) ;
- les reveals sur les sections aujourd'hui non animées (Process, Zone, FAQ, Contact, Footer) ;
- les enrichissements (tilt, magnétique, parallaxe souris) sur les sections existantes.

### Intégration Lenis
- Lenis pilote le défilement ; barre de progression et parallaxe se branchent sur **sa boucle rAF** (une seule).
- Liens d'ancre (`#about`, `#contact`…) via `lenis.scrollTo`.
- On retire `html{scroll-behavior:smooth}` quand Lenis est actif.
- Désactivé si `prefers-reduced-motion` ou mobile → scroll natif.

## 4. Vocabulaire (API par attributs)

| Attribut / classe | Effet |
|---|---|
| `data-reveal="up\|scale\|fade"` | apparition au scroll (IntersectionObserver → `.is-in`) |
| `data-stagger` (sur un parent) | cascade des enfants |
| `data-parallax="0.1"` | parallaxe au scroll (vitesse différentielle) |
| `data-mouse="0.04"` | parallaxe à la souris (desktop) |
| `.magnetic` | élément aspiré vers la souris (CTAs) |
| `.tilt` | inclinaison 3D au survol (cartes) |
| `data-cursor` (sur `<body>`) | curseur custom point + anneau magnétique |

## 5. Plan par section

**Global :** curseur custom (point + anneau à inertie, grossit sur les éléments interactifs,
magnétique sur les CTAs, desktop only) · barre de progression scroll (dégradé bleu→orange) ·
smooth-scroll Lenis + nav d'ancre via `lenis.scrollTo` · **scrollspy** (lien de nav actif mis à jour au scroll).

| Section | Ajouts |
|---|---|
| Hero | garde la cinétique lettres + parallaxe souris (halos/carte), CTAs magnétiques, léger parallaxe du contenu au scroll-out |
| Réassurance | compteurs déclenchés **à l'entrée** dans le viewport + reveal des cellules en cascade |
| About | garde sa chorégraphie + tilt 3D léger sur la photo |
| Piliers | garde le « shutter » + tilt 3D sur les visuels, lien « Demander un devis » magnétique |
| Process | *(aucune anim aujourd'hui)* → reveal cascade des 3 étapes + pastille numéro « pop » |
| Réalisations | garde le reveal grille + tilt 3D sur les cartes projet |
| Zone | *(aucune)* → reveal des puces communes en cascade |
| Conseils | inchangé (reveal + hover déjà présents) |
| FAQ | *(aucune)* → reveal cascade des items |
| Contact | *(aucune)* → reveal du bloc + champs en léger stagger, bouton submit magnétique |
| Footer | reveal discret des colonnes |

### Mobile
Curseur / tilt / magnétique / parallaxe-souris **désactivés**. On garde : reveals,
parallaxe scroll **légère**, barre de progression. Lenis **off** (scroll natif tactile).

## 6. Garde-fous

### Fallback no-JS / JS planté (critique)
L'état « caché » des reveals n'est appliqué que si `<html>` porte la classe `.js-anim`
(ajoutée par JS tout en haut de `anim.js`). Sans JS, tout reste visible. Aucune section
ne doit pouvoir rester invisible.

> Note : les reveals **existants** (`.about__text>*`, `.sb`, `.work`, `.blog`…) ont
> aujourd'hui le même angle mort (état initial `opacity:0` non gardé). L'implémentation
> doit retrofiter le gating `.js-anim` sur ces règles aussi, pour une vraie cohérence
> « rien d'invisible sans JS ». Effort faible, pas de changement visuel.

### Accessibilité — `prefers-reduced-motion`
Extension de `assets/css/a11y.css` : neutralise reveals / parallaxe / tilt / curseur,
**Lenis désactivé**, contenu visible et statique, curseur natif rétabli.

### Performance
- Animations en `transform` / `opacity` uniquement (compositing GPU, pas de reflow).
- Une **seule** boucle `rAF` (Lenis) pour progression + parallaxe ; lectures de position groupées.
- `will-change` posé puis retiré ; `IntersectionObserver.unobserve` après reveal.
- Curseur / tilt / parallaxe-souris gated par `matchMedia('(pointer:fine)')` → zéro coût mobile.
- Budget : ~6–8 ko JS maison + ~4 ko Lenis.
- Nit bonus : ajouter un `poster` au hero vidéo (amélioration du chargement perçu).

## 7. Vérification (definition of done)

1. `node --check assets/js/anim.js` passe.
2. Serveur local + Playwright : 0 erreur console ; captures **desktop + mobile**.
3. Scroll programmatique → `.is-in` bien ajouté (reveals OK), contenu visible.
4. Test reduced-motion (émulation) → tout visible, statique, pas de curseur custom.
5. Test fallback → en retirant `.js-anim`, les sections restent visibles.

## 8. Hors scope / notes

- Migration React/Next : ces animations seront probablement refaites (Framer Motion).
  D'où le choix vanilla + une seule mini-dépendance isolée (Lenis).
- `demo-animations.html` et `demo-hero.jpeg` sont des **prototypes jetables** (non committés),
  à supprimer une fois l'implémentation faite.
- Vrais avis Google, activation FormSubmit, photo Ayoub : blockers client indépendants de ce lot.
