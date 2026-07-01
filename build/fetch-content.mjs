import { createClient } from '@supabase/supabase-js'

/**
 * Récupère site_content et renvoie une table plate { "section.cle": valeur }.
 * @param {{ url: string, anonKey: string }} cfg
 * @returns {Promise<Record<string,string>>}
 */
export async function fetchContent({ url, anonKey }) {
  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase.from('site_content').select('section, cle, valeur')
  if (error) throw new Error(`fetch site_content: ${error.message}`)
  const table = {}
  for (const row of data ?? []) {
    table[`${row.section}.${row.cle}`] = typeof row.valeur === 'string' ? row.valeur : String(row.valeur)
  }
  return table
}
