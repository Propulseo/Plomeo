# Branchement des sections « listes » en lecture live

_Spec — 2026-07-01. Fait suite au chantier « singletons cuit au build » (mergé). Ici on branche les sections répétables sur Supabase en **lecture live** (modèle de la galerie réalisations)._

## Contexte

Le site Plomeo est un site vanilla (HTML/CSS/JS) déployé sur Coolify (build Docker : `vite build` → nginx). Après le chantier singletons :
- Les **textes fixes** (`site_content`) sont cuits au build.
- La **galerie réalisations** est branchée en **lecture live** : `assets/js/site/realisations.js` (module) va chercher la table `realisations` dans Supabase au chargement, remplace le HTML en dur, avec **fallback** sur le HTML en dur si la base est injoignable. Il réutilise `supabase`, `publicUrl`, `configured` exportés par `assets/js/admin/client.js`.

**Écart constaté** : l'admin a 17 éditeurs, mais côté site seuls les singletons et la galerie sont branchés. Les 7 tables répétables restantes ont un éditeur admin mais **ne s'affichent pas** depuis la base (le site les sert en dur) :
- Avec données : `piliers` (4), `process_etapes` (3), `villes_carte` (6).
- Vides : `avis` (0), `faq` (0), `articles` (0), `communes` (0).

## Objectif

Brancher **6** sections répétables sur la base en **lecture live** (même modèle que la galerie), et **retirer** l'éditeur de la carte SVG (ingérable pour un non-technicien, change rarement → reste en dur).

## Périmètre

**Dans cette spec :**
- 6 modules site : `piliers`, `process`, `faq`, `articles`, `avis`, `communes`.
- Seed des 4 tables vides (`faq`, `articles`, `avis`, `communes`) depuis le contenu déjà en dur du site.
- Retrait de l'éditeur `villes` de l'admin (`assets/js/admin/villes.js` + son enregistrement dans `assets/js/admin/app.js`).

**Hors périmètre :**
- Le branchement / l'édition de la **carte SVG** (`villes_carte`) : reste en dur sur le site, éditeur retiré.
- Une page **article détaillée** rendant `corps_html` (et son assainissement) : on n'affiche que les cartes (titre/extrait/image/lien).
- Le passage de ces listes en « cuit au build » (choix assumé : lecture live, comme la galerie).

## Architecture

### Patron commun (repris de `realisations.js`)

Chaque section = un module `assets/js/site/<section>.js`, chargé via `<script type="module">` dans `index.html`, qui :
1. importe `supabase, publicUrl, configured` de `../admin/client.js` ;
2. si non configuré / pas de conteneur → ne fait rien (garde le HTML en dur) ;
3. `select('*')` sur sa table, filtré/trié : `.eq('visible', true)` quand la colonne existe, `.order('ordre', { ascending: true })` ;
4. si `error` ou 0 ligne → **return** (fallback : on garde le HTML en dur) ;
5. sinon `container.innerHTML = rows.map(templateLigne).join('')` puis ré-applique les comportements JS de la section si besoin (accordéon FAQ, marquee avis…).

Les valeurs texte sont échappées (`esc` de `assets/js/admin/ui.js`, déjà utilisé par la galerie).

### Les 6 unités

| Module | Table | Conteneur (index.html) | Colonnes clés | Rendu |
|---|---|---|---|---|
| `piliers.js` | `piliers` | section `#pil` | categorie, numero, titre, description, image_path, points[], cta_* | cartes prestations |
| `process.js` | `process_etapes` | section `#process` | numero, titre, description | étapes numérotées |
| `faq.js` | `faq` | `.faq__list` | question, reponse | items accordéon |
| `articles.js` | `articles` | section `#blog` | categorie, titre, extrait, meta_lecture, image_path, image_alt, lien | cartes conseils (lien sortant) |
| `avis.js` | `avis` | `#reaTrack` | texte, auteur | pistes du marquee |
| `communes.js` | `communes` | `.zone__communes` | nom | puces `.zone__chip` |

Chaque template reproduit **exactement** la structure HTML/classes existante de la section (pour garder le style et les animations). Le module doit produire le même markup que celui en dur, données en plus.

**`avis.js`** : le marquee `#reaTrack` est aujourd'hui rempli par `assets/js/main.js` (données en dur dans `main.js`). Le module remplace cette source par la table `avis` ; prévoir que `main.js` n'écrase pas ensuite le contenu (ordonnancement / garde).

### Seed des tables vides

4 migrations (ou une seule) `supabase/migrations/…_seed_<table>.sql` insérant le contenu **actuellement en dur** du site pour `faq`, `articles`, `avis`, `communes`. But : l'admin cesse d'être vide et le site affiche la même chose qu'avant, mais depuis la base. Respecter les colonnes du schéma (cf. `20260625150000_cms_schema.sql`), `ordre` croissant, `visible = true`.

### Retrait de l'éditeur villes

- Supprimer `assets/js/admin/villes.js`.
- Retirer son entrée du routage admin dans `assets/js/admin/app.js` (`TILES` + `EDITORS`).
- La table `villes_carte` et son seed restent (inoffensifs) ; la carte SVG reste en dur dans `index.html`.

## Gestion des erreurs

- **Base injoignable / non configurée / 0 ligne** → chaque module fait `return` tôt : le HTML en dur reste affiché (aucune section vide, aucune régression). Identique au comportement de la galerie.
- **Colonne `visible`/`ordre`** : n'appliquer `.eq('visible', true)` que sur les tables qui l'ont (toutes sauf `communes`/`process_etapes` n'ont pas `visible` — vérifier le schéma par table).
- **Ligne partielle** (champ null) : le template gère les valeurs manquantes (chaîne vide), pas de « undefined » affiché.

## Tests / Definition of Done

- **Par module** : avec données en base → la section affiche les lignes de la base (ordre respecté, `visible=false` masqué) ; base coupée → fallback HTML en dur intact.
- **Seed** : après migration, les 4 tables ont les lignes correspondant au contenu d'origine ; le site rend visuellement comme avant (mais depuis la base).
- **Admin** : l'éditeur « villes » a disparu ; éditer une ligne (ex. une FAQ) → visible sur le site après rechargement (lecture live).
- **Non-régression** : sections intactes si Supabase down ; galerie et singletons toujours OK ; build Docker + déploiement Coolify inchangés (ces modules sont bundlés par vite comme `realisations.js`).

## Risques

- **`avis.js` vs `main.js`** : double source du marquee. Risque de conflit d'ordre d'exécution → à gérer explicitement (le module fait autorité, `main.js` ne re-remplit pas).
- **Fidélité des templates** : un markup légèrement différent casserait le style/anim. Atténuation : recopier la structure exacte de l'existant, vérifier visuellement section par section.
- **Volume** : 6 modules + 4 seeds. Uniforme mais répétitif → livrer section par section (tranche verticale), vérifier chacune avant la suivante.

## Étapes de livraison suggérées (tranches verticales)

1. Retrait éditeur villes (petit, isolé) → vérifier l'admin.
2. `communes.js` (le plus simple : puces) — patron de référence pour les suivants.
3. `piliers.js`, `process.js` (données déjà en base, pas de seed).
4. `faq.js` + seed faq.
5. `articles.js` + seed articles.
6. `avis.js` + seed avis (+ neutraliser le remplissage en dur de `main.js`).
