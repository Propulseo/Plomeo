// Éditeur des Avis clients (témoignages).
import { supabase } from './client.js'
import { toast, esc } from './ui.js'

export async function mountAvis(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Avis clients</h1>
      <button class="primary adm-add" data-add>＋ Ajouter</button>
    </div>
    <div class="adm-list" id="avi-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  root.querySelector('[data-add]').onclick = () => openForm(null, () => load(root))
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#avi-list')
  const { data, error } = await supabase.from('avis').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucun avis pour l'instant. Clique « ＋ Ajouter ».</p>`; return }
  list.innerHTML = data.map((r, i) => cardHTML(r, i, data.length)).join('')
  const by = id => data.find(x => x.id === id)
  const reload = () => load(root)
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(by(b.dataset.edit), reload))
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => del(by(b.dataset.del), reload))
  list.querySelectorAll('[data-vis]').forEach(b => b.onclick = () => toggleVis(by(b.dataset.vis), reload))
  list.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(data, b.dataset.up, -1, reload))
  list.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(data, b.dataset.down, 1, reload))
}

function cardHTML(r, i, n) {
  const extrait = (r.texte || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  return `
  <div class="adm-card ${r.visible ? '' : 'is-hidden'}">
    <div class="adm-card__img"><span>⭐</span></div>
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.auteur)}</div>
      <div class="adm-card__meta">${esc(extrait)}${(r.texte || '').length > 80 ? '…' : ''}</div>
    </div>
    <div class="adm-card__actions">
      <button title="Monter" data-up="${r.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button title="Descendre" data-down="${r.id}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button title="${r.visible ? 'Masquer' : 'Afficher'}" data-vis="${r.id}">${r.visible ? '👁️' : '🚫'}</button>
      <button title="Modifier" data-edit="${r.id}">✏️</button>
      <button class="danger" title="Supprimer" data-del="${r.id}">🗑️</button>
    </div>
  </div>`
}

function openForm(rec, done) {
  const isNew = !rec
  rec = rec || { texte: '', auteur: '' }
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>${isNew ? 'Ajouter un avis' : 'Modifier l\'avis'}</h2>
      <label>Avis
        <textarea id="f-texte" rows="4" placeholder="Ex : Travail rapide et soigné, je recommande !">${esc(rec.texte)}</textarea>
      </label>
      <label>Auteur
        <input type="text" id="f-auteur" value="${esc(rec.auteur)}" placeholder="Ex : Marie D., Toulon">
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
    const texte = dlg.querySelector('#f-texte').value.trim()
    const auteur = dlg.querySelector('#f-auteur').value.trim()
    if (!texte) { toast('L\'avis est obligatoire', 'err'); return }
    if (!auteur) { toast('L\'auteur est obligatoire', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      const payload = { texte, auteur }
      let res
      if (isNew) {
        res = await supabase.from('avis').insert({ ...payload, ordre: (await maxOrdre()) + 1 })
      } else {
        res = await supabase.from('avis').update(payload).eq('id', rec.id)
      }
      if (res.error) throw res.error
      toast('Enregistré ✓')
      dlg.remove(); done()
    } catch (err) {
      toast('Erreur : ' + err.message, 'err')
      btn.disabled = false; btn.textContent = 'Enregistrer'
    }
  }
}

async function maxOrdre() {
  const { data } = await supabase.from('avis').select('ordre').order('ordre', { ascending: false }).limit(1)
  return data && data.length ? data[0].ordre : 0
}

async function toggleVis(rec, done) {
  const { error } = await supabase.from('avis').update({ visible: !rec.visible }).eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  done()
}

async function del(rec, done) {
  if (!confirm(`Supprimer définitivement l'avis de « ${rec.auteur} » ?`)) return
  const { error } = await supabase.from('avis').delete().eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  toast('Supprimé')
  done()
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('avis').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('avis').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
