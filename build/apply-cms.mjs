import * as cheerio from 'cheerio'
import sanitizeHtml from 'sanitize-html'
import { isSafeUrl } from '../assets/js/site/render.mjs'

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

  // POLITIQUE DES REPÈRES : on CONSERVE data-cms / data-cms-attr / data-cms-html dans
  // la sortie pour que la couche « lecture live » (assets/js/site/cms-singletons.js)
  // puisse réécrire ces champs sans redéploiement. On RETIRE en revanche
  // data-cms-html-rich (pages légales) et data-cms-json (<head>) : eux restent cuits.

  $('[data-cms]').each((_, el) => {
    const key = $(el).attr('data-cms')
    const val = table[key]
    if (val === undefined) { warnings.push(`clé manquante: ${key}`); return }
    $(el).text(val)
  })

  $('[data-cms-attr]').each((_, el) => {
    const spec = $(el).attr('data-cms-attr') || ''
    for (const pair of spec.split(',')) {
      const [attr, key] = pair.split(':').map((s) => s.trim())
      if (!attr || !key) continue
      const val = table[key]
      if (val === undefined) { warnings.push(`clé manquante (attr): ${key}`); continue }
      if ((attr === 'href' || attr === 'src') && !isSafeUrl(val)) {
        warnings.push(`URL bloquée (${attr}): ${key}`); continue
      }
      $(el).attr(attr, val)
    }
  })

  const STRICT_ALLOWED = ['em', 'strong', 'b', 'i', 'br', 'a', 'span']
  const RICH_ALLOWED = ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'em', 'strong', 'b', 'i', 'br', 'a', 'span']
  const HTML_ALLOWED_ATTRIBUTES = { a: ['href', 'target', 'rel'], span: ['class'] }

  injectHtml($, '[data-cms-html]', table, warnings, STRICT_ALLOWED, true) // live → repère conservé
  injectHtml($, '[data-cms-html-rich]', table, warnings, RICH_ALLOWED, false) // cuit (légal) → repère retiré

  $('script[data-cms-json]').each((_, el) => {
    const spec = $(el).attr('data-cms-json') || ''
    let json
    try { json = JSON.parse($(el).text()) } catch { warnings.push('JSON-LD illisible'); return }
    for (const pair of spec.split(',')) {
      const [field, key] = pair.split(':').map((s) => s.trim())
      if (!field || !key) continue
      const val = table[key]
      if (val === undefined) { warnings.push(`clé manquante (json): ${key}`); continue }
      json[field] = val
    }
    const safe = JSON.stringify(json, null, 2).replace(/</g, '\\u003c')
    $(el).text(safe)
    $(el).removeAttr('data-cms-json')
  })

  return { html: $.html(), warnings }

  /**
   * Assainit et injecte le HTML des éléments correspondant au sélecteur, en
   * utilisant la liste blanche de balises fournie. Pure : ne fait que muter $.
   * @param {cheerio.CheerioAPI} $
   * @param {string} selector
   * @param {Record<string,string>} tbl
   * @param {string[]} warn
   * @param {string[]} allowedTags
   */
  function injectHtml($, selector, tbl, warn, allowedTags, preserveMarker) {
    const attrName = selector.slice(1, -1)
    $(selector).each((_, el) => {
      const key = $(el).attr(attrName)
      const val = tbl[key]
      if (val === undefined) { warn.push(`clé manquante (html): ${key}`); return }
      $(el).html(sanitizeHtml(val, {
        allowedTags,
        allowedAttributes: HTML_ALLOWED_ATTRIBUTES,
      }))
      if (!preserveMarker) $(el).removeAttr(attrName)
    })
  }
}
