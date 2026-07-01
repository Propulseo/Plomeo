// Monte les sections « listes » du site sur Supabase (lecture live).
// Patron repris de assets/js/site/realisations.js : fetch -> remplace le HTML
// en dur -> fallback (return tot) si la base est injoignable/vide.
import { supabase, configured } from '../admin/client.js'
import { renderCommunes, renderPiliers, renderProcess } from './render.mjs'

// Monte une liste : fetch la table, filtre/trie, remplace le HTML en dur.
// hasVisible=true ajoute .eq('visible', true) (tables avec cette colonne uniquement).
export async function mountList({ table, selector, hasVisible, render }) {
  const container = document.querySelector(selector)
  if (!container || !configured || !supabase) return
  let query = supabase.from(table).select('*')
  if (hasVisible) query = query.eq('visible', true)
  const { data, error } = await query.order('ordre', { ascending: true })
  if (error || !data || !data.length) return // fallback : HTML en dur conserve
  container.innerHTML = render(data)
}

async function mountAll() {
  await mountList({ table: 'communes', selector: '.zone__communes', hasVisible: false, render: renderCommunes })
  await mountList({ table: 'piliers', selector: '#pilCards', hasVisible: true, render: renderPiliers })
  await mountList({ table: 'process_etapes', selector: '.process__grid', hasVisible: false, render: renderProcess })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll)
else mountAll()
