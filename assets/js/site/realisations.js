// Branche la galerie #work du site sur Supabase.
// Remplace les <article> en dur par les réalisations de la base (rendu identique).
// Si la base est injoignable, on garde le HTML en dur comme secours.
import { supabase, publicUrl, configured } from '../admin/client.js'
import { esc } from '../admin/ui.js'

const LABEL = { plomberie: 'Plomberie', chauffage: 'Chauffage', climatisation: 'Climatisation', piscine: 'Piscine' }

async function render() {
  const grid = document.getElementById('wgrid')
  if (!grid || !configured || !supabase) return
  const { data, error } = await supabase
    .from('realisations').select('*').order('ordre', { ascending: true })
  if (error || !data || !data.length) return // on garde le secours en dur

  grid.innerHTML = data.map(tile).join('')
  bindModal(grid, data)
  reapplyActiveFilter()
}

function tile(r) {
  const img = publicUrl('realisations', r.photo_path)
  const tag = LABEL[r.categorie] || r.categorie
  return `<article class="proj tilt" data-m="${esc(r.categorie)}" data-id="${esc(r.id)}">
    <picture><img loading="lazy" src="${esc(img)}" alt="${esc(r.photo_alt || '')}"></picture>
    <div class="proj__ov"><span class="proj__tag">${esc(tag)}</span><h3>${esc(r.titre)}</h3><span class="proj__loc">${esc(r.localisation || '')}</span></div>
  </article>`
}

function bindModal(grid, data) {
  const pm = document.getElementById('pmodal')
  if (!pm) return
  const byId = Object.fromEntries(data.map(r => [String(r.id), r]))
  grid.querySelectorAll('.proj').forEach(p => p.addEventListener('click', () => {
    const r = byId[p.dataset.id]; if (!r) return
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    const pmImg = document.getElementById('pmImg'); if (pmImg) pmImg.src = publicUrl('realisations', r.photo_path)
    pm.dataset.m = r.categorie
    set('pmTag', LABEL[r.categorie] || r.categorie)
    set('pmTitle', r.titre)
    set('pmLoc', r.localisation || '')
    set('pmDesc', r.description || '')
    pm.classList.add('open')
  }))
}

function reapplyActiveFilter() {
  const active = document.querySelector('.wfilter.active')
  const f = active ? active.dataset.f : 'all'
  document.querySelectorAll('.proj').forEach(p =>
    p.classList.toggle('hide', f !== 'all' && p.dataset.m !== f))
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render)
else render()
