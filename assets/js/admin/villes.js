// Éditeur des Villes de la carte SVG (positions point/label).
import { supabase } from './client.js'
import { toast, esc } from './ui.js'

const STYLES = ['main', 'ping', 'simple']
const ANCHORS = ['start', 'middle', 'end']

export async function mountVilles(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Villes (carte SVG)</h1>
    </div>
    <div class="adm-list" id="vil-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#vil-list')
  const { data, error } = await supabase.from('villes_carte').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucune ville pour l'instant.</p>`; return }
  list.innerHTML = data.map((r, i) => cardHTML(r, i, data.length)).join('')
  const by = id => data.find(x => x.id === id)
  const reload = () => load(root)
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(by(b.dataset.edit), reload))
  list.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(data, b.dataset.up, -1, reload))
  list.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(data, b.dataset.down, 1, reload))
}

function cardHTML(r, i, n) {
  return `
  <div class="adm-card">
    <div class="adm-card__img"><span>📍</span></div>
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.nom)}</div>
      <div class="adm-card__meta"><span class="adm-tag">${esc(r.style_point)}</span></div>
    </div>
    <div class="adm-card__actions">
      <button title="Monter" data-up="${r.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button title="Descendre" data-down="${r.id}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button title="Modifier" data-edit="${r.id}">✏️</button>
    </div>
  </div>`
}

function openForm(rec, done) {
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>Modifier « ${esc(rec.nom)} »</h2>
      <label>Nom de la ville
        <input type="text" id="f-nom" value="${esc(rec.nom)}">
      </label>
      <label>Style du point
        <select id="f-style">${STYLES.map(s => `<option value="${s}" ${rec.style_point === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </label>
      <label>Ancrage du texte
        <select id="f-anchor">${ANCHORS.map(a => `<option value="${a}" ${rec.text_anchor === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
      </label>
      <label>Position X du label <small>(coordonnée SVG sur la carte)</small>
        <input type="number" step="any" id="f-lx" value="${esc(rec.svg_label_x)}">
      </label>
      <label>Position Y du label <small>(coordonnée SVG sur la carte)</small>
        <input type="number" step="any" id="f-ly" value="${esc(rec.svg_label_y)}">
      </label>
      <label>Position X du point <small>(coordonnée SVG sur la carte)</small>
        <input type="number" step="any" id="f-cx" value="${esc(rec.svg_dot_cx)}">
      </label>
      <label>Position Y du point <small>(coordonnée SVG sur la carte)</small>
        <input type="number" step="any" id="f-cy" value="${esc(rec.svg_dot_cy)}">
      </label>
      <div class="adm-modal__actions">
        <button class="ghost" id="f-cancel">Annuler</button>
        <button class="primary" id="f-save">Enregistrer</button>
      </div>
    </div>`
  document.body.appendChild(dlg)

  dlg.querySelector('#f-cancel').onclick = () => dlg.remove()
  dlg.querySelector('#f-save').onclick = async () => {
    const btn = dlg.querySelector('#f-save')
    const nom = dlg.querySelector('#f-nom').value.trim()
    if (!nom) { toast('Le nom est obligatoire', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      const payload = {
        nom,
        style_point: dlg.querySelector('#f-style').value,
        text_anchor: dlg.querySelector('#f-anchor').value,
        svg_label_x: num(dlg.querySelector('#f-lx').value),
        svg_label_y: num(dlg.querySelector('#f-ly').value),
        svg_dot_cx: num(dlg.querySelector('#f-cx').value),
        svg_dot_cy: num(dlg.querySelector('#f-cy').value),
      }
      const res = await supabase.from('villes_carte').update(payload).eq('id', rec.id)
      if (res.error) throw res.error
      toast('Enregistré ✓')
      dlg.remove(); done()
    } catch (err) {
      toast('Erreur : ' + err.message, 'err')
      btn.disabled = false; btn.textContent = 'Enregistrer'
    }
  }
}

// Champ number vide → null (les colonnes numeric refusent la chaîne vide).
function num(v) {
  return v.trim() === '' ? null : Number(v)
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('villes_carte').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('villes_carte').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
