# Branchement du site public sur `site_content` — stratégie « cuit au build »

_Spec — 2026-07-01. Périmètre : le tuyau de build + tous les singletons. Hors périmètre (specs suivantes) : les listes (piliers, FAQ, avis, process, communes, villes) et la republication automatique._

## Contexte

Le site Plomeo est un site « vanilla » (HTML + CSS + JavaScript écrits à la main, sans framework). Aujourd'hui :

- Les textes du site sont écrits **en dur** dans `index.html` (et les pages légales). Éditer dans l'admin `/admin` ne change rien au site en ligne : les deux ne sont pas reliés.
- Une seule zone est déjà dynamique : la **galerie #work**, branchée en **lecture live** sur Supabase (`assets/js/site/realisations.js`), avec secours sur le HTML en dur si la base est injoignable.
- Sur Vercel, le site est servi en **fichiers bruts** : `vercel.json` a `buildCommand: null` et `outputDirectory: "."`. Il n'y a **aucune étape de build** en production aujourd'hui (le `vite build` existe dans `package.json` mais n'est pas utilisé par Vercel).
- Les données de contenu sont stockées dans la table `public.site_content` : structure plate `(section, cle) → valeur` (jsonb, majoritairement du texte). Ex. `('hero','titre') = "L'ARTISAN"`. Lecture publique (anon) préservée après la migration RLS du 2026-07-01.

## Objectif

Faire en sorte que les textes édités dans l'admin apparaissent sur le site public, **dans le HTML brut de la page** (crucial pour le référencement Google d'un artisan local), via une étape de build qui « imprime » les valeurs de `site_content` dans les pages au moment de la publication.

Décision structurante actée : **cuit au build** (et non lecture live JS), parce que le SEO prime pour un site vitrine local. Le prix accepté : après une édition, il faut republier (délai ~1 min, automatisable dans une spec ultérieure).

## Périmètre

**Dans cette spec :**
- Le « tuyau » de build : plugin Vite qui récupère `site_content` et réécrit le HTML.
- Le branchement de **tous les textes singleton** : sections `hero`, `intro`, `about`, `nav`, `footer`, `sections`, `seo` (+ `identite`, `legal` si présents dans les pages concernées).
- La bascule de la config de déploiement Vercel vers un vrai build.

**Hors périmètre (specs suivantes) :**
- Les tables « listes » (piliers, FAQ, avis, process, communes, villes) — la galerie réalisations reste en lecture live inchangée.
- La republication automatique (admin « Enregistrer » → deploy hook Vercel).

## Architecture

### Principe : étiquettes `data-cms` + plugin Vite

Le texte en dur reste dans le HTML source (filet de sécurité + ce que voit un dev). On pose une **étiquette** sur chaque texte à rendre éditable :

```html
<h1 data-cms="hero.titre">L'ARTISAN</h1>
```

Au build, un plugin Vite (`transformIndexHtml`) va chercher les valeurs dans Supabase, construit une table `{ "hero.titre": "…", ... }`, et remplace le contenu de chaque élément `[data-cms]`. Le HTML publié contient donc le vrai texte en dur.

### Les briques (chacune isolée, à responsabilité unique)

1. **`vite-plugin-cms.mjs`** (nouveau) — plugin Vite.
   - Au démarrage du build : récupère toutes les lignes de `site_content` via `@supabase/supabase-js` (clé anon, lecture seule) et construit la table plate `{"section.cle": valeur}`.
   - Hook `transformIndexHtml` : pour chaque page publique (`index.html`, `confidentialite.html`, `mentions-legales.html`), réécrit le contenu des éléments `[data-cms]`.
   - **Cœur = fonction pure** `applyCms(table, html) → html` (pas d'I/O), unité testable indépendamment.
   - N'affecte pas `admin.html` (le back-office n'est pas concerné).

2. **Gestion du `<head>` / SEO** (dans le même plugin, cas particulier) —
   - `seo.meta_title` → `<title>` **et** `og:title`.
   - `seo.meta_description` → `<meta name="description">` **et** `og:description`.
   - Données structurées JSON-LD (`schema_type` = `Plumber`, `knows_about`, `address_region`, `address_country`…) injectées / mises à jour dans le `<script type="application/ld+json">`.
   - Pour les valeurs qui vont dans un **attribut** (ex. `content` d'une meta), on utilise une convention dédiée : `data-cms-attr="content:seo.meta_description"` (ou équivalent décidé au moment du plan).

3. **Annotation du HTML** — poser les `data-cms` / `data-cms-attr` sur tous les textes singleton des pages publiques. Travail mécanique mais volumineux ; c'est le gros de l'effort.

4. **Bascule Vercel** — `vercel.json` :
   - `buildCommand: "vite build"` (ou `npm run build`).
   - `outputDirectory: "dist"`.
   - Déclarer sur Vercel les variables d'environnement de build : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### Flux de données

```
supabase (site_content)  --build-->  plugin Vite  --transformIndexHtml-->  dist/*.html (texte cuit)
        (clé anon, RO)                    |
                                    table {section.cle: valeur}
```

Le site publié est du HTML statique avec le vrai texte. À l'exécution, la seule dépendance runtime restante à Supabase est la **galerie** (inchangée, avec son propre fallback).

## Gestion des erreurs

- **Supabase injoignable au build** (fetch en échec global) → le **build échoue** (sortie non nulle). Vercel conserve alors la **dernière version en ligne** ; le site ne casse jamais et l'échec est visible/notifié. Choix assumé plutôt qu'un fallback silencieux qui masquerait le problème.
- **Clé absente** dans `site_content` (ex. `hero.titre` manquant) → on **garde le texte en dur** de la page + un warning au build. Pas de trou dans la page.
- **`data-cms` malformé** (section/clé inexistante, format invalide) → warning + on saute l'élément (texte en dur conservé).

## Tests / Definition of Done

- **Unitaire** : `applyCms(table, html)` — remplace bien le contenu des `[data-cms]` ; conserve le fallback si clé absente ; gère le `<head>`/attributs ; ignore proprement un `data-cms` malformé.
- **Intégration** : `vite build` en local → lire `dist/index.html` et **constater le texte issu de la base dans le HTML brut** (preuve que c'est cuit, pas injecté au runtime).
- **Bout en bout** : déployer d'abord sur une **URL de preview Vercel** (pas directement en prod) → afficher le code source de la page → confirmer que le texte y est présent → puis promouvoir en production.
- **Non-régression** : la galerie #work fonctionne toujours (lecture live + fallback) ; `admin.html` n'est pas altéré par le plugin ; les pages légales se construisent correctement.

## Risques

- **Le plus risqué : la bascule Vercel** (`outputDirectory` de `.` vers `dist`) change la façon dont le site se déploie. Atténuation : tester `vite build` + `vite preview` en local, puis déployer sur une **preview** avant la prod. Entièrement **réversible** (revenir à l'ancien `vercel.json`).
- **Variables d'env manquantes sur Vercel** → build échoue faute de pouvoir joindre Supabase. À vérifier avant la première preview.
- **Décalage étiquettes ↔ clés** : un `data-cms` qui ne correspond à aucune clé seed. Couvert par le warning + fallback, mais à surveiller pendant l'annotation.

## Étapes de livraison suggérées (tranches verticales)

1. Plugin `vite-plugin-cms.mjs` avec le cœur pur `applyCms` + tests unitaires (sans I/O).
2. Fetch Supabase au build + branchement du plugin dans `vite.config.mjs` ; prouver sur **une** section (hero + SEO `<head>`) en local (`vite build` → grep `dist/`).
3. Bascule `vercel.json` + variables d'env ; déploiement **preview** ; vérif source live.
4. Annotation `data-cms` de **tous** les singletons restants (intro, about, nav, footer, sections) ; re-preview ; promotion prod.
