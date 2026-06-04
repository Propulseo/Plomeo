# CLAUDE.md — Plomeo

Site vitrine statique (HTML / CSS / JS, build Vite, déploiement Vercel).

## Règles pour les Pull Requests automatiques (retours Pastel via `@claude`)

- **Ne merge JAMAIS la PR toi-même.** Elle doit être validée par un humain.
- **Reste minimal** : ne modifie que ce qui est explicitement demandé.
- **La description de la PR DOIT être en français** et contenir ces 3 sections :

  ```
  ## Retours demandés
  - (liste de chaque retour traité)

  ## Ce que j'ai fait
  - (résumé clair des modifications, en langage simple)

  ## Où
  - fichier:ligne — élément concerné — nature du changement
    (ex: index.html:149 — bouton héro — texte « Voir les réalisations » → « Voir nos chantiers »)
  ```

- Si un retour est **ambigu ou risqué**, ne devine pas : signale-le dans la PR au lieu de l'appliquer.
