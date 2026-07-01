// Éditeur des piliers (Nos expertises) — liste fixe de 4, pas d'ajout/suppression.
import { supabase, publicUrl } from './client.js'
import { toast, esc, compressImage } from './ui.js'

const CATS = ['plomberie', 'chauffage', 'climatisation', 'piscine']
const BUCKET = 'piliers'

export async function mountPiliers(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Nos expertises (piliers)</h1>
    </div>
    <div class="adm-list" id="pil-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#pil-list')
  const { data, error } = await supabase.from('piliers').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucun pilier pour l'instant.</p>`; return }
  list.innerHTML = data.map((r, i) => cardHTML(r, i, data.length)).join('')
  const by = id => data.find(x => x.id === id)
  const reload = () => load(root)
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(by(b.dataset.edit), reload))
  list.querySelectorAll('[data-vis]').forEach(b => b.onclick = () => toggleVis(by(b.dataset.vis), reload))
  list.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(data, b.dataset.up, -1, reload))
  list.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(data, b.dataset.down, 1, reload))
}

function cardHTML(r, i, n) {
  const img = publicUrl(BUCKET, r.image_path)
  return `
  <div class="adm-card ${r.visible ? '' : 'is-hidden'}">
    <div class="adm-card__img">${img ? `<img src="${esc(img)}" alt="">` : '<span>📷</span>'}</div>
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(r.titre)}</div>
      <div class="adm-card__meta"><span class="adm-tag">${esc(r.categorie)}</span></div>
    </div>
    <div class="adm-card__actions">
      <button title="Monter" data-up="${r.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button title="Descendre" data-down="${r.id}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button title="${r.visible ? 'Masquer' : 'Afficher'}" data-vis="${r.id}">${r.visible ? '👁️' : '🚫'}</button>
      <button title="Modifier" data-edit="${r.id}">✏️</button>
    </div>
  </div>`
}

function openForm(rec, done) {
  const points = Array.isArray(rec.points) ? rec.points.slice() : []
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>Modifier le pilier</h2>
      <label>Catégorie
        <select id="f-cat">${CATS.map(c => `<option value="${c}" ${rec.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </label>
      <label>Numéro
        <input type="text" id="f-num" value="${esc(rec.numero || '')}" placeholder="Ex : 01">
      </label>
      <label>Titre
        <input type="text" id="f-titre" value="${esc(rec.titre)}" placeholder="Ex : Plomberie générale">
      </label>
      <label>Description
        <textarea id="f-desc" rows="4">${esc(rec.description || '')}</textarea>
      </label>
      <label>Image
        <div class="adm-photo">
          <img id="f-prev" src="${esc(publicUrl(BUCKET, rec.image_path))}" alt="" ${rec.image_path ? '' : 'hidden'}>
          <input type="file" id="f-img" accept="image/*">
        </div>
      </label>
      <label>Décris la photo en 1 phrase <small>(aide Google / accessibilité)</small>
        <input type="text" id="f-alt" value="${esc(rec.image_alt || '')}" placeholder="Ex : plombier en intervention, Var">
      </label>
      <label>Icône <small>(SVG ou image, conservée telle quelle)</small>
        <input type="file" id="f-icone" accept="image/*,.svg">
      </label>
      <label>Points <small>(liste de puces affichées sous le pilier)</small></label>
      <div id="f-points"></div>
      <button class="ghost" id="f-add-point" type="button">＋ ajouter une puce</button>
      <label>Texte du bouton
        <input type="text" id="f-cta-txt" value="${esc(rec.cta_texte || '')}" placeholder="Ex : En savoir plus">
      </label>
      <label>Lien du bouton
        <input type="text" id="f-cta-lien" value="${esc(rec.cta_lien || '')}" placeholder="Ex : #contact">
      </label>
      <div class="adm-modal__actions">
        <button class="ghost" id="f-cancel">Annuler</button>
        <button class="primary" id="f-save">Enregistrer</button>
      </div>
    </div>`
  document.body.appendChild(dlg)

  const pointsBox = dlg.querySelector('#f-points')
  const addPoint = (val = '') => {
    const row = document.createElement('label')
    row.className = 'adm-photo'
    row.innerHTML = `<span style="display:flex;gap:6px">
      <input type="text" class="f-point" value="${esc(val)}" placeholder="Ex : Dépannage 7j/7" style="flex:1">
      <button class="ghost f-point-del" type="button" title="Retirer">✕</button></span>`
    row.querySelector('.f-point-del').onclick = () => row.remove()
    pointsBox.appendChild(row)
  }
  points.forEach(p => addPoint(p))
  dlg.querySelector('#f-add-point').onclick = () => addPoint('')

  let newImg = null, newIcone = null
  const prev = dlg.querySelector('#f-prev')
  dlg.querySelector('#f-img').onchange = e => {
    newImg = e.target.files[0] || null
    if (newImg) { prev.src = URL.createObjectURL(newImg); prev.hidden = false }
  }
  dlg.querySelector('#f-icone').onchange = e => { newIcone = e.target.files[0] || null }
  dlg.querySelector('#f-cancel').onclick = () => dlg.remove()
  dlg.querySelector('#f-save').onclick = async () => {
    const btn = dlg.querySelector('#f-save')
    const titre = dlg.querySelector('#f-titre').value.trim()
    if (!titre) { toast('Le titre est obligatoire', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      let image_path = rec.image_path
      if (newImg) image_path = await uploadImage(newImg)
      let icone_path = rec.icone_path
      if (newIcone) icone_path = await uploadIcone(newIcone)
      const payload = {
        categorie: dlg.querySelector('#f-cat').value,
        numero: dlg.querySelector('#f-num').value.trim(),
        titre,
        description: dlg.querySelector('#f-desc').value.trim(),
        image_path,
        image_alt: dlg.querySelector('#f-alt').value.trim(),
        icone_path,
        points: [...dlg.querySelectorAll('.f-point')].map(i => i.value.trim()).filter(Boolean),
        cta_texte: dlg.querySelector('#f-cta-txt').value.trim(),
        cta_lien: dlg.querySelector('#f-cta-lien').value.trim(),
      }
      const { error } = await supabase.from('piliers').update(payload).eq('id', rec.id)
      if (error) throw error
      toast('Enregistré ✓')
      dlg.remove(); done()
    } catch (err) {
      toast('Erreur : ' + err.message, 'err')
      btn.disabled = false; btn.textContent = 'Enregistrer'
    }
  }
}

async function uploadImage(file) {
  const blob = await compressImage(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(name, blob, {
    contentType: blob.type || 'image/jpeg', upsert: false,
  })
  if (error) throw error
  return name
}

async function uploadIcone(file) {
  const ext = (file.name.split('.').pop() || 'svg').toLowerCase()
  const name = `icone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
    contentType: file.type || 'image/svg+xml', upsert: false,
  })
  if (error) throw error
  return name
}

async function toggleVis(rec, done) {
  const { error } = await supabase.from('piliers').update({ visible: !rec.visible }).eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  done()
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('piliers').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('piliers').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
