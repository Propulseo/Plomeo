// Socle des éditeurs « texte » (singletons) du back office.
// Rend un formulaire vertical à partir d'une config et persiste dans site_content.
import { supabase, publicUrl } from './client.js'
import { loadSection, saveSection } from './content.js'
import { toast, esc, compressImage } from './ui.js'

export async function mountSingleton(root, onBack, config) {
  const { title, section, intro, fields = [] } = config

  // Charger les valeurs AVANT de rendre.
  const values = await loadSection(section)

  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>${esc(title)}</h1>
    </div>
    <div class="adm-form">
      ${intro ? `<p class="adm-muted">${esc(intro)}</p>` : ''}
      ${fields.map(f => fieldHTML(f, values[f.cle])).join('')}
      <div><button class="primary" data-save>Enregistrer</button></div>
    </div>`

  root.querySelector('[data-back]').onclick = onBack

  // Aperçu live des champs image + mémorisation du fichier choisi.
  const newFiles = {}
  fields.filter(f => f.type === 'image').forEach(f => {
    const input = root.querySelector(`[data-file="${f.cle}"]`)
    const prev = root.querySelector(`[data-prev="${f.cle}"]`)
    input.onchange = e => {
      const file = e.target.files[0] || null
      newFiles[f.cle] = file
      if (file) { prev.src = URL.createObjectURL(file); prev.hidden = false }
    }
  })

  // Pré-remplissage + boutons de la mini-barre richtext.
  fields.filter(f => f.type === 'richtext').forEach(f => {
    const zone = root.querySelector(`[data-rt="${f.cle}"]`)
    const bar = root.querySelector(`[data-rtbar="${f.cle}"]`)
    // HTML volontaire édité par l'admin lui-même → pas d'esc() (cf. contrat).
    zone.innerHTML = values[f.cle] || ''
    bar.querySelector('[data-cmd="bold"]').onclick = () => { zone.focus(); document.execCommand('bold') }
    bar.querySelector('[data-cmd="italic"]').onclick = () => { zone.focus(); document.execCommand('italic') }
    bar.querySelector('[data-cmd="link"]').onclick = () => {
      zone.focus()
      const u = prompt('Lien ?')
      if (u) document.execCommand('createLink', false, u)
    }
  })

  // Enregistrement.
  root.querySelector('[data-save]').onclick = async () => {
    const btn = root.querySelector('[data-save]')
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      const out = {}
      for (const f of fields) {
        out[f.cle] = await collectValue(root, f, values[f.cle], newFiles[f.cle])
      }
      const { error } = await saveSection(section, out)
      if (error) throw error
      toast('Enregistré ✓')
    } catch (err) {
      toast('Erreur : ' + err.message, 'err')
    } finally {
      btn.disabled = false; btn.textContent = 'Enregistrer'
    }
  }
}

// ── Rendu d'un champ selon son type ─────────────────────────────────────────
function fieldHTML(f, value) {
  const help = f.help ? `<small>${esc(f.help)}</small>` : ''
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''

  let control = ''
  switch (f.type) {
    case 'text':
    case 'tel':
    case 'email':
    case 'url':
      control = `<input type="${f.type}" data-f="${esc(f.cle)}" value="${esc(value ?? '')}"${ph}>`
      break
    case 'number':
      control = `<input type="number" step="any" data-f="${esc(f.cle)}" value="${esc(value ?? '')}"${ph}>`
      break
    case 'textarea':
      control = `<textarea data-f="${esc(f.cle)}"${ph}>${esc(value ?? '')}</textarea>`
      break
    case 'select':
      control = `<select data-f="${esc(f.cle)}">${
        (f.options || []).map(o =>
          `<option value="${esc(o)}"${o === value ? ' selected' : ''}>${esc(o)}</option>`
        ).join('')
      }</select>`
      break
    case 'image': {
      const url = publicUrl(f.bucket || 'site', value)
      control = `
        <img data-prev="${esc(f.cle)}" src="${esc(url)}" alt="" ${value ? '' : 'hidden'}>
        <input type="file" accept="image/*" data-file="${esc(f.cle)}">`
      break
    }
    case 'richtext':
      control = `
        <div class="adm-rt-bar" data-rtbar="${esc(f.cle)}">
          <button type="button" data-cmd="bold">B</button>
          <button type="button" data-cmd="italic"><i>I</i></button>
          <button type="button" data-cmd="link">🔗</button>
        </div>
        <div class="adm-rt" contenteditable="true" data-rt="${esc(f.cle)}"></div>`
      break
    default:
      control = `<input type="text" data-f="${esc(f.cle)}" value="${esc(value ?? '')}"${ph}>`
  }

  return `<label>${esc(f.label)}${help}${control}</label>`
}

// ── Collecte de la valeur d'un champ au moment du save ──────────────────────
async function collectValue(root, f, prevValue, newFile) {
  switch (f.type) {
    case 'number': {
      const raw = root.querySelector(`[data-f="${f.cle}"]`).value
      return raw === '' ? null : Number(raw)
    }
    case 'image': {
      if (newFile) return await uploadImage(newFile, f.bucket || 'site')
      return prevValue ?? ''
    }
    case 'richtext':
      return root.querySelector(`[data-rt="${f.cle}"]`).innerHTML
    default:
      return root.querySelector(`[data-f="${f.cle}"]`).value
  }
}

// Upload image (même motif que realisations.js → uploadPhoto), renvoie le CHEMIN.
async function uploadImage(file, bucket) {
  const blob = await compressImage(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(name, blob, {
    contentType: blob.type || 'image/jpeg', upsert: false,
  })
  if (error) throw error
  return name
}
