// Éditeur des Réalisations (galerie #work).
import { supabase, publicUrl } from './client.js'
import { toast, esc, compressImage } from './ui.js'

const CATS = ['plomberie', 'chauffage', 'climatisation', 'piscine']
const BUCKET = 'realisations'

export async function mountRealisations(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Réalisations</h1>
      <button class="primary adm-add" data-add>＋ Ajouter</button>
    </div>
    <div class="adm-list" id="rea-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  root.querySelector('[data-add]').onclick = () => openForm(null, () => load(root))
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#rea-list')
  const { data, error } = await supabase.from('realisations').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucune réalisation pour l'instant. Clique « ＋ Ajouter ».</p>`; return }
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
  const img = publicUrl(BUCKET, r.photo_path)
  const altMissing = !r.photo_alt
  return `
  <div class="adm-card ${r.visible ? '' : 'is-hidden'}">
    <div class="adm-card__img">${img ? `<img src="${esc(img)}" alt="">` : '<span>📷</span>'}</div>
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.titre)}</div>
      <div class="adm-card__meta"><span class="adm-tag">${esc(r.categorie)}</span> · ${esc(r.localisation || '')}
        ${altMissing ? '<span class="adm-dot" title="Description de la photo à compléter">●</span>' : ''}</div>
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
  rec = rec || { titre: '', categorie: 'plomberie', localisation: 'Var (83)', description: '', photo_alt: '', photo_path: '' }
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>${isNew ? 'Ajouter un chantier' : 'Modifier le chantier'}</h2>
      <label>Photo
        <div class="adm-photo">
          <img id="f-prev" src="${esc(publicUrl(BUCKET, rec.photo_path))}" alt="" ${rec.photo_path ? '' : 'hidden'}>
          <input type="file" id="f-photo" accept="image/*" capture="environment">
        </div>
      </label>
      <label>Décris la photo en 1 phrase <small>(aide Google / accessibilité)</small>
        <input type="text" id="f-alt" value="${esc(rec.photo_alt)}" placeholder="Ex : douche à l'italienne carrelée, Var">
      </label>
      <label>Titre
        <input type="text" id="f-titre" value="${esc(rec.titre)}" placeholder="Ex : Salle de bain clé en main">
      </label>
      <label>Catégorie
        <select id="f-cat">${CATS.map(c => `<option value="${c}" ${rec.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </label>
      <label>Localisation
        <input type="text" id="f-loc" value="${esc(rec.localisation || 'Var (83)')}">
      </label>
      <label>Description <small>(affichée quand on ouvre le chantier)</small>
        <textarea id="f-desc" rows="4">${esc(rec.description || '')}</textarea>
      </label>
      <div class="adm-modal__actions">
        <button class="ghost" id="f-cancel">Annuler</button>
        <button class="primary" id="f-save">Enregistrer</button>
      </div>
    </div>`
  document.body.appendChild(dlg)

  let newFile = null
  const prev = dlg.querySelector('#f-prev')
  dlg.querySelector('#f-photo').onchange = e => {
    newFile = e.target.files[0] || null
    if (newFile) { prev.src = URL.createObjectURL(newFile); prev.hidden = false }
  }
  dlg.querySelector('#f-cancel').onclick = () => dlg.remove()
  dlg.querySelector('#f-save').onclick = async () => {
    const btn = dlg.querySelector('#f-save')
    const titre = dlg.querySelector('#f-titre').value.trim()
    if (!titre) { toast('Le titre est obligatoire', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      let photo_path = rec.photo_path
      if (newFile) photo_path = await uploadPhoto(newFile)
      const payload = {
        titre,
        categorie: dlg.querySelector('#f-cat').value,
        localisation: dlg.querySelector('#f-loc').value.trim(),
        description: dlg.querySelector('#f-desc').value.trim(),
        photo_alt: dlg.querySelector('#f-alt').value.trim(),
        photo_path,
      }
      let res
      if (isNew) {
        res = await supabase.from('realisations').insert({ ...payload, ordre: (await maxOrdre()) + 1 })
      } else {
        res = await supabase.from('realisations').update(payload).eq('id', rec.id)
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

async function uploadPhoto(file) {
  const blob = await compressImage(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(name, blob, {
    contentType: blob.type || 'image/jpeg', upsert: false,
  })
  if (error) throw error
  return name
}

async function maxOrdre() {
  const { data } = await supabase.from('realisations').select('ordre').order('ordre', { ascending: false }).limit(1)
  return data && data.length ? data[0].ordre : 0
}

async function toggleVis(rec, done) {
  const { error } = await supabase.from('realisations').update({ visible: !rec.visible }).eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  done()
}

async function del(rec, done) {
  if (!confirm(`Supprimer définitivement « ${rec.titre} » ?`)) return
  const { error } = await supabase.from('realisations').delete().eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  if (rec.photo_path && !rec.photo_path.startsWith('assets/')) {
    supabase.storage.from(BUCKET).remove([rec.photo_path])
  }
  toast('Supprimé')
  done()
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('realisations').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('realisations').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
