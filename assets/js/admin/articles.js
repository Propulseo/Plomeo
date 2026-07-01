// Éditeur des Articles / conseils (blog).
import { supabase, publicUrl } from './client.js'
import { toast, esc, compressImage } from './ui.js'

const BUCKET = 'articles'

export async function mountArticles(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Articles / conseils</h1>
      <button class="primary adm-add" data-add>＋ Ajouter</button>
    </div>
    <div class="adm-list" id="art-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  root.querySelector('[data-add]').onclick = () => openForm(null, () => load(root))
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#art-list')
  const { data, error } = await supabase.from('articles').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucun article pour l'instant. Clique « ＋ Ajouter ».</p>`; return }
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
  const img = publicUrl(BUCKET, r.image_path)
  const altMissing = !r.image_alt
  return `
  <div class="adm-card ${r.visible ? '' : 'is-hidden'}">
    <div class="adm-card__img">${img ? `<img src="${esc(img)}" alt="">` : '<span>📝</span>'}</div>
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.titre)}</div>
      <div class="adm-card__meta"><span class="adm-tag">${esc(r.categorie || '')}</span> · ${esc(r.meta_lecture || '')}
        ${altMissing ? '<span class="adm-dot" title="Description de l\'image à compléter">●</span>' : ''}</div>
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
  rec = rec || { categorie: '', numero: '', titre: '', extrait: '', meta_lecture: '', image_path: '', image_alt: '', corps_html: '', lien: '' }
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>${isNew ? 'Ajouter un article' : 'Modifier l\'article'}</h2>
      <label>Catégorie
        <input type="text" id="f-cat" value="${esc(rec.categorie || '')}" placeholder="Ex : Plomberie">
      </label>
      <label>Numéro
        <input type="text" id="f-num" value="${esc(rec.numero || '')}" placeholder="Ex : 01">
      </label>
      <label>Titre
        <input type="text" id="f-titre" value="${esc(rec.titre)}" placeholder="Ex : 5 gestes pour éviter une fuite">
      </label>
      <label>Extrait <small>(résumé court affiché dans la liste)</small>
        <textarea id="f-extrait" rows="3">${esc(rec.extrait || '')}</textarea>
      </label>
      <label>Temps de lecture
        <input type="text" id="f-meta" value="${esc(rec.meta_lecture || '')}" placeholder="Ex : 5 min">
      </label>
      <label>Image
        <div class="adm-photo">
          <img id="f-prev" src="${esc(publicUrl(BUCKET, rec.image_path))}" alt="" ${rec.image_path ? '' : 'hidden'}>
          <input type="file" id="f-photo" accept="image/*" capture="environment">
        </div>
      </label>
      <label>Décris l'image en 1 phrase <small>(aide Google / accessibilité)</small>
        <input type="text" id="f-alt" value="${esc(rec.image_alt || '')}" placeholder="Ex : robinet qui goutte sous un évier">
      </label>
      <label>Corps de l'article <small>(HTML brut)</small>
        <textarea id="f-corps" rows="8">${esc(rec.corps_html || '')}</textarea>
      </label>
      <label>Lien <small>(URL de l'article complet)</small>
        <input type="text" id="f-lien" value="${esc(rec.lien || '')}" placeholder="Ex : /conseils/eviter-une-fuite">
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
      let image_path = rec.image_path
      if (newFile) image_path = await uploadPhoto(newFile)
      const payload = {
        categorie: dlg.querySelector('#f-cat').value.trim(),
        numero: dlg.querySelector('#f-num').value.trim(),
        titre,
        extrait: dlg.querySelector('#f-extrait').value.trim(),
        meta_lecture: dlg.querySelector('#f-meta').value.trim(),
        image_alt: dlg.querySelector('#f-alt').value.trim(),
        corps_html: dlg.querySelector('#f-corps').value,
        lien: dlg.querySelector('#f-lien').value.trim(),
        image_path,
      }
      let res
      if (isNew) {
        res = await supabase.from('articles').insert({ ...payload, ordre: (await maxOrdre()) + 1 })
      } else {
        res = await supabase.from('articles').update(payload).eq('id', rec.id)
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
  const { data } = await supabase.from('articles').select('ordre').order('ordre', { ascending: false }).limit(1)
  return data && data.length ? data[0].ordre : 0
}

async function toggleVis(rec, done) {
  const { error } = await supabase.from('articles').update({ visible: !rec.visible }).eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  done()
}

async function del(rec, done) {
  if (!confirm(`Supprimer définitivement « ${rec.titre} » ?`)) return
  const { error } = await supabase.from('articles').delete().eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  if (rec.image_path && !rec.image_path.startsWith('assets/')) {
    supabase.storage.from(BUCKET).remove([rec.image_path])
  }
  toast('Supprimé')
  done()
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('articles').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('articles').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
