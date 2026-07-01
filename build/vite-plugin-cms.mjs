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
        if (isBuild && Object.keys(table).length === 0) throw new Error('table site_content vide — anomalie, build interrompu')
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
        const fname = (ctx.filename || ctx.path || '').replace(/\\/g, '/')
        if (fname.endsWith('admin.html')) return html
        const { html: out, warnings } = applyCms(html, table)
        for (const w of warnings) console.warn(`[cms] ${ctx.path}: ${w}`)
        return out
      },
    },
  }
}
