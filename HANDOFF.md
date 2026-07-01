# HANDOFF — reprise session (mini-CMS Plomeo)

_Snapshot 2026-07-01. Écrit dans un fichier **versionné** (pas `.planning/`, qui est gitignoré) pour survivre au changement de PC._

## État
- Branche `main`, tout poussé sur GitHub (dernier commit de la session : `caebfba`).
- **Back office `/admin` complet** : socle (`content.js` + `singleton.js`) + **17 éditeurs** (réalisations, piliers, process, avis, faq, articles, communes, villes, hero, nav, intro, about, contact, sections, footer, legal, seo).
- Base Supabase (projet `qetptoyouhtyzueequdy`) : schéma CMS + tous les seeds appliqués (réalisations, piliers, process, villes, **contenus site_content**).
- Vérifié via Playwright : lecture/rendu OK. Build `vite` OK.

## ⚙️ Setup sur le NOUVEAU PC (obligatoire)
1. `git clone` puis `npm install`.
2. **Recréer `.env.local`** à la racine (gitignoré = absent de GitHub — copie-le de l'ancien PC, ou depuis le dashboard Supabase → Settings → API + Database) :
   ```
   SUPABASE_DB_PASSWORD=...            # Settings → Database (ou "Reset")
   VITE_SUPABASE_URL=https://qetptoyouhtyzueequdy.supabase.co
   VITE_SUPABASE_ANON_KEY=...          # Settings → API → clé "anon"
   ```
3. `npm run dev` → http://localhost:5173/ (+ `/admin`). Compte admin : `admin@plomeo.fr`.

## 🔴 PRIORITÉ #1 — Corriger la faille de sécurité RLS (avant tout le reste)
**Problème** (confirmé, `enable_signup = true`) : les policies d'écriture autorisent **tout utilisateur `authenticated`**, et les inscriptions sont ouvertes → n'importe qui peut s'inscrire via la clé anon publique et **modifier/supprimer tout le contenu + le storage**.

**Correctif à faire (nouvelle migration, ne pas réécrire l'historique) :**
1. Table `admins(user_id uuid primary key)`.
2. Auto-seed d'Ayoub par email : `insert into admins(user_id) select id from auth.users where email='admin@plomeo.fr' on conflict do nothing;`
3. **Garde-fou anti-lockout** : `do $$ begin if not exists (select 1 from admins) then raise exception 'aucun admin — abandon'; end if; end $$;` AVANT de toucher aux policies (rollback si l'email ne matche pas → pas de verrouillage accidentel).
4. Réécrire **toutes** les policies d'écriture (site_content + repeatables + `storage.objects` insert/update/delete) en `using (exists (select 1 from admins where user_id = auth.uid())) with check (…même…)`.
5. **Dashboard Supabase** (action manuelle) : Authentication → couper « Allow new signups » (ceinture + bretelles) + mettre `enable_signup = false` dans `config.toml`.
6. Faire **relire le SQL par un sous-agent backend/RLS** avant `db push` (enjeu prod).

**2ᵉ alerte (MEDIUM, defense-in-depth)** : durcir `publicUrl()` (ne plus laisser passer une URL `http` arbitraire) et assainir `corps_html` (DOMPurify) — surtout quand on branchera le blog.

## Reste à faire (après la sécu)
- **Branchement du site public** sur `site_content` (aujourd'hui le site sert encore le texte « en dur » ; éditer dans l'admin ne change pas encore le site en ligne). Stratégie « cuit au build » + keep-alive.
- Tester une **écriture** en étant connecté (compte Ayoub) — seul le read a été vérifié (anon).
- Retirer `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` (inutilisée dans le code).
- 7 alertes **Dependabot** sur le dépôt (2 hautes, 5 modérées) à regarder.
- Nettoyer le labo (`index-lab.html`, `lab-inject.js` — gitignorés) et `Doc Plomeo v2/` (799 Mo, hors dépôt : pas sauvegardé sur GitHub, prévoir Drive/LFS si besoin).

## Gotchas
- **NE PAS utiliser le MCP Supabase** = il pointe sur la prod CoProFlex. Tout passe par la **CLI**.
- Appliquer une migration : `export SUPABASE_DB_PASSWORD="$(sed -n 's/^SUPABASE_DB_PASSWORD=//p' .env.local)"; printf 'y\n' | npx supabase db push`
- Patron éditeur « liste » : `assets/js/admin/realisations.js`. Patron « texte » : `assets/js/admin/singleton.js` (config-driven) + `content.js`. Coquille/routage : `assets/js/admin/app.js` (`TILES` + `EDITORS`).
- Spec complète : `docs/superpowers/specs/2026-06-25-cms-plomeo-design.md`.
