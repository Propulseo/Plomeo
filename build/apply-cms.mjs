import * as cheerio from 'cheerio'

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
  })

  return { html: $.html(), warnings }
}
