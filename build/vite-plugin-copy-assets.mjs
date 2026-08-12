import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import path from 'path'

/**
 * Copie le dossier `assets/` en entier dans `dist/assets/` après le build.
 *
 * Ce site « vanilla » référence beaucoup de fichiers par chemin littéral
 * (`/assets/js/main.js` en script classique, `assets/video/hero.mp4` en
 * data-src, images d'og/JSON-LD…) que Vite ne met PAS dans son graphe et donc
 * ne copie pas. Vite bundle correctement les scripts `type="module"` (dont
 * l'import nu `@supabase/supabase-js`) — on garde ça — et on complète juste
 * avec les assets à chemin littéral. Les noms hashés émis par Vite et les noms
 * d'origine coexistent sans collision.
 *
 * Ces fichiers n'ont PAS d'empreinte dans leur nom, contrairement à ce que Vite
 * émet : leur adresse ne change jamais d'un déploiement à l'autre. Cloudflare
 * les garde donc jusqu'à 4 h (`max-age=14400`) et continue de servir l'ancienne
 * version — vécu le 2026-08-12 : correctif déployé, site inchangé, purge
 * manuelle obligatoire. On ajoute donc `?v=<empreinte du contenu>` à leurs
 * adresses dans le HTML : le HTML, lui, n'est jamais mis en cache (DYNAMIC), et
 * l'adresse change dès que le fichier change. Un fichier inchangé garde son
 * empreinte, donc son cache — c'est le comportement voulu.
 *
 * @param {{ outDir?: string, assetsDir?: string }} [opts]
 */
export function copyAssetsPlugin({ outDir = 'dist', assetsDir = 'assets' } = {}) {
  const empreinte = (contenu) => createHash('sha256').update(contenu).digest('hex').slice(0, 8)

  return {
    name: 'plomeo-copy-assets',
    apply: 'build',

    /* Réécrit `/assets/js/main.js` en `/assets/js/main.js?v=1a2b3c4d` dans le
       HTML. Seuls les fichiers réellement présents sont versionnés : un chemin
       qui ne correspond à rien est laissé tel quel plutôt que masqué. */
    async transformIndexHtml(html) {
      const chemins = [...html.matchAll(/(?:src|href)="(\/assets\/(?:js|css)\/[^"?]+)"/g)]
        .map((m) => m[1])
      const vus = new Map()
      for (const chemin of new Set(chemins)) {
        try {
          const contenu = await fs.readFile(path.resolve('.' + chemin))
          vus.set(chemin, empreinte(contenu))
        } catch { /* fichier absent : on ne touche pas à son adresse */ }
      }
      for (const [chemin, v] of vus) {
        html = html.split(`"${chemin}"`).join(`"${chemin}?v=${v}"`)
      }
      return html
    },

    async closeBundle() {
      const src = path.resolve(assetsDir)
      const dest = path.resolve(outDir, assetsDir)
      await fs.cp(src, dest, { recursive: true, force: true })
    },
  }
}
