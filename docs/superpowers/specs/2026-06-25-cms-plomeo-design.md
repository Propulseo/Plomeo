# Spec — Mini-CMS / Back office Plomeo

_Validé le 2026-06-25. Audit complet : `tasks/w4tjdxx62.output` (296 éléments éditables, 9 zones)._

## Objectif
Donner à Ayoub (le fondateur) un **back office `/admin`** où il édite **tout** le contenu du site
en autonomie, depuis son téléphone, sans toucher au code.

## Décisions d'architecture
- **Stack** : Supabase (base + Storage + Auth) + site Vite vanilla, déploiement Vercel.
- **Anti-pause** : site **« cuit au build »** (le public ne lit jamais Supabase en direct → SEO + immunisé)
  **+ keep-alive** (ping hebdo pour qu'Ayoub puisse toujours éditer). Cf. discussion 2026-06-25.
- **Gestion** : via Supabase CLI (PAS le MCP — le MCP pointe sur la prod CoProFlex, NE PAS l'utiliser).
  Projet Plomeo : ref `qetptoyouhtyzueequdy`. Secrets dans `.env.local` (gitignoré).
- **Sécurité** : RLS — lecture publique (anon), écriture réservée à `authenticated` (compte d'Ayoub).

## Modèle de contenu
**Singletons** → 1 table clé/valeur `site_content` (`section`, `cle`, `valeur` jsonb) :
SEO/Meta · Identité & Coordonnées (tél/email/insta — source unique, propagée partout) · Intro ·
Navigation & boutons · Hero · Réassurance · À propos (Ayoub) · En-têtes de sections ·
Contact & formulaire · Footer · Page Mentions légales · Page Confidentialité.

**Repeatables** → 1 table par type :
`realisations` (déjà créée, étendue) · `avis` · `piliers` (4, taille fixe) · `process_etapes` (3, fixe) ·
`communes` · `articles` (blog) · `faq` · `villes_carte` (6, fixe).

**Images** → Supabase Storage (buckets publics : `realisations`, `piliers`, `articles`, `site`).
On stocke le **chemin**, jamais le binaire. Valeurs actuelles seedées par défaut.

## UX admin (mobile-first)
Tuiles dans l'ordre du site. Singleton = formulaire vertical (label en clair, mini-barre gras/italique/lien
pour le richtext). Repeatable = cartes empilées (✏️ modifier · 👁️ masquer · ↕️ réordonner · ➕ ajouter).
Photo = bouton « Changer la photo » (appareil/galerie) + aperçu + « Décris la photo en 1 phrase » (alt).
**Garde-fous** : ancres de menu en lecture seule ; listes fixes (piliers/process/villes) = modifier+réordonner
seulement ; SEO technique caché derrière une tuile « Avancé ».

## 12 corrections de l'agent critique (à intégrer)
1. Messages du formulaire (succès/erreur) + le **tél en dur** dans le message d'erreur → centraliser (Identité).
2. Libellé transitoire bouton « Envoi… ».
3. Liens footer « Mentions légales · Confidentialité ».
4. Bouton filtre « Tous ».
5. Seed descriptions modale réalisations : 6 lignes pour 4 textes pmDescs → dupliquer le texte plomberie ×3.
6. Schema JSON-LD : `address` (region/country).
7. Schema `knowsAbout` (4 métiers).
8. Schema `@type` Plumber + `og:type` → figés, décidés explicitement (onglet Avancé).
9. Icônes SVG des pastilles intro (cohérence avec piliers).
10. Attribut `name=` des champs du formulaire (intitulé dans l'email reçu) → lié au label.
11. Pages légales : libellé marque + libellés retour (haut/bas distincts).
12. Hero mobile : pas de poster/fallback → champ image de repli.

## Plan de construction (tranches)
1. **Base** : tables (site_content + repeatables) + extension realisations + buckets + seed. ← _en cours_
2. **Coquille `/admin`** : connexion (Supabase Auth) + tableau de tuiles.
3. **Éditeurs bloc par bloc** : Réalisations → Avis → About → Hero → Sections → Contact → FAQ → Blog → Piliers/Process → Footer → SEO/Légal.
4. **Branchement site** : lecture du contenu cuit au build + compte Ayoub + keep-alive.
5. Retirer le labo `lab-inject.js` / `index-lab.html` (devenu inutile).

## Notes
- DB password exposé en clair (diff éditeur) → **régénérer** en fin de mise en place, MAJ `.env.local`.
- Données de seed (descriptions modale, articles de blog) : `assets/js/main.js` (pmDescs L63-68, articlesData L85-108).
