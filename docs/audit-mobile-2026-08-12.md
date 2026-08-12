# Audit mobile — Ploméo (2026-08-12)

Périmètre : `index.html`, `mentions-legales.html`, `confidentialite.html` + tout `assets/css/*.css` et JS associé (`assets/js/main.js`, `assets/js/anim.js`, `assets/js/site/**`). Le back-office `admin/` est exclu.

Audit en lecture seule — aucun fichier n'a été modifié. Les correctifs ci-dessous sont proposés en CSS pur, dans des `@media`, sans toucher au rendu desktop existant.

---

## Bloquant

| Section | Fichier:ligne | Problème | Correctif proposé |
|---|---|---|---|
| Contact | `assets/css/contact.css:15` | `.cfield input,.cfield select,.cfield textarea{font-size:14px}` — sous 16px, Safari iOS zoome automatiquement au focus sur **tous** les champs du formulaire de devis (prénom, nom, email, tél, select, message). C'est le formulaire de conversion principal du site. | `@media(max-width:820px){.cfield input,.cfield select,.cfield textarea{font-size:16px}}` |
| Zone d'intervention | `assets/css/zone.css:46` | `.zone__search-in{font:600 15.5px/1 …}` — même problème de zoom auto iOS sur le champ « Votre commune ? ». | `@media(max-width:820px){.zone__search-in{font-size:16px}}` |
| Zone d'intervention — carte | `assets/css/zone-map.css:119` (`.zm-c__lab{font-size:19px}`) et `:99` (`.zm-badge text{font:700 13px …}`) | Le SVG de la section (`viewBox="-50 270 800 590"`, ~800 unités de large) est rendu à ~330px de large sous 860px (`.zone__grid` passe en 1 colonne, `assets/css/zone.css:43`). Facteur d'échelle ≈0,41 → les libellés de communes (19px) et les badges de délai (13px) s'affichent à **~6-8px effectifs** : illisibles sur un iPhone à 375px de large. C'est la fonctionnalité phare de la section, elle devient décorative sur mobile. | `@media(max-width:600px){.zm-c__lab{font-size:30px}.zm-badge text{font-size:22px}.zm-c:not(.is-hub) .zm-c__lab{display:none}}` — grossit ce qui reste visible et n'affiche le nom en clair que pour Toulon (les 23 communes restent listées en texte juste en dessous, `.zone__communes`). |

---

## Majeur

| Section | Fichier:ligne | Problème | Correctif proposé |
|---|---|---|---|
| Hero | `assets/css/hero.css:32` | `@media(max-width:900px){.hero__map{display:none}}` — la carte de zone (élément visuel principal du hero à droite) disparaît purement et simplement sous 900px, sans aucun remplacement. Le hero mobile perd tout son visuel différenciant. | Remplacer le `display:none` par un repositionnement compact plutôt qu'une suppression : `@media(max-width:900px){.hero__map{display:block;position:static;width:min(70%,280px);margin:20px auto 0;transform:none}}` (à tester avec le rendu SVG réel ; à défaut, prévoir une image statique de repli). |
| Réalisations — filtres | `assets/css/realisations.css:8` | `.wfilter{padding:9px 18px;font-size:13px}` → hauteur réelle ≈ 9×2 + 13×1,6 ≈ **39px**, sous les 44px recommandés. 5 boutons de filtre tactiles. | `@media(max-width:780px){.wfilter{padding:13px 18px;font-size:13px}}` (porte la hauteur à ≈44-45px). |
| Réalisations / Conseils — modales | `assets/css/realisations.css:45` (`.pmodal__close`) et `assets/css/conseils.css:81` (`.amodal__close`) | Croix de fermeture des deux modales à **38×38px**, en dessous de 44×44px, alors que ce sont les seuls moyens de fermer la modale au clavier/tactile hors backdrop. | `@media(max-width:780px){.pmodal__close,.amodal__close{width:44px;height:44px}}` |
| Header | `assets/css/header.css:21` | `.lhead__burger{width:42px;height:42px}` — 2px sous le seuil de 44px, seul déclencheur du menu mobile. | `@media(max-width:820px){.lhead__burger{width:44px;height:44px}}` |
| Contact — formulaire | `index.html:484-490` | Aucun champ n'a d'`autocomplete` (`Prenom`, `Nom`, `Email`, `Telephone`) alors que `type="email"` et `type="tel"` sont bien présents. Sur mobile, l'auto-remplissage du clavier (Safari/Chrome autofill) ne se déclenche pas correctement sans ces attributs — friction supplémentaire sur le tunnel de conversion. | Hors CSS : ajouter `autocomplete="given-name"`, `"family-name"`, `"email"`, `"tel"` sur les 4 champs concernés (ne change rien au rendu desktop ni mobile). |
| Base — pansement global | `assets/css/base.css:15` | `body{overflow-x:hidden}` masque tout débordement horizontal réel sans le diagnostiquer, et cette propriété est connue pour **désactiver `position:sticky`** sur les descendants sous Safari iOS. Aucun `sticky` n'est actuellement utilisé hors `admin.css` (exclu du périmètre), donc le site public n'est pas cassé aujourd'hui — mais le pansement reste en place et bloquera silencieusement tout futur `sticky` (ex. barre de filtres collante en scrollant les réalisations). | Pas un correctif CSS ponctuel : identifier la ou les vraies causes de débordement (candidats probables : `.zm-hero__map`/`.zone__map` avant masquage, `.rea__rev` largeur fixe, `about__wm` positionné en `-2%`) puis retirer `overflow-x:hidden` du `body` une fois la cause traitée. |
| Longueur de page — Piliers | `assets/css/pillars.css:8-9,39` | `@media(max-width:780px){.sb{grid-template-columns:1fr}}` : les 4 piliers (Plomberie/Chauffage/Climatisation/Piscine) s'empilent chacun avec une image plein écran en `aspect-ratio:4/3` + texte + liste + lien. C'est le plus gros contributeur à la longueur du one-page mobile (~600-700px par pilier ⇒ ~2500-2800px cumulés). | Voir section « Compression de hauteur » ci-dessous (carrousel horizontal). |
| Longueur de page — Réalisations | `assets/css/realisations.css:11,25-26,57-58` | `.work__grid` passe en 2 colonnes sous 860px puis 1 colonne sous 540px pour 6 cartes 4:3 — jusqu'à ~1700px cumulés sur petit téléphone. Un variant carrousel horizontal (`.work[data-v="rail"]`, ligne 57-58) **existe déjà dans le CSS** mais n'est pas activé par défaut (`data-v` non posé dans `index.html:301`). | Réutiliser ce variant sous mobile via un `@media`, voir « Compression de hauteur ». |

---

## Mineur

| Section | Fichier:ligne | Problème | Correctif proposé |
|---|---|---|---|
| À propos | `assets/css/about.css:48` | `.about__values` passe à 2 colonnes sous 1100px (`:47`) puis **repasse à 1 colonne** sous 820px — perte d'espace vertical évitable pour 4 blocs très courts (chiffre + titre + phrase). | `@media(max-width:820px){.about__values{grid-template-columns:repeat(2,1fr)}}` (remplace la règle 1 colonne). |
| Footer | `assets/css/footer.css:12` | `.foot__col a{display:block;margin-bottom:9px;font-size:14px}` sans padding : hauteur de zone cliquable réelle ≈22px, sous les recommandations tactiles. | `@media(max-width:780px){.foot__col a{padding:6px 0}}` |
| Piliers | `assets/css/pillars.css:36` | `.sb__link` (lien « Demander un devis » en fin de bloc pilier) est un lien texte inline sans padding — petite zone de frappe en fin de bloc au milieu d'un long flux mobile. | `@media(max-width:780px){.sb__link{padding:10px 0;display:inline-flex}}` |
| Réassurance | `assets/css/reassurance.css:23` | `.rea__rev{width:300px}` — largeur fixe en px dans le marquee défilant. Protégé par le `mask`/`overflow:hidden` du conteneur donc pas de débordement visible, mais rigide sur un écran de 360px (carte quasiment aussi large que l'écran). | `@media(max-width:480px){.rea__rev{width:78vw}}` |
| Global | `index.html:5` | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` sans `viewport-fit=cover`. Sans danger aujourd'hui (le comportement par défaut `contain` exclut déjà la zone d'encoche/home indicator du viewport, donc `.mobilecta` fixe en bas n'est pas recouverte) — mais aucun `env(safe-area-inset-*)` n'est en place si un jour un élément doit aller bord-à-bord. | À bloc préventif, pas urgent : ajouter `viewport-fit=cover` + `padding-bottom:calc(8px + env(safe-area-inset-bottom))` sur `.mobilecta` (`assets/css/header.css:37`) uniquement si un besoin de bord-à-bord apparaît. |
| Zone d'intervention | `assets/js/site/zone-map/index.js:109-114` + `assets/css/zone.css:57,63` | Les puces de communes (`.zone__chip[data-zone]`) affichent `cursor:pointer` et un état hover, mais l'interaction n'est câblée qu'en `mouseenter`/`mouseleave` (pas de `touchstart`) : sur tactile (`hover:none`), l'affordance visuelle ne mène à rien. | `@media(hover:none){.zone__chip[data-zone]{cursor:default}}` (CSS seul possible ; le vrai fix — ajouter un `touchstart` — est hors périmètre CSS). |
| FAQ | `assets/css/faq.css` | Aucun `@media` dans le fichier : le padding des questions/réponses (18-20px) n'est jamais resserré sur très petit écran. Non bloquant car l'accordéon reste fermé par défaut (peu de hauteur cumulée), mais à vérifier visuellement à 360px. | `@media(max-width:480px){.faqitem__q{padding:16px}.faqitem__a p{padding:0 16px 16px}}` |
| Breakpoints | (transverse) | Les seuils existants (900/860/820/780/760/680/640/600/540) couvrent bien le passage desktop→mobile, mais aucun ne retouche spécifiquement la typo/spacing pour les très petits téléphones (iPhone SE 375px, Android compact 360px) au-delà du passage en 1 colonne. | Voir « Compression de hauteur » — traiter en priorité la carte de zone (Bloquant B3) qui est le seul vrai problème de lisibilité à cette taille. |

---

## Compression de hauteur

Le site est un one-page long ; voici les sections qui pèsent le plus sur le défilement mobile, classées par gain estimé :

1. **Piliers (×4)** — le plus gros contributeur (~2500-2800px cumulés). Chaque bloc = image 4:3 pleine largeur + titre + paragraphe + liste de 3 puces + lien, empilés verticalement sous 780px (`pillars.css:39`). **Recommandation** : carrousel horizontal scroll-snap sous mobile, pattern déjà présent ailleurs dans le codebase (`.work[data-v="rail"]`) :
   ```css
   @media(max-width:780px){
     #pilCards{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:16px;padding:0 4vw 8px}
     .sb{grid-template-columns:1fr;flex:0 0 88%;scroll-snap-align:start}
   }
   ```

2. **Réalisations (×6)** — jusqu'à ~1700px cumulés en 1 colonne sous 540px. Le variant carrousel existe déjà en CSS (`realisations.css:57-58`, `data-v="rail"`), il suffit de le répliquer sous un breakpoint mobile sans toucher au `data-v` HTML (qui reste `grid` sur desktop) :
   ```css
   @media(max-width:540px){
     .work__grid{display:flex;grid-template-columns:none;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px}
     .proj{flex:0 0 78%;scroll-snap-align:start}
   }
   ```

3. **About — 4 chiffres clés** — gain rapide et sans risque en gardant 2 colonnes au lieu d'1 sous 820px (voir Mineur ci-dessus).

4. **Conseils (×3)** — déjà compact (`data-v="index"`, image masquée sous 680px, `conseils.css:66`). Rien à changer.

5. **FAQ** — déjà en accordéon fermé par défaut. Rien à changer sur la hauteur, seulement du padding fin (voir Mineur).

6. **Communes (×23 puces)** — volontairement toutes visibles en permanence (commentaire explicite dans `zone.css:54-55` : contenu de réassurance + SEO local). Ne pas replier par défaut ; à ne reconsidérer que si un test réel sur iPhone montre une gêne (ex. repli « voir les 23 communes » après les 8 premières).

7. **Carte de zone (SVG)** — alléger les libellés (cf. Bloquant B3) réduit à la fois l'illisibilité **et** le bruit visuel perçu, sans réduire la hauteur du bloc lui-même.

---

## Lots proposés

**Lot 1 — Zoom iOS (Bloquant, un commit ciblé)**
`contact.css`, `zone.css` : passer `.cfield input/select/textarea` et `.zone__search-in` à `font-size:16px` sous mobile. Zéro risque visuel desktop.

**Lot 2 — Carte de zone lisible sur mobile**
`zone-map.css`, `zone.css` : agrandir `.zm-c__lab`/`.zm-badge text` sous 600px, masquer les libellés non-hub, neutraliser le `cursor:pointer` des puces sous `hover:none`.

**Lot 3 — Cibles tactiles ≥44px**
`realisations.css` (`.wfilter`, `.pmodal__close`), `conseils.css` (`.amodal__close`), `header.css` (`.lhead__burger`), `footer.css` (`.foot__col a`), `pillars.css` (`.sb__link`).

**Lot 4 — Compression Piliers + Réalisations en carrousel mobile**
`pillars.css` (`#pilCards` en scroll-snap), `realisations.css` (`.work__grid` en scroll-snap sous 540px), `about.css` (`.about__values` reste 2 colonnes sous 820px).

**Lot 5 — Hero mobile**
`hero.css` : remplacer le `display:none` de `.hero__map` par un repositionnement/redimensionnement compact plutôt qu'une suppression pure.

**Lot 6 — Formulaire contact + safe-area préventif**
`index.html` (attributs `autocomplete` sur les 4 champs), `header.css` (`.mobilecta` + `viewport-fit=cover` en préventif, non urgent).
