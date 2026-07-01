import { promises as fs } from 'fs'
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
 * @param {{ outDir?: string, assetsDir?: string }} [opts]
 */
export function copyAssetsPlugin({ outDir = 'dist', assetsDir = 'assets' } = {}) {
  return {
    name: 'plomeo-copy-assets',
    apply: 'build',
    async closeBundle() {
      const src = path.resolve(assetsDir)
      const dest = path.resolve(outDir, assetsDir)
      await fs.cp(src, dest, { recursive: true, force: true })
    },
  }
}
