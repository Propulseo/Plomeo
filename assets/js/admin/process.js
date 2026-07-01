// Éditeur des Étapes (process) — liste fixe de 3, pas d'ajout ni de suppression.
import { supabase } from './client.js'
import { toast, esc } from './ui.js'

export async function mountProcess(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Étapes (process)</h1>
    </div>
    <div class="adm-list" id="pro-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#pro-list')
  const { data, error } = await supabase.from('process_etapes').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucune étape pour l'instant.</p>`; return }
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
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.titre)}</div>
      <div class="adm-card__meta">${esc(r.numero || '')}</div>
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
      <h2>Modifier l'étape</h2>
      <label>Numéro
        <input type="text" id="f-num" value="${esc(rec.numero || '')}" placeholder="Ex : 1">
      </label>
      <label>Titre
        <input type="text" id="f-titre" value="${esc(rec.titre)}" placeholder="Ex : Prise de contact">
      </label>
      <label>Description
        <textarea id="f-desc" rows="4">${esc(rec.description || '')}</textarea>
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
    const titre = dlg.querySelector('#f-titre').value.trim()
    if (!titre) { toast('Le titre est obligatoire', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      const payload = {
        numero: dlg.querySelector('#f-num').value.trim(),
        titre,
        description: dlg.querySelector('#f-desc').value.trim(),
      }
      const res = await supabase.from('process_etapes').update(payload).eq('id', rec.id)
      if (res.error) throw res.error
      toast('Enregistré ✓')
      dlg.remove(); done()
    } catch (err) {
      toast('Erreur : ' + err.message, 'err')
      btn.disabled = false; btn.textContent = 'Enregistrer'
    }
  }
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('process_etapes').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('process_etapes').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
