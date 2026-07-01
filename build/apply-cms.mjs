import * as cheerio from 'cheerio'
import sanitizeHtml from 'sanitize-html'

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
    $(el).text(val)
    $(el).removeAttr('data-cms')
  })

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

  $('[data-cms-html]').each((_, el) => {
    const key = $(el).attr('data-cms-html')
    const val = table[key]
    if (val === undefined) { warnings.push(`clé manquante (html): ${key}`); return }
    $(el).html(sanitizeHtml(val, {
      allowedTags: ['em', 'strong', 'b', 'i', 'br', 'a', 'span'],
      allowedAttributes: { a: ['href', 'target', 'rel'], span: ['class'] },
    }))
    $(el).removeAttr('data-cms-html')
  })

  return { html: $.html(), warnings }
}
