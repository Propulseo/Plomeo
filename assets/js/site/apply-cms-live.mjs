// Cœur PUR de la couche « lecture live » des singletons (voir cms-singletons.js).
// Aucune dépendance DOM/Supabase → testable en Node/vitest, comme render.mjs.
import { isSafeUrl } from './render.mjs'

/**
 * Aplati les lignes site_content en table { "section.cle": valeur }.
 * Reproduit build/fetch-content.mjs pour que la version live corresponde à la
 * version cuite au build.
 * @param {Array<{section:string, cle:string, valeur:unknown}>|null|undefined} rows
 * @returns {Record<string,string>}
 */
export function buildTable(rows) {
  const table = {}
  for (const row of rows ?? []) {
    table[`${row.section}.${row.cle}`] = typeof row.valeur === 'string' ? row.valeur : String(row.valeur)
  }
  return table
}

/**
 * Valeur sûre à poser sur un attribut, ou null s'il faut laisser l'attribut cuit
 * en place. Pour href/src on exige un schéma de la liste blanche (isSafeUrl) —
 * ALLOWLIST robuste, contrairement à un simple deny de "javascript:" que le
 * navigateur contourne via des caractères de contrôle (ex. "java\tscript:").
 * Même politique que build/apply-cms.mjs (source unique : render.mjs).
 * @param {string} attr
 * @param {string} val
 * @returns {string|null}
 */
export function safeCmsAttrValue(attr, val) {
  if ((attr === 'href' || attr === 'src') && !isSafeUrl(val)) return null
  return val
}
