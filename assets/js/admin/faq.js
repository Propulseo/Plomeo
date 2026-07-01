// Éditeur des Questions / FAQ.
import { supabase } from './client.js'
import { toast, esc } from './ui.js'

export async function mountFaq(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Questions / FAQ</h1>
      <button class="primary adm-add" data-add>＋ Ajouter</button>
    </div>
    <div class="adm-list" id="faq-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  root.querySelector('[data-add]').onclick = () => openForm(null, () => load(root))
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#faq-list')
  const { data, error } = await supabase.from('faq').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucune question pour l'instant. Clique « ＋ Ajouter ».</p>`; return }
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
  const extrait = (r.reponse || '').slice(0, 90)
  return `
  <div class="adm-card ${r.visible ? '' : 'is-hidden'}">
    <div class="adm-card__img"><span>❓</span></div>
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.question)}</div>
      <div class="adm-card__meta">${esc(extrait)}${(r.reponse || '').length > 90 ? '…' : ''}</div>
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
  rec = rec || { question: '', reponse: '' }
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>${isNew ? 'Ajouter une question' : 'Modifier la question'}</h2>
      <label>Question
        <input type="text" id="f-question" value="${esc(rec.question)}" placeholder="Ex : Intervenez-vous en urgence ?">
      </label>
      <label>Réponse
        <textarea id="f-reponse" rows="5">${esc(rec.reponse || '')}</textarea>
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
    const question = dlg.querySelector('#f-question').value.trim()
    const reponse = dlg.querySelector('#f-reponse').value.trim()
    if (!question) { toast('La question est obligatoire', 'err'); return }
    if (!reponse) { toast('La réponse est obligatoire', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      const payload = { question, reponse }
      let res
      if (isNew) {
        res = await supabase.from('faq').insert({ ...payload, ordre: (await maxOrdre()) + 1 })
      } else {
        res = await supabase.from('faq').update(payload).eq('id', rec.id)
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
  const { data } = await supabase.from('faq').select('ordre').order('ordre', { ascending: false }).limit(1)
  return data && data.length ? data[0].ordre : 0
}

async function toggleVis(rec, done) {
  const { error } = await supabase.from('faq').update({ visible: !rec.visible }).eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  done()
}

async function del(rec, done) {
  if (!confirm(`Supprimer définitivement « ${rec.question} » ?`)) return
  const { error } = await supabase.from('faq').delete().eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  toast('Supprimé')
  done()
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('faq').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('faq').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
