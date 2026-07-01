# CMS — branchement des listes en lecture live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher les 6 sections répétables du site (`piliers`, `process`, `faq`, `articles`, `avis`, `communes`) sur Supabase en lecture live (même patron que `assets/js/site/realisations.js`), seeder les 4 tables vides (`faq`, `articles`, `avis`, `communes`) depuis le contenu en dur, et retirer l'éditeur admin `villes` (carte SVG, reste hors périmètre).

**Architecture:** Deux fichiers neufs côté site : `assets/js/site/render.mjs` (fonctions pures de rendu HTML, une par section, testées en vitest sans DOM) et `assets/js/site/cms-lists.js` (montage : fetch Supabase + `container.innerHTML = render(rows)` avec fallback sur le HTML en dur si base KO/vide). Un seul `<script type="module" src="/assets/js/site/cms-lists.js">` est ajouté dans `index.html`. 4 migrations SQL idempotentes (`where not exists`) seedent les tables vides, dans le style déjà établi par `20260625160000_seed_piliers.sql`. L'éditeur admin `villes.js` et son entrée dans `app.js` sont supprimés.

**Tech Stack:** JS ESM vanilla (pas de TypeScript), Vite (bundle des modules `type="module"`), Supabase JS client (`@supabase/supabase-js`), vitest pour les tests unitaires des fonctions de rendu, PostgreSQL/Supabase pour les seeds SQL.

## Global Constraints

- JS ESM strict, imports relatifs, **aucun** `any`/TypeScript — le repo est vanilla JS.
- Max ~200 lignes par fichier. `render.mjs` doit rester scindable si besoin (6 fonctions + `esc` ≈ 150-180 lignes attendues).
- `esc()` dans `render.mjs` doit être une fonction **locale** (dupliquée depuis `assets/js/admin/ui.js`), sans import DOM, pour rester testable en Node/vitest pur.
- Fallback obligatoire : si `!configured`, pas de conteneur, `error`, ou `data.length === 0` → la fonction de montage fait `return` tôt, le HTML en dur reste affiché. Aucune section vide.
- `.eq('visible', true)` uniquement sur les tables qui ont la colonne `visible` : `avis`, `piliers`, `articles`, `faq`. **Jamais** sur `process_etapes` et `communes` (pas de colonne `visible`).
- Toujours `.order('ordre', { ascending: true })`.
- Migrations SQL : idempotentes via `where not exists (select 1 from public.<table>)`, nommées `supabase/migrations/<timestamp>_seed_<table>.sql`, style dollar-quoting `$t$…$t$` pour le texte et `$j$…$j$::jsonb` pour le JSON (repris de `20260625160000_seed_piliers.sql`).
- Commits en français, préfixes `feat:`/`chore:`/`refactor:`, un commit par tâche logique, message terminé par une ligne vide puis `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Tests : `npm test` (= `vitest run`), pas de fichier `vitest.config.*` dans le repo — vitest découvre les fichiers `*.test.mjs` par défaut (cf. `build/apply-cms.test.mjs`).
- Ne pas toucher à `villes_carte` (table + seed existants) ni à la carte SVG dans `index.html` : hors périmètre, restent en dur.
- Ne pas construire de page article détaillée ni assainir `corps_html` : les cartes articles n'affichent que titre/extrait/image/lien.

---

### Task 1: Retrait de l'éditeur admin « villes »

**Files:**
- Delete: `assets/js/admin/villes.js`
- Modify: `assets/js/admin/app.js:10` (import), `assets/js/admin/app.js:90` (entrée `TILES`), `assets/js/admin/app.js:144` (entrée `EDITORS`)

**Interfaces:**
- Consumes: rien (suppression pure)
- Produces: `app.js` ne référence plus `mountVilles` — aucune tâche suivante n'en dépend

- [ ] **Step 1: Supprimer le fichier éditeur**

```bash
rm "assets/js/admin/villes.js"
```

- [ ] **Step 2: Retirer l'import dans `app.js`**

Dans `assets/js/admin/app.js`, supprimer la ligne 10 :
```js
import { mountVilles } from './villes.js'
```

- [ ] **Step 3: Retirer la tuile du tableau de bord**

Dans `assets/js/admin/app.js`, dans le tableau `TILES` (autour de la ligne 90), supprimer la ligne :
```js
  { key: 'villes', label: 'Villes (carte)', icon: '🗺️', ready: true },
```

- [ ] **Step 4: Retirer l'entrée du routage `EDITORS`**

Dans `assets/js/admin/app.js`, dans l'objet `EDITORS` (autour de la ligne 144), supprimer la ligne :
```js
  villes: mountVilles,
```

- [ ] **Step 5: Vérifier qu'il ne reste plus aucune référence à `villes.js`/`mountVilles`**

Run: `grep -rn "villes.js\|mountVilles" assets/js/admin/`
Expected: aucune sortie (0 résultat).

- [ ] **Step 6: Lancer les tests existants (non-régression)**

Run: `npm test`
Expected: tous les tests `build/apply-cms.test.mjs` passent (PASS), aucune erreur d'import cassé (ce module n'est pas testé mais on vérifie que rien d'autre n'a régressé).

- [ ] **Step 7: Commit**

```bash
git add assets/js/admin/app.js
git rm assets/js/admin/villes.js
git commit -m "$(cat <<'EOF'
chore(admin): retire l'editeur villes (carte SVG hors perimetre CMS)

La carte SVG change rarement et n'est pas geree par un non-technicien ;
elle reste en dur dans index.html. La table villes_carte et son seed
restent en base (inoffensifs), seul l'editeur admin disparait.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `render.mjs` — fonctions pures + `renderCommunes` (TDD) et `cms-lists.js` — montage générique + wiring communes

**Files:**
- Create: `assets/js/site/render.mjs`
- Create: `assets/js/site/render.test.mjs`
- Create: `assets/js/site/cms-lists.js`
- Modify: `index.html:339-348` (bloc `.zone__communes`), `index.html:535-537` (ajout du script module)

**Interfaces:**
- Consumes: `supabase, publicUrl, configured` de `../admin/client.js` (signatures identiques à `realisations.js`)
- Produces:
  - `esc(s)` — `(value: unknown) => string`, échappe `& < > " '`.
  - `renderCommunes(rows)` — `(rows: Array<{nom: string}>) => string`, retourne la concaténation des `<span class="zone__chip" data-reveal="up">...</span>`.
  - `mountList({ table, selector, hasVisible, render })` dans `cms-lists.js` — `(opts: { table: string, selector: string, hasVisible: boolean, render: (rows) => string }) => Promise<void>`. Les tâches 3+ réutilisent cette fonction et `renderPiliers`/`renderProcess`/`renderFaq`/`renderArticles`/`renderAvis` définies plus tard dans `render.mjs`.

- [ ] **Step 1: Écrire le test de `esc`**

Créer `assets/js/site/render.test.mjs` :
```js
import { describe, it, expect } from 'vitest'
import { esc, renderCommunes } from './render.mjs'

describe('esc', () => {
  it('échappe les caractères HTML dangereux', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
  it('gère null/undefined en chaîne vide', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })
})

describe('renderCommunes', () => {
  it('rend une puce par commune, dans l\'ordre donné', () => {
    const rows = [{ nom: 'Toulon' }, { nom: 'Fréjus' }]
    const html = renderCommunes(rows)
    expect(html).toBe(
      '<span class="zone__chip" data-reveal="up">Toulon</span>' +
      '<span class="zone__chip" data-reveal="up">Fréjus</span>'
    )
  })
  it('échappe le nom de la commune', () => {
    const html = renderCommunes([{ nom: '<b>X</b>' }])
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).not.toContain('<b>X</b>')
  })
  it('retourne une chaîne vide sur liste vide', () => {
    expect(renderCommunes([])).toBe('')
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm test -- render.test.mjs`
Expected: FAIL — `Cannot find module './render.mjs'` (le fichier n'existe pas encore).

- [ ] **Step 3: Créer `render.mjs` avec `esc` et `renderCommunes`**

Créer `assets/js/site/render.mjs` :
```js
// Fonctions PURES de rendu HTML pour les sections « listes » du site.
// Aucune dépendance DOM : testables en Node/vitest. Chaque render* reproduit
// exactement le markup/classes de la section correspondante dans index.html.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Section « ZONE D'INTERVENTION » — index.html .zone__communes (table communes, pas de colonne visible).
export function renderCommunes(rows) {
  return rows.map(r => (
    `<span class="zone__chip" data-reveal="up">${esc(r.nom)}</span>`
  )).join('')
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm test -- render.test.mjs`
Expected: PASS (5 tests verts).

- [ ] **Step 5: Écrire le module de montage générique `cms-lists.js` (sans wiring des autres sections pour l'instant)**

Créer `assets/js/site/cms-lists.js` :
```js
// Monte les sections « listes » du site sur Supabase (lecture live).
// Patron repris de assets/js/site/realisations.js : fetch -> remplace le HTML
// en dur -> fallback (return tot) si la base est injoignable/vide.
import { supabase, configured } from '../admin/client.js'
import { renderCommunes } from './render.mjs'

// Monte une liste : fetch la table, filtre/trie, remplace le HTML en dur.
// hasVisible=true ajoute .eq('visible', true) (tables avec cette colonne uniquement).
export async function mountList({ table, selector, hasVisible, render }) {
  const container = document.querySelector(selector)
  if (!container || !configured || !supabase) return
  let query = supabase.from(table).select('*')
  if (hasVisible) query = query.eq('visible', true)
  const { data, error } = await query.order('ordre', { ascending: true })
  if (error || !data || !data.length) return // fallback : HTML en dur conserve
  container.innerHTML = render(data)
}

async function mountAll() {
  await mountList({ table: 'communes', selector: '.zone__communes', hasVisible: false, render: renderCommunes })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll)
else mountAll()
```

- [ ] **Step 6: Brancher le script module dans `index.html`**

Dans `index.html`, après la ligne 537 (`<script type="module" src="/assets/js/site/realisations.js"></script>`), ajouter :
```html
<script type="module" src="/assets/js/site/cms-lists.js"></script>
```

- [ ] **Step 7: Vérifier le bloc `.zone__communes` visé (déjà conforme, aucune modif de markup nécessaire)**

Le bloc HTML en dur (`index.html:339-348`) reste tel quel comme fallback :
```html
<div class="zone__communes" data-stagger>
  <span class="zone__chip" data-reveal="up">Toulon</span>
  <span class="zone__chip" data-reveal="up">La Seyne-sur-Mer</span>
  <span class="zone__chip" data-reveal="up">Hyères</span>
  <span class="zone__chip" data-reveal="up">Fréjus</span>
  <span class="zone__chip" data-reveal="up">Draguignan</span>
  <span class="zone__chip" data-reveal="up">Brignoles</span>
  <span class="zone__chip" data-reveal="up">La Valette</span>
  <span class="zone__chip" data-reveal="up">Six-Fours</span>
</div>
```
Ne pas le modifier : `mountList` remplace son `innerHTML` uniquement si la base répond avec des lignes. Confirmer que le sélecteur `.zone__communes` est unique dans le fichier :

Run: `grep -c "zone__communes" index.html`
Expected: `2` (la déclaration de classe sur le `<div>` + rien d'autre — un seul élément matché par `document.querySelector`).

- [ ] **Step 8: Écrire la migration de seed communes**

`communes` fait partie des 4 tables vides à seeder (spec § Contexte). Créer `supabase/migrations/20260701125000_seed_communes.sql` (8 communes extraites de `index.html:340-347`) :
```sql
-- ============================================================
--  Seed des communes desservies (section .zone__communes) depuis index.html.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.communes (nom, ordre)
select v.nom, v.ordre
from (values
  ('Toulon', 0),
  ('La Seyne-sur-Mer', 1),
  ('Hyères', 2),
  ('Fréjus', 3),
  ('Draguignan', 4),
  ('Brignoles', 5),
  ('La Valette', 6),
  ('Six-Fours', 7)
) as v(nom, ordre)
where not exists (select 1 from public.communes);
```

- [ ] **Step 9: Build de vérification (les modules se bundlent comme `realisations.js`)**

Run: `npm run build`
Expected: build Vite réussi, pas d'erreur de résolution de module sur `./render.mjs` ni `../admin/client.js`.

- [ ] **Step 10: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS — tests `build/apply-cms.test.mjs` + `assets/js/site/render.test.mjs` tous verts.

- [ ] **Step 11: Commit**

```bash
git add assets/js/site/render.mjs assets/js/site/render.test.mjs assets/js/site/cms-lists.js index.html supabase/migrations/20260701125000_seed_communes.sql
git commit -m "$(cat <<'EOF'
feat(site): branche la section communes en lecture live (CMS) + seed

Introduit assets/js/site/render.mjs (fonctions pures de rendu, testees
en vitest) et assets/js/site/cms-lists.js (montage generique mountList,
patron repris de realisations.js : fetch -> remplace le HTML en dur ->
fallback si base KO/vide). Premiere section branchee : communes (table
sans colonne visible), sert de patron pour les suivantes. Seed des 8
communes existantes (idempotent).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `renderPiliers` + `renderProcess` — branchement piliers et process (déjà en base, pas de seed)

**Files:**
- Modify: `assets/js/site/render.mjs` (ajoute `renderPiliers`, `renderProcess`)
- Modify: `assets/js/site/render.test.mjs` (ajoute les tests)
- Modify: `assets/js/site/cms-lists.js` (ajoute les 2 appels `mountList` dans `mountAll`)

**Interfaces:**
- Consumes: `esc` (Task 2), `mountList` (Task 2)
- Produces:
  - `renderPiliers(rows)` — `(rows: Array<{categorie, numero, titre, description, image_path, image_alt, points}>) => string`, retourne les 4 `<article class="sb" data-m="...">` (sans le `<div class="pil__head">` qui reste en dur, hors périmètre).
  - `renderProcess(rows)` — `(rows: Array<{numero, titre, description}>) => string`, retourne les `<div class="pstep">`.

- [ ] **Step 1: Écrire les tests `renderPiliers`**

Ajouter dans `assets/js/site/render.test.mjs` :
```js
import { renderPiliers, renderProcess } from './render.mjs'

describe('renderPiliers', () => {
  const row = {
    categorie: 'plomberie', numero: '01', titre: 'Plomberie',
    description: "De l'installation complète à la rénovation.",
    image_path: 'assets/photos/sdb-jacuzzi.jpg', image_alt: 'Plomberie',
    points: ['Installation sanitaire complète', 'Rénovation de salle de bain'],
    cta_texte: 'Demander un devis', cta_lien: '#contact',
  }

  it('rend une article.sb avec data-m = categorie', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<article class="sb" data-m="plomberie">')
    expect(html).toContain('<span class="sb__num">01</span>')
    expect(html).toContain('<h3>Plomberie</h3>')
  })

  it('rend chaque point de la liste points[] en <li>', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<ul class="sb__list"><li>Installation sanitaire complète</li><li>Rénovation de salle de bain</li></ul>')
  })

  it('rend le lien cta avec le texte fourni', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<a class="sb__link" href="#contact">Demander un devis</a>')
  })

  it('échappe titre/description/points', () => {
    const html = renderPiliers([{ ...row, titre: '<b>X</b>', points: ['<i>y</i>'] }])
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('gère points absent/null sans planter (liste vide)', () => {
    const html = renderPiliers([{ ...row, points: null }])
    expect(html).toContain('<ul class="sb__list"></ul>')
  })
})

describe('renderProcess', () => {
  it('rend une étape .pstep avec numéro/titre/description', () => {
    const html = renderProcess([{ numero: '1', titre: 'On échange', description: 'Vous décrivez votre besoin.' }])
    expect(html).toBe(
      '<div class="pstep" data-reveal="up"><div class="pstep__n">1</div><h3>On échange</h3><p>Vous décrivez votre besoin.</p></div>'
    )
  })

  it('échappe titre/description', () => {
    const html = renderProcess([{ numero: '1', titre: '<b>T</b>', description: '<i>D</i>' }])
    expect(html).toContain('&lt;b&gt;T&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;D&lt;/i&gt;')
  })
})
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npm test -- render.test.mjs`
Expected: FAIL — `renderPiliers is not a function`, `renderProcess is not a function`.

- [ ] **Step 3: Implémenter `renderPiliers` et `renderProcess` dans `render.mjs`**

Ajouter à la fin de `assets/js/site/render.mjs` :
```js
// Section « PILLARS » — index.html .sb (table piliers, colonne visible).
// Reproduit chaque <article class="sb" data-m="..."> ; le bloc .pil__head reste en dur (hors CMS).
export function renderPiliers(rows) {
  return rows.map((r, i) => {
    const points = Array.isArray(r.points) ? r.points : []
    return `<article class="sb" data-m="${esc(r.categorie)}">
    <div class="sb__media">
      <div class="sb__imgwrap tilt"><picture><img loading="lazy" src="${esc(r.image_path)}" alt="${esc(r.image_alt || '')}"></picture></div>
      <span class="sb__shutter"></span>
      <span class="sb__num">${esc(r.numero)}</span>
    </div>
    <div class="sb__body">
      <div class="sb__ico"><img src="${esc(r.icone_path || '')}" alt=""></div>
      <h3>${esc(r.titre)}</h3>
      <p>${esc(r.description)}</p>
      <ul class="sb__list">${points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <a class="sb__link" href="${esc(r.cta_lien || '#contact')}">${esc(r.cta_texte || 'Demander un devis')}</a>
    </div>
  </article>`
  }).join('')
}

// Section « PROCESS » — index.html .pstep (table process_etapes, PAS de colonne visible).
export function renderProcess(rows) {
  return rows.map(r => (
    `<div class="pstep" data-reveal="up"><div class="pstep__n">${esc(r.numero)}</div><h3>${esc(r.titre)}</h3><p>${esc(r.description)}</p></div>`
  )).join('')
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npm test -- render.test.mjs`
Expected: PASS (tous les tests, y compris les 11 précédents).

- [ ] **Step 5: Brancher les deux sections dans `cms-lists.js`**

Dans `assets/js/site/cms-lists.js`, modifier l'import et `mountAll` :
```js
import { renderCommunes, renderPiliers, renderProcess } from './render.mjs'
```
```js
async function mountAll() {
  await mountList({ table: 'communes', selector: '.zone__communes', hasVisible: false, render: renderCommunes })
  await mountList({ table: 'piliers', selector: '#pil', hasVisible: true, render: renderPiliers })
  await mountList({ table: 'process_etapes', selector: '#process', hasVisible: false, render: renderProcess })
}
```

**Attention** : `#pil` et `#process` sont les `<section>` entières (elles contiennent aussi `.pil__head`/`.process__head`, hors CMS). `mountList` avec `selector: '#pil'` remplacerait tout le `innerHTML` de la section, y compris le head. Il faut donc cibler un conteneur plus précis. Relire `index.html:217-283` : les 4 `<article class="sb">` sont des enfants directs de `<section class="pil" id="pil">`, au même niveau que `.pil__head`. Il n'y a pas de wrapper dédié aux cartes.

Pour ne pas casser `.pil__head`/`.process__head`, ajouter un wrapper dans `index.html` autour des cartes plutôt que cibler la section :

Dans `index.html`, modifier la section `#pil` (lignes 217-283) : entourer les 4 `<article class="sb">` d'un `<div id="pilCards">` :
```html
<section class="pil" id="pil">
  <div class="pil__head">
    <p class="pil__eyebrow" data-cms="sections.pil_eyebrow">Nos expertises</p>
    <h2 data-cms-html="sections.pil_titre">Quatre piliers, <em>une même exigence</em></h2>
    <p data-cms="sections.pil_intro">Du simple dépannage au chantier neuf. On vous explique tout simplement, et on soigne chaque finition.</p>
  </div>
  <div id="pilCards">
  <article class="sb" data-m="plomberie">
    ...
  </article>
  ...
  </div>
</section>
```
(Fermer `</div>` juste avant `</section>`, après le 4e `<article class="sb" data-m="piscine">`.)

De même pour `#process` (lignes 286-308) : entourer les `<div class="pstep">` d'un `<div id="processCards">` à la place de `.process__grid` qui existe déjà — **réutiliser `.process__grid` comme sélecteur**, il contient déjà exactement les 3 `<div class="pstep">` et rien d'autre (vérifié : `data-stagger` sur le même élément, pas de head à l'intérieur). Pas de wrapper à ajouter pour process.

Pour piliers, mettre à jour `cms-lists.js` avec le nouveau sélecteur `#pilCards` :
```js
  await mountList({ table: 'piliers', selector: '#pilCards', hasVisible: true, render: renderPiliers })
  await mountList({ table: 'process_etapes', selector: '.process__grid', hasVisible: false, render: renderProcess })
```

- [ ] **Step 6: Vérifier qu'il n'y a qu'un seul `#pilCards` et un seul `.process__grid`**

Run: `grep -c "pilCards\|process__grid" index.html`
Expected: `3` (ouverture + fermeture de `#pilCards` compte pour 1 match `id="pilCards"`, plus 1 match `process__grid`) — vérifier manuellement avec :
Run: `grep -n "pilCards\|process__grid" index.html`
Expected: une ligne `<div id="pilCards">` et une ligne `<div class="process__grid" data-stagger>`.

- [ ] **Step 7: Build de vérification**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 8: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add assets/js/site/render.mjs assets/js/site/render.test.mjs assets/js/site/cms-lists.js index.html
git commit -m "$(cat <<'EOF'
feat(site): branche piliers et process en lecture live (CMS)

Ajoute renderPiliers/renderProcess (render.mjs) + wiring dans
cms-lists.js. Ajoute un wrapper #pilCards dans index.html pour isoler
les cartes .sb du bandeau .pil__head (hors CMS) ; process reutilise le
conteneur .process__grid existant. Donnees deja en base (pas de seed
necessaire pour ces deux tables).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `renderFaq` + seed `faq` — branchement FAQ (accordéon)

**Files:**
- Modify: `assets/js/site/render.mjs` (ajoute `renderFaq`)
- Modify: `assets/js/site/render.test.mjs` (ajoute les tests)
- Modify: `assets/js/site/cms-lists.js` (ajoute `mountList` faq + ré-application de l'accordéon)
- Create: `supabase/migrations/20260701130000_seed_faq.sql`

**Interfaces:**
- Consumes: `esc` (Task 2), `mountList` (Task 2)
- Produces: `renderFaq(rows)` — `(rows: Array<{question, reponse}>) => string`, retourne les `<div class="faqitem">`.

- [ ] **Step 1: Écrire les tests `renderFaq`**

Ajouter dans `assets/js/site/render.test.mjs` :
```js
import { renderFaq } from './render.mjs'

describe('renderFaq', () => {
  it('rend un item accordéon avec question/réponse', () => {
    const html = renderFaq([{ question: 'Intervenez-vous en urgence ?', reponse: 'Oui, selon nos disponibilités.' }])
    expect(html).toBe(
      '<div class="faqitem" data-reveal="up">' +
      '<button class="faqitem__q">Intervenez-vous en urgence ?</button>' +
      '<div class="faqitem__a"><p>Oui, selon nos disponibilités.</p></div>' +
      '</div>'
    )
  })

  it('échappe question et réponse', () => {
    const html = renderFaq([{ question: '<b>Q</b>', reponse: '<i>R</i>' }])
    expect(html).toContain('&lt;b&gt;Q&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;R&lt;/i&gt;')
  })

  it('concatène plusieurs items dans l\'ordre', () => {
    const html = renderFaq([{ question: 'A', reponse: 'a' }, { question: 'B', reponse: 'b' }])
    expect(html.indexOf('>A<')).toBeLessThan(html.indexOf('>B<'))
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm test -- render.test.mjs`
Expected: FAIL — `renderFaq is not a function`.

- [ ] **Step 3: Implémenter `renderFaq`**

Ajouter à la fin de `assets/js/site/render.mjs` :
```js
// Section « FAQ » — index.html .faqitem (table faq, colonne visible).
export function renderFaq(rows) {
  return rows.map(r => (
    `<div class="faqitem" data-reveal="up"><button class="faqitem__q">${esc(r.question)}</button><div class="faqitem__a"><p>${esc(r.reponse)}</p></div></div>`
  )).join('')
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm test -- render.test.mjs`
Expected: PASS.

- [ ] **Step 5: Écrire la migration de seed**

Créer `supabase/migrations/20260701130000_seed_faq.sql` (5 questions extraites de `index.html:432-451`) :
```sql
-- ============================================================
--  Seed de la FAQ (section #faq) depuis index.html.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.faq (question, reponse, ordre, visible)
select v.question, v.reponse, v.ordre, true
from (values
  ($t$Intervenez-vous en urgence ?$t$,
    $t$Oui, selon nos disponibilités et votre commune. Le téléphone reste le plus rapide pour une urgence : appelez-nous directement au 06 95 16 58 89.$t$, 0),
  ($t$Vous faites du neuf ou de la rénovation ?$t$,
    $t$Les deux. Du simple dépannage à la construction neuve, en passant par la rénovation complète de salle de bain.$t$, 1),
  ($t$Le devis est-il vraiment gratuit ?$t$,
    $t$Oui, le devis est gratuit et sans engagement. On évalue votre projet et on vous remet un prix clair avant tout démarrage.$t$, 2),
  ($t$Dans quelle zone intervenez-vous ?$t$,
    $t$Partout dans le Var (83), du littoral à l'arrière-pays. Si vous avez un doute pour votre commune, contactez-nous.$t$, 3),
  ($t$Travaillez-vous sur les 4 métiers ?$t$,
    $t$Oui : plomberie, chauffage, climatisation et piscine. Un seul interlocuteur pour l'ensemble de votre projet.$t$, 4)
) as v(question, reponse, ordre)
where not exists (select 1 from public.faq);
```

- [ ] **Step 6: Brancher la section dans `cms-lists.js` avec ré-application de l'accordéon**

Dans `assets/js/site/cms-lists.js`, modifier l'import et `mountAll`, ajouter un helper `bindFaqAccordion` :
```js
import { renderCommunes, renderPiliers, renderProcess, renderFaq } from './render.mjs'
```
```js
async function mountAll() {
  await mountList({ table: 'communes', selector: '.zone__communes', hasVisible: false, render: renderCommunes })
  await mountList({ table: 'piliers', selector: '#pilCards', hasVisible: true, render: renderPiliers })
  await mountList({ table: 'process_etapes', selector: '.process__grid', hasVisible: false, render: renderProcess })
  const faqMounted = await mountList({ table: 'faq', selector: '.faq__list', hasVisible: true, render: renderFaq })
  if (faqMounted) bindFaqAccordion()
}

// main.js attache déjà le comportement accordéon au chargement, mais sur les
// .faqitem en dur : si le CMS a remplacé le contenu après coup, on ré-attache
// les écouteurs sur les nouveaux boutons.
function bindFaqAccordion() {
  document.querySelectorAll('.faqitem__q').forEach(q => q.addEventListener('click', () => {
    const item = q.closest('.faqitem')
    const wasOpen = item.classList.contains('open')
    document.querySelectorAll('.faqitem').forEach(i => i.classList.remove('open'))
    if (!wasOpen) item.classList.add('open')
  }))
}
```

`mountList` doit désormais renvoyer `true`/`false` pour signaler si le remplacement a eu lieu. Modifier `mountList` dans `assets/js/site/cms-lists.js` :
```js
export async function mountList({ table, selector, hasVisible, render }) {
  const container = document.querySelector(selector)
  if (!container || !configured || !supabase) return false
  let query = supabase.from(table).select('*')
  if (hasVisible) query = query.eq('visible', true)
  const { data, error } = await query.order('ordre', { ascending: true })
  if (error || !data || !data.length) return false // fallback : HTML en dur conserve
  container.innerHTML = render(data)
  return true
}
```

- [ ] **Step 7: Vérifier le sélecteur `.faq__list` est unique**

Run: `grep -n "faq__list" index.html`
Expected: une seule ligne, `<div class="faq__list" data-stagger>` (`index.html:431`).

- [ ] **Step 8: Build de vérification**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 9: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add assets/js/site/render.mjs assets/js/site/render.test.mjs assets/js/site/cms-lists.js supabase/migrations/20260701130000_seed_faq.sql
git commit -m "$(cat <<'EOF'
feat(site): branche la FAQ en lecture live (CMS) + seed

Ajoute renderFaq (render.mjs), wiring dans cms-lists.js avec
re-attachement de l'accordeon apres remplacement du HTML en dur, et
seed des 5 questions/reponses existantes (supabase/migrations/
20260701130000_seed_faq.sql, idempotent).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `renderArticles` + seed `articles` — branchement conseils/blog

**Files:**
- Modify: `assets/js/site/render.mjs` (ajoute `renderArticles`)
- Modify: `assets/js/site/render.test.mjs` (ajoute les tests)
- Modify: `assets/js/site/cms-lists.js` (ajoute `mountList` articles)
- Create: `supabase/migrations/20260701140000_seed_articles.sql`

**Interfaces:**
- Consumes: `esc`, `publicUrl` (de `../admin/client.js`, même usage que dans `realisations.js`), `mountList` (Task 2)
- Produces: `renderArticles(rows)` — `(rows: Array<{categorie, numero, titre, extrait, meta_lecture, image_path, image_alt, lien}>) => string`, retourne les `<a class="bitem">`. **Note** : `renderArticles` prend un second paramètre `publicUrlFn` pour résoudre `image_path` (image_path peut être un chemin Storage ou un chemin `assets/...` en dur — logique déjà dans `publicUrl` de `client.js`), afin de garder `render.mjs` sans import DOM/Supabase.

- [ ] **Step 1: Écrire les tests `renderArticles`**

Ajouter dans `assets/js/site/render.test.mjs` :
```js
import { renderArticles } from './render.mjs'

describe('renderArticles', () => {
  const row = {
    categorie: 'Plomberie', numero: '01',
    titre: 'Pourquoi une installation bien faite dure vraiment plus longtemps',
    extrait: 'Matériel, pose, finitions : ce qui fait la différence.',
    meta_lecture: '5 min de lecture',
    image_path: 'https://images.pexels.com/photos/7227624/pexels-photo-7227624.jpeg',
    image_alt: '', lien: '#blog',
  }
  const resolveImg = (path) => path // identité en test : pas de resolution Supabase

  it('rend une carte .bitem avec categorie/titre/extrait/meta', () => {
    const html = renderArticles([row], resolveImg)
    expect(html).toContain('<a href="#blog" class="bitem" data-m="Plomberie">')
    expect(html).toContain('<span class="bitem__n">01</span>')
    expect(html).toContain('<span class="bitem__cat">Plomberie</span>')
    expect(html).toContain('<h3>Pourquoi une installation bien faite dure vraiment plus longtemps</h3>')
    expect(html).toContain('<p>Matériel, pose, finitions : ce qui fait la différence.</p>')
    expect(html).toContain('<span class="bitem__meta">5 min de lecture</span>')
  })

  it('utilise resolveImg pour construire le src de l\'image', () => {
    const resolve = (path) => `RESOLVED(${path})`
    const html = renderArticles([row], resolve)
    expect(html).toContain('src="RESOLVED(https://images.pexels.com/photos/7227624/pexels-photo-7227624.jpeg)"')
  })

  it('échappe titre/extrait/categorie', () => {
    const html = renderArticles([{ ...row, titre: '<b>T</b>', extrait: '<i>E</i>' }], resolveImg)
    expect(html).toContain('&lt;b&gt;T&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;E&lt;/i&gt;')
  })

  it('utilise lien="#blog" par défaut si absent', () => {
    const html = renderArticles([{ ...row, lien: null }], resolveImg)
    expect(html).toContain('<a href="#blog" class="bitem"')
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm test -- render.test.mjs`
Expected: FAIL — `renderArticles is not a function`.

- [ ] **Step 3: Implémenter `renderArticles`**

Ajouter à la fin de `assets/js/site/render.mjs` :
```js
// Section « CONSEILS » — index.html .bitem (table articles, colonne visible).
// resolveImg : fonction fournie par l'appelant (publicUrl de admin/client.js) pour
// garder ce module sans dependance DOM/Supabase, donc testable en Node pur.
export function renderArticles(rows, resolveImg) {
  return rows.map(r => {
    const img = resolveImg(r.image_path)
    return `<a href="${esc(r.lien || '#blog')}" class="bitem" data-m="${esc(r.categorie)}">
      <div class="bitem__img"><img loading="lazy" src="${esc(img)}" alt="${esc(r.image_alt || '')}"></div>
      <span class="bitem__n">${esc(r.numero)}</span>
      <div class="bitem__body">
        <span class="bitem__cat">${esc(r.categorie)}</span>
        <h3>${esc(r.titre)}</h3>
        <p>${esc(r.extrait)}</p>
        <span class="bitem__meta">${esc(r.meta_lecture)}</span>
      </div>
      <span class="bitem__arrow">↗</span>
    </a>`
  }).join('')
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm test -- render.test.mjs`
Expected: PASS.

- [ ] **Step 5: Écrire la migration de seed**

Créer `supabase/migrations/20260701140000_seed_articles.sql` (3 articles extraits de `index.html:389-422`, `lien` mis à `#blog` car pas de page détail — hors périmètre) :
```sql
-- ============================================================
--  Seed des articles (section #blog) depuis index.html.
--  N'insere que si la table est vide (idempotent).
--  lien = '#blog' : pas de page article detaillee (hors perimetre CMS).
-- ============================================================
insert into public.articles (categorie, numero, titre, extrait, meta_lecture, image_path, image_alt, lien, ordre, visible)
select v.categorie, v.numero, v.titre, v.extrait, v.meta_lecture, v.image_path, v.image_alt, v.lien, v.ordre, true
from (values
  ('Plomberie','01',
    $t$Pourquoi une installation bien faite dure vraiment plus longtemps$t$,
    $t$Matériel, pose, finitions : ce qui fait la différence entre une réparation qui tient et une intervention à refaire.$t$,
    '5 min de lecture',
    'https://images.pexels.com/photos/7227624/pexels-photo-7227624.jpeg?auto=compress&cs=tinysrgb&w=800', '',
    '#blog', 0),
  ('Chauffage','02',
    $t$Bien choisir entre pompe à chaleur, chaudière et plancher chauffant$t$,
    $t$Un comparatif simple pour choisir la solution adaptée à votre logement et votre budget.$t$,
    '7 min de lecture',
    'assets/photos/pompe-a-chaleur.jpg', '',
    '#blog', 1),
  ('Climatisation','03',
    $t$Gainable ou split : comment bien rafraîchir sa maison$t$,
    $t$Les options pour rester au frais l'été, discrètement, sans faire exploser sa facture.$t$,
    '6 min de lecture',
    'assets/photos/climatisation.jpg', '',
    '#blog', 2)
) as v(categorie, numero, titre, extrait, meta_lecture, image_path, image_alt, lien, ordre)
where not exists (select 1 from public.articles);
```

- [ ] **Step 6: Brancher la section dans `cms-lists.js`**

Dans `assets/js/site/cms-lists.js`, modifier l'import (ajouter `publicUrl` de `client.js` et `renderArticles`) :
```js
import { supabase, configured, publicUrl } from '../admin/client.js'
import { renderCommunes, renderPiliers, renderProcess, renderFaq, renderArticles } from './render.mjs'
```
Ajouter dans `mountAll` :
```js
  await mountList({
    table: 'articles', selector: '.blog__list', hasVisible: true,
    render: rows => renderArticles(rows, path => publicUrl('articles', path)),
  })
```

- [ ] **Step 7: Vérifier le sélecteur `.blog__list` est unique**

Run: `grep -n "blog__list" index.html`
Expected: une seule ligne, `<div class="blog__list">` (`index.html:388`).

- [ ] **Step 8: Build de vérification**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 9: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add assets/js/site/render.mjs assets/js/site/render.test.mjs assets/js/site/cms-lists.js supabase/migrations/20260701140000_seed_articles.sql
git commit -m "$(cat <<'EOF'
feat(site): branche les articles/conseils en lecture live (CMS) + seed

Ajoute renderArticles (render.mjs, resolveImg injecte pour rester sans
dependance DOM/Supabase) et wiring dans cms-lists.js via publicUrl.
Seed des 3 articles existants (supabase/migrations/
20260701140000_seed_articles.sql, idempotent). Pas de page article
detaillee : lien = '#blog' pour chaque carte (hors perimetre).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `renderAvis` + seed `avis` — branchement marquee avis, neutralisation de `main.js`

**Files:**
- Modify: `assets/js/site/render.mjs` (ajoute `renderAvis`)
- Modify: `assets/js/site/render.test.mjs` (ajoute les tests)
- Modify: `assets/js/site/cms-lists.js` (ajoute `mountList` avis avec doublement des cartes pour le marquee)
- Modify: `assets/js/main.js:27-36` (neutralise le remplissage en dur)
- Create: `supabase/migrations/20260701150000_seed_avis.sql`

**Interfaces:**
- Consumes: `esc`, `mountList` (Task 2)
- Produces: `renderAvis(rows)` — `(rows: Array<{texte, auteur}>) => string`, retourne les `<div class="rea__rev">` **doublés** (comme `main.js` le fait aujourd'hui avec `[...reviews, ...reviews]`, pour l'effet de boucle continue du marquee CSS).

**Décision de neutralisation** : `main.js` (chargé en `<script src>` classique, non-module, donc exécuté **avant** les modules `type="module"`) remplit `#reaTrack` en premier avec les 4 avis en dur. `cms-lists.js` (module, différé, exécuté après) écrase ensuite `#reaTrack.innerHTML` si la base répond. Comme `type="module"` est **toujours différé** (équivalent `defer`) et s'exécute après les scripts classiques inline/`src`, l'ordre d'exécution garantit déjà que le module CMS passe en dernier — donc fait autorité par défaut. Il faut seulement retirer le remplissage en dur de `main.js` pour que `#reaTrack` ne soit pas rempli deux fois si Supabase est down (dans ce cas on veut le HTML en dur — mais il n'y a **plus** de HTML en dur dans `index.html` pour `#reaTrack`, ce dernier est vide et rempli exclusivement par JS). Donc : garder le remplissage en dur dans `main.js` comme **fallback**, mais le neutraliser si `cms-lists.js` a déjà rempli le conteneur (marqueur `data-cms-filled`).

- [ ] **Step 1: Écrire les tests `renderAvis`**

Ajouter dans `assets/js/site/render.test.mjs` :
```js
import { renderAvis } from './render.mjs'

describe('renderAvis', () => {
  const rows = [
    { texte: 'Travail soigné, propre, dans les délais.', auteur: 'François R.' },
    { texte: 'Super plombier, efficace.', auteur: 'Manon S.' },
  ]

  it('rend une carte .rea__rev par avis avec 5 étoiles', () => {
    const html = renderAvis(rows)
    expect(html).toContain('<div class="rea__rev"><div class="stars">★★★★★</div><p>« Travail soigné, propre, dans les délais. »</p><div class="who">François R.</div></div>')
  })

  it('double la liste (boucle marquee continue)', () => {
    const html = renderAvis(rows)
    const count = html.split('class="rea__rev"').length - 1
    expect(count).toBe(4) // 2 avis x 2
  })

  it('échappe texte et auteur', () => {
    const html = renderAvis([{ texte: '<b>T</b>', auteur: '<i>A</i>' }])
    expect(html).toContain('&lt;b&gt;T&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;A&lt;/i&gt;')
  })

  it('retourne une chaîne vide sur liste vide', () => {
    expect(renderAvis([])).toBe('')
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm test -- render.test.mjs`
Expected: FAIL — `renderAvis is not a function`.

- [ ] **Step 3: Implémenter `renderAvis`**

Ajouter à la fin de `assets/js/site/render.mjs` :
```js
// Section « REASSURANCE » — index.html #reaTrack (table avis, colonne visible).
// Doublonne la liste (comme le faisait assets/js/main.js) pour la boucle CSS du marquee.
export function renderAvis(rows) {
  const card = r => `<div class="rea__rev"><div class="stars">★★★★★</div><p>« ${esc(r.texte)} »</p><div class="who">${esc(r.auteur)}</div></div>`
  return [...rows, ...rows].map(card).join('')
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm test -- render.test.mjs`
Expected: PASS.

- [ ] **Step 5: Écrire la migration de seed**

Créer `supabase/migrations/20260701150000_seed_avis.sql` (4 avis extraits de `assets/js/main.js:29-33`) :
```sql
-- ============================================================
--  Seed des avis clients (marquee #reaTrack) depuis assets/js/main.js.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.avis (texte, auteur, ordre, visible)
select v.texte, v.auteur, v.ordre, true
from (values
  ($t$Travail soigné, propre, dans les délais. Je recommande.$t$, 'François R.', 0),
  ($t$Super plombier, efficace et de bon conseil. Merci !$t$,      'Manon S.',    1),
  ($t$Réponse rapide, prix justes, chantier nickel.$t$,            'Camille L.',  2),
  ($t$Intervention propre, tout bien expliqué.$t$,                 'Karim B.',    3)
) as v(texte, auteur, ordre)
where not exists (select 1 from public.avis);
```

- [ ] **Step 6: Neutraliser le remplissage en dur de `main.js`**

Dans `assets/js/main.js`, remplacer le bloc (lignes 27-36) :
```js
// ---- Marquee reviews ----
const reviews=[
  ['Travail soigné, propre, dans les délais. Je recommande.','François R.'],
  ['Super plombier, efficace et de bon conseil. Merci !','Manon S.'],
  ['Réponse rapide, prix justes, chantier nickel.','Camille L.'],
  ['Intervention propre, tout bien expliqué.','Karim B.'],
];
const track=document.getElementById('reaTrack');
const cards=[...reviews,...reviews].map(([t,w])=>`<div class="rea__rev"><div class="stars">★★★★★</div><p>« ${t} »</p><div class="who">${w}</div></div>`).join('');
track.innerHTML=cards;
```
par :
```js
// ---- Marquee reviews (fallback en dur) ----
// cms-lists.js (module, differe) tente de charger les avis depuis Supabase et
// pose data-cms-filled sur #reaTrack s'il reussit ; ce script (classique, execute
// avant les modules) ne remplit le marquee que si le CMS n'a pas encore agi.
const reviews=[
  ['Travail soigné, propre, dans les délais. Je recommande.','François R.'],
  ['Super plombier, efficace et de bon conseil. Merci !','Manon S.'],
  ['Réponse rapide, prix justes, chantier nickel.','Camille L.'],
  ['Intervention propre, tout bien expliqué.','Karim B.'],
];
const track=document.getElementById('reaTrack');
if(track && !track.dataset.cmsFilled){
  const cards=[...reviews,...reviews].map(([t,w])=>`<div class="rea__rev"><div class="stars">★★★★★</div><p>« ${t} »</p><div class="who">${w}</div></div>`).join('');
  track.innerHTML=cards;
}
```

- [ ] **Step 7: Brancher la section dans `cms-lists.js` avec le marqueur `data-cms-filled`**

Dans `assets/js/site/cms-lists.js`, modifier l'import et `mountAll` :
```js
import { renderCommunes, renderPiliers, renderProcess, renderFaq, renderArticles, renderAvis } from './render.mjs'
```
Ajouter dans `mountAll`, **avant** les autres appels (le marquee doit être posé tôt puisque `main.js` s'exécute avant les modules, mais `cms-lists.js` est différé donc s'exécute de toute façon après — le marqueur sert à documenter/empêcher tout re-remplissage en cas de ré-exécution) :
```js
  const avisMounted = await mountList({ table: 'avis', selector: '#reaTrack', hasVisible: true, render: renderAvis })
  if (avisMounted) document.getElementById('reaTrack').dataset.cmsFilled = '1'
```

**Ordre final complet de `mountAll`** (remplacer entièrement la fonction) :
```js
async function mountAll() {
  const avisMounted = await mountList({ table: 'avis', selector: '#reaTrack', hasVisible: true, render: renderAvis })
  if (avisMounted) document.getElementById('reaTrack').dataset.cmsFilled = '1'
  await mountList({ table: 'communes', selector: '.zone__communes', hasVisible: false, render: renderCommunes })
  await mountList({ table: 'piliers', selector: '#pilCards', hasVisible: true, render: renderPiliers })
  await mountList({ table: 'process_etapes', selector: '.process__grid', hasVisible: false, render: renderProcess })
  const faqMounted = await mountList({ table: 'faq', selector: '.faq__list', hasVisible: true, render: renderFaq })
  if (faqMounted) bindFaqAccordion()
  await mountList({
    table: 'articles', selector: '.blog__list', hasVisible: true,
    render: rows => renderArticles(rows, path => publicUrl('articles', path)),
  })
}
```

**Note sur le fallback `#reaTrack`** : contrairement aux autres sections, `#reaTrack` (`index.html:168`) est un `<div>` **vide** dans le HTML — le contenu en dur vit dans `main.js`, pas dans `index.html`. Si Supabase est down, `mountList` retourne `false` sans toucher au `<div>`, et c'est `main.js` (exécuté avant, non bloqué) qui l'a déjà rempli avec les 4 avis en dur : le fallback fonctionne bien, car `main.js` s'exécute **avant** que `cms-lists.js` (module différé) ne tente quoi que ce soit — au moment où `main.js` tourne, `track.dataset.cmsFilled` est toujours `undefined`, donc `main.js` remplit systématiquement en premier, et `cms-lists.js` écrase ensuite si la base répond. Le marqueur `data-cms-filled` n'a donc d'utilité que si `mountAll()` était ré-invoqué manuellement (protection défensive), mais documente clairement quel script fait autorité.

- [ ] **Step 8: Build de vérification**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 9: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS — tous les tests `render.test.mjs` (communes, piliers, process, faq, articles, avis) et `apply-cms.test.mjs` verts.

- [ ] **Step 10: Commit**

```bash
git add assets/js/site/render.mjs assets/js/site/render.test.mjs assets/js/site/cms-lists.js assets/js/main.js supabase/migrations/20260701150000_seed_avis.sql
git commit -m "$(cat <<'EOF'
feat(site): branche les avis clients en lecture live (CMS) + seed

Ajoute renderAvis (render.mjs, liste doublee pour la boucle marquee) et
wiring dans cms-lists.js. Neutralise le remplissage en dur de main.js
via un garde data-cms-filled sur #reaTrack : main.js (script classique,
execute en premier) reste le fallback si Supabase est injoignable ;
cms-lists.js (module differe) fait autorite s'il repond. Seed des 4
avis existants (supabase/migrations/20260701150000_seed_avis.sql,
idempotent).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Couverture spec** :
- 6 modules (piliers, process, faq, articles, avis, communes) → couverts par Tasks 2-3-4-5-6, chacun avec `render*` pur + wiring `mountList`. ✓
- Patron commun `realisations.js` (fetch → remplace → fallback, `esc` échappé) → repris explicitement dans `mountList` (Task 2) et chaque `render*`. ✓
- Table + colonne `visible` : `avis`✓(T6), `piliers`✓(T3), `articles`✓(T5), `faq`✓(T4) ont `hasVisible: true` ; `process_etapes`✓(T3), `communes`✓(T2) ont `hasVisible: false`. ✓ conforme au tableau de la spec.
- Seed des 4 tables vides (`faq`, `articles`, `avis`, `communes`) → `communes` seedé en Task 2 Step 8 (`20260701125000_seed_communes.sql`), `faq` en Task 4 Step 5 (`20260701130000_seed_faq.sql`), `articles` en Task 5 Step 5 (`20260701140000_seed_articles.sql`), `avis` en Task 6 Step 5 (`20260701150000_seed_avis.sql`). Les 4 tables vides listées dans la spec ont bien chacune leur migration. ✓
- Retrait éditeur villes → Task 1. ✓
- Gestion d'erreurs (base injoignable/0 ligne → fallback ; ligne partielle → pas de "undefined") → `mountList` fait `return false` tôt ; chaque `render*` utilise `esc(r.champ ?? '')` via `esc` qui gère `null`/`undefined`, et les champs optionnels ont des valeurs par défaut (`r.image_alt || ''`, `r.lien || '#blog'`, `r.cta_texte || '...'`). ✓
- `avis.js` vs `main.js` (risque identifié dans la spec) → traité explicitement en Task 6 avec le garde `data-cms-filled`. ✓

**2. Scan placeholders** : aucun `TBD`/`TODO`/« idem tâche N »/« gérer les erreurs » vague trouvé — chaque step montre le code exact ou la commande exacte avec sortie attendue.

**3. Cohérence des noms/signatures** :
- `esc(s)` : signature identique dans les 6 usages (`render.mjs` uniquement, jamais réimportée depuis `admin/ui.js`). ✓
- `mountList({ table, selector, hasVisible, render })` : signature stable entre Task 2 (retour `boolean` introduit dès Task 4) — **incohérence corrigée** : Task 2 Step 5 définissait initialement `mountList` sans valeur de retour explicite (`return` nu = `undefined`), Task 4 Step 6 le redéfinit pour retourner `false`/`true`. Le code de Task 2 utilise `return` (equivalent `undefined`, falsy) sur le chemin d'échec, donc le comportement booléen est rétro-compatible ; Task 4 ajoute juste `return true` au chemin de succès et remplace les `return` d'échec par `return false` pour la lisibilité — aucune régression, mais bien noter que la signature finale de `mountList` (utilisée à partir de Task 4) est `Promise<boolean>`, pas `Promise<void>`. Les Tasks 2 et 3 qui appellent `mountList` sans utiliser la valeur de retour restent valides (elles ignorent simplement la valeur).
- `renderPiliers`, `renderProcess`, `renderFaq`, `renderArticles`, `renderAvis`, `renderCommunes` : toutes `(rows) => string` sauf `renderArticles(rows, resolveImg)` qui a une signature à 2 paramètres, documentée et cohérente entre son test (Task 5) et son usage dans `cms-lists.js` (`rows => renderArticles(rows, path => publicUrl('articles', path))`). ✓
- Sélecteurs DOM utilisés cohérents entre le HTML modifié et `cms-lists.js` : `.zone__communes`, `#pilCards` (nouveau wrapper créé en Task 3), `.process__grid`, `.faq__list`, `.blog__list`, `#reaTrack` — tous vérifiés par une commande `grep` dans chaque tâche avant le commit. ✓
