// Client Supabase partage par tout le back office.
// Les variables sont PUBLIQUES (anon key) et injectees par Vite depuis .env.local :
//   VITE_SUPABASE_URL=https://qetptoyouhtyzueequdy.supabase.co
//   VITE_SUPABASE_ANON_KEY=...(cle anon / publishable)...
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    "Configuration Supabase manquante. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local."
  )
}

export const configured = Boolean(url && key)

export const supabase = configured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

// URL publique d'un fichier du Storage (bucket public).
export function publicUrl(bucket, path) {
  if (!path) return ''
  // Si on a seede un chemin d'asset local (ex "assets/photos/x.jpg"), on le sert tel quel.
  if (path.startsWith('assets/') || path.startsWith('/') || path.startsWith('http')) return path
  if (!supabase) return ''
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
