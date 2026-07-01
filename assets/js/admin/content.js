// Accès aux contenus « singleton » (table site_content : section/cle/valeur jsonb).
import { supabase } from './client.js'

// Charge une section entière → { [cle]: valeur } (valeur = JSON déjà décodé). {} si vide.
export async function loadSection(section) {
  const { data, error } = await supabase
    .from('site_content')
    .select('cle, valeur')
    .eq('section', section)
  if (error || !data) return {}
  return Object.fromEntries(data.map(r => [r.cle, r.valeur]))
}

// Upsert EN LOT de toutes les paires de l'objet values. Renvoie { error } (null si ok).
export async function saveSection(section, values) {
  const rows = Object.entries(values).map(([cle, valeur]) => ({
    section,
    cle,
    valeur,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,cle' })
  return { error }
}
