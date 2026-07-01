# Branchement des singletons « cuit au build » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire apparaître les textes édités dans l'admin (`site_content`) dans le HTML brut du site public, imprimés au moment du build par un plugin Vite.

**Architecture:** Chaque texte éditable porte une étiquette `data-cms="section.cle"` (ou `data-cms-attr="attr:section.cle"` pour un attribut / le `<head>`). Au build, un plugin Vite récupère toute la table `site_content` (clé anon, lecture seule) puis, via `transformIndexHtml`, réécrit le contenu des éléments étiquetés dans les pages publiques. Le HTML publié contient le vrai texte, en dur.

**Tech Stack:** Vite 5 (build + plugin), `@supabase/supabase-js` (déjà présent, fetch au build), `cheerio` (manipulation HTML build-time, préserve le doctype), `vitest` (tests unitaires). Site cible = HTML/CSS/JS vanilla, aucun framework runtime.

## Global Constraints

- **Aucun `any`** ; ce projet est en JS mais on type les JSDoc si utile. Pas de TypeScript ajouté ici.
- **Imports** : le projet utilise des imports relatifs ESM (`import … from '../admin/client.js'`) et pas d'alias `@/`. Suivre ce style existant côté site ; le plugin et les scripts de build vivent hors `assets/` (ex. `build/`).
- **Le plugin ne touche JAMAIS `admin.html`** (back-office non concerné).
- **Erreur de fetch au BUILD → build échoue** (sortie non nulle). En mode DEV (serve) → warning + table vide (fallback texte en dur), on ne casse pas le serveur de dev.
- **Clé absente** → on garde le texte en dur + warning. Jamais de trou.
- **`data-cms` va sur un élément feuille** (sans markup enfant à préserver). Si le texte est dans un élément qui contient d'autres balises (ex. `<h1>` avec `<span class="u">`), envelopper le texte dans un `<span data-cms="…">` dédié.
- **Variables d'env de build** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (déjà dans `.env.local` en local ; à déclarer sur Vercel).
- Pages publiques concernées : `index.html`, `confidentialite.html`, `mentions-legales.html`.

---

## File Structure

- `build/apply-cms.mjs` (créer) — cœur pur `applyCms(html, table) → { html, warnings }`. Aucune I/O. Utilise cheerio.
- `build/fetch-content.mjs` (créer) — `fetchContent({ url, anonKey }) → Promise<Record<string,string>>`. Lit `site_content`, renvoie la table plate `{"section.cle": valeur}`.
- `build/vite-plugin-cms.mjs` (créer) — assemble : `buildStart` récupère la table (via `fetch-content`), `transformIndexHtml` applique `apply-cms` page par page (skip `admin.html`).
- `vite.config.mjs` (modifier) — charger les env, brancher le plugin.
- `vercel.json` (modifier) — `buildCommand` + `outputDirectory`.
- `package.json` (modifier) — devDeps `cheerio`, `vitest` ; script `test`.
- `build/apply-cms.test.mjs` (créer) — tests unitaires vitest de `applyCms`.
- `index.html`, `confidentialite.html`, `mentions-legales.html` (modifier) — annotations `data-cms` / `data-cms-attr`.

---

## Task 1: Cœur pur `applyCms` (texte via `data-cms`)

**Files:**
- Create: `build/apply-cms.mjs`
- Create: `build/apply-cms.test.mjs`
- Modify: `package.json` (devDeps `cheerio`, `vitest` ; script `test`)

**Interfaces:**
- Produces: `applyCms(html: string, table: Record<string,string>) → { html: string, warnings: string[] }`. Remplace le `textContent` de chaque `[data-cms="K"]` par `table[K]` (échappé). Clé absente → texte inchangé + warning `clé manquante: K`.

- [ ] **Step 1: Installer les devDeps de build/test**

Run:
```bash
npm install -D cheerio vitest
```
Expected: `cheerio` et `vitest` ajoutés à `devDependencies` dans `package.json`.

- [ ] **Step 2: Ajouter le script de test**

Modifier `package.json`, section `scripts`, ajouter :
```json
"test": "vitest run"
```

- [ ] **Step 3: Écrire le test qui échoue**

Créer `build/apply-cms.test.mjs` :
```js
import { describe, it, expect } from 'vitest'
import { applyCms } from './apply-cms.mjs'

describe('applyCms — texte via data-cms', () => {
  it('remplace le texte d’un élément étiqueté', () => {
    const html = '<!DOCTYPE html><html><body><h1 data-cms="hero.titre">ANCIEN</h1></body></html>'
    const { html: out } = applyCms(html, { 'hero.titre': 'NOUVEAU' })
    expect(out).toContain('>NOUVEAU</h1>')
    expect(out).not.toContain('ANCIEN')
  })

  it('échappe le HTML de la valeur (pas d’injection)', () => {
    const html = '<p data-cms="x.y">z</p>'
    const { html: out } = applyCms(html, { 'x.y': '<script>alert(1)</script>' })
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>alert(1)</script>')
  })

  it('garde le texte en dur et émet un warning si la clé manque', () => {
    const html = '<p data-cms="a.b">FALLBACK</p>'
    const { html: out, warnings } = applyCms(html, {})
    expect(out).toContain('FALLBACK')
    expect(warnings).toEqual(['clé manquante: a.b'])
  })

  it('préserve le doctype et le reste du document', () => {
    const html = '<!DOCTYPE html><html><head><title>T</title></head><body><p data-cms="a.b">x</p></body></html>'
    const { html: out } = applyCms(html, { 'a.b': 'y' })
    expect(out.toLowerCase()).toContain('<!doctype html>')
    expect(out).toContain('<title>T</title>')
  })
})
```

- [ ] **Step 4: Lancer le test — il doit échouer**

Run: `npm test -- build/apply-cms.test.mjs`
Expected: FAIL (`applyCms is not a function` / module introuvable).

- [ ] **Step 5: Implémenter `applyCms`**

Créer `build/apply-cms.mjs` :
```js
import * as cheerio from 'cheerio'

/**
 * Réécrit le contenu des éléments [data-cms] à partir de la table CMS.
 * Fonction pure : pas d'I/O. Préserve le doctype et le reste du document.
 * @param {string} html
 * @param {Record<string,string>} table
 * @returns {{ html: string, warnings: string[] }}
 */
export function applyCms(html, table) {
  const $ = cheerio.load(html, { decodeEntities: false })
  const warnings = []

  $('[data-cms]').each((_, el) => {
    const key = $(el).attr('data-cms')
    const val = table[key]
    if (val === undefined) { warnings.push(`clé manquante: ${key}`); return }
    $(el).text(val) // cheerio échappe automatiquement le texte
  })

  return { html: $.html(), warnings }
}
```

- [ ] **Step 6: Lancer le test — il doit passer**

Run: `npm test -- build/apply-cms.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json build/apply-cms.mjs build/apply-cms.test.mjs
git commit -m "feat(build): coeur applyCms (data-cms texte) + tests"
```

---

## Task 2: Support des attributs et du `<head>` (`data-cms-attr`)

**Files:**
- Modify: `build/apply-cms.mjs`
- Modify: `build/apply-cms.test.mjs`

**Interfaces:**
- Consumes: `applyCms` (Task 1).
- Produces: `applyCms` gère aussi `data-cms-attr="attr:K[,attr2:K2]"` — pose `table[K]` sur l'attribut `attr` de l'élément. Utilisé pour `<title>` (via `data-cms`), meta description / og (via `data-cms-attr="content:…"`). Clé absente → attribut inchangé + warning.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `build/apply-cms.test.mjs` :
```js
describe('applyCms — attributs via data-cms-attr', () => {
  it('pose la valeur sur l’attribut visé', () => {
    const html = '<meta name="description" data-cms-attr="content:seo.meta_description" content="old">'
    const { html: out } = applyCms(html, { 'seo.meta_description': 'nouvelle desc' })
    expect(out).toContain('content="nouvelle desc"')
  })

  it('gère plusieurs paires attr:clé séparées par une virgule', () => {
    const html = '<meta data-cms-attr="content:a.b, data-x:c.d" content="o" data-x="o2">'
    const { html: out } = applyCms(html, { 'a.b': 'V1', 'c.d': 'V2' })
    expect(out).toContain('content="V1"')
    expect(out).toContain('data-x="V2"')
  })

  it('laisse l’attribut inchangé + warning si la clé manque', () => {
    const html = '<meta data-cms-attr="content:a.b" content="OLD">'
    const { html: out, warnings } = applyCms(html, {})
    expect(out).toContain('content="OLD"')
    expect(warnings).toContain('clé manquante (attr): a.b')
  })

  it('remplace le <title> via data-cms (texte)', () => {
    const html = '<head><title data-cms="seo.meta_title">Old</title></head>'
    const { html: out } = applyCms(html, { 'seo.meta_title': 'Nouveau titre' })
    expect(out).toContain('<title>Nouveau titre</title>')
  })
})
```

- [ ] **Step 2: Lancer — doit échouer**

Run: `npm test -- build/apply-cms.test.mjs`
Expected: FAIL sur les 3 premiers tests attributs (le 4e `<title>` passe déjà via Task 1).

- [ ] **Step 3: Étendre `applyCms`**

Dans `build/apply-cms.mjs`, ajouter le bloc attributs avant le `return` :
```js
  $('[data-cms-attr]').each((_, el) => {
    const spec = $(el).attr('data-cms-attr') || ''
    for (const pair of spec.split(',')) {
      const [attr, key] = pair.split(':').map((s) => s.trim())
      if (!attr || !key) continue
      const val = table[key]
      if (val === undefined) { warnings.push(`clé manquante (attr): ${key}`); continue }
      $(el).attr(attr, val)
    }
  })
```

- [ ] **Step 4: Lancer — doit passer**

Run: `npm test -- build/apply-cms.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add build/apply-cms.mjs build/apply-cms.test.mjs
git commit -m "feat(build): applyCms gere les attributs (data-cms-attr) + head"
```

---

## Task 3: Fetch Supabase au build + plugin Vite, prouvé sur le hero

**Files:**
- Create: `build/fetch-content.mjs`
- Create: `build/vite-plugin-cms.mjs`
- Modify: `vite.config.mjs`
- Modify: `index.html` (annoter le hero + le `<head>` SEO — tranche de preuve)

**Interfaces:**
- Consumes: `applyCms` (Tasks 1-2).
- Produces:
  - `fetchContent({ url, anonKey }) → Promise<Record<string,string>>` — lit toutes les lignes `site_content`, renvoie `{ "section.cle": String(valeur) }`.
  - `cmsPlugin({ url, anonKey, isBuild }) → VitePlugin` — `buildStart` remplit la table (ou échoue si `isBuild` et fetch KO), `transformIndexHtml` applique `applyCms` sauf sur `admin.html`.

- [ ] **Step 1: Implémenter `fetchContent`**

Créer `build/fetch-content.mjs` :
```js
import { createClient } from '@supabase/supabase-js'

/**
 * Récupère site_content et renvoie une table plate { "section.cle": valeur }.
 * @param {{ url: string, anonKey: string }} cfg
 * @returns {Promise<Record<string,string>>}
 */
export async function fetchContent({ url, anonKey }) {
  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase.from('site_content').select('section, cle, valeur')
  if (error) throw new Error(`fetch site_content: ${error.message}`)
  const table = {}
  for (const row of data ?? []) {
    // valeur est du jsonb ; le client le renvoie déjà décodé (string, nombre…)
    table[`${row.section}.${row.cle}`] = typeof row.valeur === 'string' ? row.valeur : String(row.valeur)
  }
  return table
}
```

- [ ] **Step 2: Implémenter le plugin**

Créer `build/vite-plugin-cms.mjs` :
```js
import { applyCms } from './apply-cms.mjs'
import { fetchContent } from './fetch-content.mjs'

/**
 * Plugin Vite : imprime les valeurs site_content dans les pages publiques.
 * @param {{ url: string, anonKey: string, isBuild: boolean }} opts
 */
export function cmsPlugin({ url, anonKey, isBuild }) {
  let table = {}
  return {
    name: 'plomeo-cms',
    async buildStart() {
      try {
        if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants')
        table = await fetchContent({ url, anonKey })
        this.info?.(`[cms] ${Object.keys(table).length} clés chargées`)
      } catch (e) {
        if (isBuild) throw new Error(`[cms] build interrompu : ${e.message}`)
        console.warn(`[cms] dev sans contenu (fallback texte en dur) : ${e.message}`)
        table = {}
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.filename && ctx.filename.replace(/\\/g, '/').endsWith('admin.html')) return html
        const { html: out, warnings } = applyCms(html, table)
        for (const w of warnings) console.warn(`[cms] ${ctx.path}: ${w}`)
        return out
      },
    },
  }
}
```

- [ ] **Step 3: Brancher le plugin dans `vite.config.mjs`**

Modifier `vite.config.mjs` : importer `loadEnv` et le plugin, exposer `plugins`. Remplacer `export default defineConfig({ … })` par la forme fonction :
```js
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { cmsPlugin } from './build/vite-plugin-cms.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      cmsPlugin({
        url: env.VITE_SUPABASE_URL,
        anonKey: env.VITE_SUPABASE_ANON_KEY,
        isBuild: command === 'build',
      }),
    ],
    server: {
      watch: {
        ignored: ['**/Elements/Vidéo/**', '**/Plomeo v1/**', '**/*.mov', '**/*.mp4', '**/*-backup.html'],
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          confidentialite: resolve(__dirname, 'confidentialite.html'),
          mentions: resolve(__dirname, 'mentions-legales.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
    },
  }
})
```

- [ ] **Step 4: Annoter le hero + le `<head>` SEO dans `index.html` (tranche de preuve)**

Dans `index.html`, `<head>` :
- Ligne `<title>…</title>` → `<title data-cms="seo.meta_title">Ploméo | Plomberie, chauffage, climatisation & piscine dans le Var (83)</title>`
- Ligne `<meta name="description" content="…">` → ajouter `data-cms-attr="content:seo.meta_description"`.
- Ligne `<meta property="og:title" content="…">` → ajouter `data-cms-attr="content:seo.meta_title"`.
- Ligne `<meta property="og:description" content="…">` → ajouter `data-cms-attr="content:seo.meta_description"`.

Dans le hero (`<section class="hero" …>`), envelopper les textes dans des `<span data-cms>` (l'étiquette va sur une feuille, pas sur le `<h1>` qui contient `<span class="u">`) :
```html
<h1 class="hero__title" id="heroTitle"><span data-cms="hero.titre">L'ARTISAN</span><span class="u"></span></h1>
<p class="hero__accent" data-cms="hero.accent">qu'il vous faut !</p>
<p class="hero__lead" data-cms="hero.lead">Votre expert plombier dans le Var. Plomberie, chauffage, climatisation et piscine, du simple dépannage à la construction neuve.</p>
<div class="hero__cta">
  <a href="#contact" class="hbtn hbtn--orange" data-cms="hero.cta1_label">Demander un devis</a>
  <a href="#work" class="hbtn hbtn--ghost magnetic" data-cms="hero.cta2_label">Voir les réalisations</a>
</div>
```

- [ ] **Step 5: Build local et prouver que le texte est cuit**

Run:
```bash
export VITE_SUPABASE_URL="$(sed -n 's/^VITE_SUPABASE_URL=//p' .env.local | tr -d '\r')"
export VITE_SUPABASE_ANON_KEY="$(sed -n 's/^VITE_SUPABASE_ANON_KEY=//p' .env.local | tr -d '\r')"
npx vite build
grep -c "Votre artisan plombier dans le Var" dist/index.html
```
Expected: le build réussit ; `grep` renvoie `1` — c'est la valeur **de la base** (`hero.lead` = « Votre **artisan** plombier… »), qui remplace le texte en dur (« Votre **expert** plombier… »). Preuve que c'est cuit au build.

- [ ] **Step 6: Vérifier que admin.html n'est pas altéré**

Run: `grep -c 'data-cms' dist/admin.html || true`
Expected: `0` (le plugin saute `admin.html`).

- [ ] **Step 7: Commit**

```bash
git add build/fetch-content.mjs build/vite-plugin-cms.mjs vite.config.mjs index.html
git commit -m "feat(build): plugin CMS au build + branchement hero/SEO (preuve)"
```

---

## Task 4: Bascule Vercel + vérification sur preview

**Files:**
- Modify: `vercel.json`

**Interfaces:**
- Consumes: le build de la Task 3 (`dist/`).
- Produces: déploiement Vercel qui exécute `vite build` et sert `dist/`.

- [ ] **Step 1: Modifier `vercel.json`**

Remplacer le contenu par :
```json
{
  "version": 2,
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "framework": null,
  "cleanUrls": false,
  "trailingSlash": false
}
```

- [ ] **Step 2: Déclarer les variables d'env sur Vercel (manuel)**

Dans le dashboard Vercel du projet → Settings → Environment Variables, ajouter pour l'environnement **Production** ET **Preview** :
- `VITE_SUPABASE_URL` = `https://qetptoyouhtyzueequdy.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (clé anon, cf. `.env.local`)

Expected: variables présentes sur les deux environnements. (Sans elles, le build échoue — comportement voulu.)

- [ ] **Step 3: Déployer sur une preview (pas la prod)**

Pousser la branche de travail (PR) : Vercel crée automatiquement un déploiement **Preview**. Ne pas merger encore.

- [ ] **Step 4: Vérifier la source live**

Sur l'URL de preview Vercel, afficher le code source de la page (Ctrl+U) et confirmer que `Votre artisan plombier dans le Var` est présent **dans le HTML brut**, ainsi que le `<title>` et la meta description issus de `seo.*`.
Expected: texte présent dans la source (pas seulement après exécution JS).

- [ ] **Step 5: Vérifier la non-régression galerie**

Sur la preview, la galerie #work charge bien les réalisations (lecture live) et les pages légales s'affichent.
Expected: galerie OK, pages légales OK.

- [ ] **Step 6: Commit**

```bash
git add vercel.json
git commit -m "chore(deploy): Vercel build vite + outputDirectory dist"
```

---

## Task 5: Annoter tous les singletons restants

**Files:**
- Modify: `index.html` (sections `intro`, `about`, `nav`, `footer`, `sections`)
- Modify: `confidentialite.html`, `mentions-legales.html` (clés `legal.*` si applicables)

**Interfaces:**
- Consumes: le plugin (Task 3) — aucune nouvelle interface, uniquement des annotations.

- [ ] **Step 1: Lister les clés singleton disponibles**

Run:
```bash
grep -oE "\('[a-z_]+','[a-z0-9_]+'" supabase/migrations/20260625190000_seed_site_content.sql | tr -d "('" | sort
```
Expected: la liste `section,cle` de tous les singletons (hero, intro, about, nav, footer, sections, seo, legal…).

- [ ] **Step 2: Annoter chaque texte singleton dans `index.html`**

Pour chaque texte correspondant à une clé listée, poser `data-cms="section.cle"` sur l'élément feuille qui le contient (envelopper dans un `<span data-cms>` si l'élément a du markup enfant à préserver). Couvrir : `intro.*` (pastilles, texte intro), `about.*`, `nav.*` (libellés du menu), `footer.*`, `sections.*` (titres/sous-titres de sections). Ne PAS annoter les listes (piliers, avis, faq, process, communes, réalisations) — hors périmètre.

- [ ] **Step 3: Annoter les pages légales**

Dans `confidentialite.html` et `mentions-legales.html`, poser `data-cms="legal.<cle>"` sur les blocs correspondant aux clés `legal.*` du seed (si présentes).

- [ ] **Step 4: Rebuild et vérifier plusieurs sections**

Run:
```bash
export VITE_SUPABASE_URL="$(sed -n 's/^VITE_SUPABASE_URL=//p' .env.local | tr -d '\r')"
export VITE_SUPABASE_ANON_KEY="$(sed -n 's/^VITE_SUPABASE_ANON_KEY=//p' .env.local | tr -d '\r')"
npx vite build 2>&1 | grep -i "clé manquante" || echo "aucune clé manquante"
```
Expected: build OK ; idéalement « aucune clé manquante » (sinon corriger les étiquettes fautives listées dans les warnings).

- [ ] **Step 5: Preview visuelle locale**

Run: `npx vite preview`
Ouvrir l'URL affichée, vérifier que le site est visuellement intact (le texte peut différer légèrement du HTML en dur puisqu'il vient maintenant de la base).
Expected: rendu correct, pas de section vide.

- [ ] **Step 6: Commit**

```bash
git add index.html confidentialite.html mentions-legales.html
git commit -m "feat(site): annotation data-cms de tous les singletons"
```

---

## Task 6: Données structurées SEO (JSON-LD) depuis `seo.*`

**Files:**
- Modify: `build/apply-cms.mjs`
- Modify: `build/apply-cms.test.mjs`
- Modify: `index.html` (le `<script type="application/ld+json">`)

**Interfaces:**
- Consumes: `applyCms` (Tasks 1-2).
- Produces: `applyCms` sait mettre à jour des champs JSON-LD via `data-cms-json` sur le `<script type="application/ld+json">`, valeur = liste `champJson:cle` (chemins simples de premier niveau).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `build/apply-cms.test.mjs` :
```js
describe('applyCms — JSON-LD via data-cms-json', () => {
  it('met à jour les champs de premier niveau du bloc ld+json', () => {
    const html = `<script type="application/ld+json" data-cms-json="name:seo.meta_title,description:seo.meta_description">
      {"@type":"Plumber","name":"OLD","description":"OLDD"}
    </script>`
    const { html: out } = applyCms(html, { 'seo.meta_title': 'Ploméo', 'seo.meta_description': 'desc' })
    const json = JSON.parse(out.match(/\{[\s\S]*\}/)[0])
    expect(json.name).toBe('Ploméo')
    expect(json.description).toBe('desc')
    expect(json['@type']).toBe('Plumber')
  })
})
```

- [ ] **Step 2: Lancer — doit échouer**

Run: `npm test -- build/apply-cms.test.mjs`
Expected: FAIL (le bloc JSON-LD n'est pas encore géré).

- [ ] **Step 3: Étendre `applyCms`**

Dans `build/apply-cms.mjs`, ajouter avant le `return` :
```js
  $('script[data-cms-json]').each((_, el) => {
    const spec = $(el).attr('data-cms-json') || ''
    let json
    try { json = JSON.parse($(el).text()) } catch { warnings.push('JSON-LD illisible'); return }
    for (const pair of spec.split(',')) {
      const [field, key] = pair.split(':').map((s) => s.trim())
      if (!field || !key) continue
      const val = table[key]
      if (val === undefined) { warnings.push(`clé manquante (json): ${key}`); continue }
      json[field] = val
    }
    $(el).text(JSON.stringify(json, null, 2))
  })
```

- [ ] **Step 4: Lancer — doit passer**

Run: `npm test -- build/apply-cms.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 5: Annoter le bloc JSON-LD de `index.html`**

Sur `<script type="application/ld+json">`, ajouter `data-cms-json="name:seo.schema_name,description:seo.meta_description"` (adapter aux clés `seo.*` réellement présentes — `name`, `description`, `addressRegion` via `seo.address_region`, etc. ; se limiter aux champs de premier niveau).

- [ ] **Step 6: Rebuild et vérifier le JSON-LD cuit**

Run:
```bash
export VITE_SUPABASE_URL="$(sed -n 's/^VITE_SUPABASE_URL=//p' .env.local | tr -d '\r')"
export VITE_SUPABASE_ANON_KEY="$(sed -n 's/^VITE_SUPABASE_ANON_KEY=//p' .env.local | tr -d '\r')"
npx vite build && grep -A2 'application/ld+json' dist/index.html | head
```
Expected: le bloc JSON-LD de `dist/index.html` contient les valeurs issues de la base.

- [ ] **Step 7: Commit**

```bash
git add build/apply-cms.mjs build/apply-cms.test.mjs index.html
git commit -m "feat(seo): JSON-LD cuit au build depuis seo.*"
```

---

## Self-Review — couverture de la spec

- **Étiquettes `data-cms` + plugin Vite** → Tasks 1, 2, 3. ✅
- **`<head>` / SEO (title, meta, og)** → Task 2 (attributs) + Task 3 step 4. ✅
- **JSON-LD structuré** → Task 6. ✅
- **Fetch anon lecture seule au build** → Task 3 (`fetch-content.mjs`). ✅
- **Ne touche pas `admin.html`** → Task 3 (skip dans `transformIndexHtml`) + vérif step 6. ✅
- **Bascule Vercel + env vars** → Task 4. ✅
- **Gestion erreurs : build échoue si fetch KO, fallback clé absente, warnings** → Task 1 (clé absente), Task 3 (fetch KO build vs dev). ✅
- **Tests : unitaire (applyCms), intégration (vite build + grep dist), e2e (preview Vercel)** → Tasks 1/2/6 (unit), Task 3 step 5 (intégration), Task 4 steps 4-5 (e2e). ✅
- **Tous les singletons** → Task 5. ✅
- **Non-régression galerie + pages légales** → Task 4 step 5, Task 5 step 5. ✅

Aucune section de la spec sans tâche. Types cohérents entre tâches (`applyCms(html, table) → {html, warnings}` stable ; `fetchContent({url,anonKey}) → table` ; `cmsPlugin({url,anonKey,isBuild})`).

---

## Task 5b: `data-cms-html` sécurisé + clés à valeur HTML + pastilles (ajout post-Task 5)

**Origine :** la Task 5 a laissé ~11 clés en dur car leur valeur contient du HTML (`<em>`, `<br>`, `<strong>`) incompatible avec le `.text()` échappé. Décision utilisateur : ajouter un mécanisme `data-cms-html` **assaini** (liste blanche) pour les couvrir, et brancher les 3 pastilles dans la section Réassurance.

**Files:** `build/apply-cms.mjs` (+ `data-cms-html`), `build/apply-cms.test.mjs` (tests), `package.json` (devDep `sanitize-html`), `index.html`, `confidentialite.html`, `mentions-legales.html`.

**Interface produite :** `applyCms` gère `data-cms-html="section.cle"` → `innerHTML = sanitize(table[K])` (liste blanche : `em, strong, b, i, br, a, span` ; attrs `a:[href,target,rel]`, `span:[class]`). Clé absente → contenu inchangé + warning `clé manquante (html): K`. Attribut retiré en sortie.

**Clés HTML à brancher (via `data-cms-html`) :** about.bio, sections.about_titre, sections.pil_titre, sections.process_titre, sections.work_titre, sections.zone_titre, sections.blog_titre, sections.faq_titre, sections.contact_titre, legal.mentions_legales, legal.confidentialite (+ about.titre si sa valeur contient du HTML).
**Pastilles (via `data-cms`) :** intro.pastille_1/2/3 sur les `.pill` de `.rea__badges`.

**Étapes :** TDD (tests data-cms-html : injecte HTML autorisé, retire balise interdite type `<script>`, fallback+warning si clé absente) → implémenter → annoter → `vite build` sans « clé manquante » → `npm test` vert → commit.
