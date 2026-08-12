// Éditeur des Communes desservies.
import { supabase } from './client.js'
import { toast, esc } from './ui.js'

export async function mountCommunes(root, onBack) {
  root.innerHTML = `
    <div class="adm-head">
      <button class="adm-back" data-back>← Retour</button>
      <h1>Communes desservies</h1>
      <button class="primary adm-add" data-add>＋ Ajouter</button>
    </div>
    <div class="adm-list" id="com-list"><p class="adm-muted">Chargement…</p></div>`
  root.querySelector('[data-back]').onclick = onBack
  root.querySelector('[data-add]').onclick = () => openForm(null, () => load(root))
  await load(root)
}

async function load(root) {
  const list = root.querySelector('#com-list')
  const { data, error } = await supabase.from('communes').select('*').order('ordre', { ascending: true })
  if (error) { list.innerHTML = `<p class="adm-error">Erreur : ${esc(error.message)}</p>`; return }
  if (!data.length) { list.innerHTML = `<p class="adm-muted">Aucune commune pour l'instant. Clique « ＋ Ajouter ».</p>`; return }
  list.innerHTML = data.map((c, i) => cardHTML(c, i, data.length)).join('')
  const by = id => data.find(x => x.id === id)
  const reload = () => load(root)
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(by(b.dataset.edit), reload))
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => del(by(b.dataset.del), reload))
  list.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(data, b.dataset.up, -1, reload))
  list.querySelectorAll('[data-down]').forEach(b => b.onclick = () => move(data, b.dataset.down, 1, reload))
}

function cardHTML(c, i, n) {
  // Sans coordonnées la commune apparaît en pastille mais reste absente de la
  // carte : on le signale, sinon l'oubli est invisible.
  const situee = c.lat != null && c.lon != null
  return `
  <div class="adm-card">
    <div class="adm-card__body">
      <div class="adm-card__title">${esc(c.nom)}</div>
      <div class="adm-card__meta">${situee
        ? `📍 ${Number(c.lat).toFixed(4)}, ${Number(c.lon).toFixed(4)}`
        : '<span class="adm-warn">⚠️ Sans coordonnées — n\'apparaîtra pas sur la carte</span>'}</div>
    </div>
    <div class="adm-card__actions">
      <button title="Monter" data-up="${c.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button title="Descendre" data-down="${c.id}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button title="Modifier" data-edit="${c.id}">✏️</button>
      <button class="danger" title="Supprimer" data-del="${c.id}">🗑️</button>
    </div>
  </div>`
}

// Les colonnes lat/lon sont numériques en base, mais on ne réinjecte jamais une
// valeur brute dans du HTML : on la repasse par Number, comme esc() pour le texte.
const num = (v) => (v == null || Number.isNaN(Number(v)) ? '' : Number(v))

// '' -> null (champ laissé vide, autorisé) ; valeur illisible -> false (refus).
// Champs en type="text" et pas type="number" : ce dernier renvoie une chaîne VIDE
// pour toute saisie qu'il juge invalide (« 43,1258 », un couple collé, du texte).
// Le garde-fou ne voyait donc jamais l'erreur et enregistrait un NULL silencieux.
const parse = (v) => {
  const t = String(v).trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : false
}

// « 43.1258, 5.9304 » collé depuis Google Maps -> [43.1258, 5.9304], sinon null.
// C'est exactement ce que l'aide du formulaire invite à faire.
const parseCouple = (v) => {
  const m = String(v).trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)$/)
  if (!m) return null
  const a = Number(m[1].replace(',', '.'))
  const b = Number(m[2].replace(',', '.'))
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null
}

function openForm(rec, done) {
  const isNew = !rec
  rec = rec || { nom: '', lat: null, lon: null }
  const dlg = document.createElement('div')
  dlg.className = 'adm-modal'
  dlg.innerHTML = `
    <div class="adm-modal__box">
      <h2>${isNew ? 'Ajouter une commune' : 'Modifier la commune'}</h2>
      <label>Nom de la commune
        <input type="text" id="f-nom" value="${esc(rec.nom)}" placeholder="Ex : Toulon">
      </label>
      <div class="adm-grid2">
        <label>Latitude
          <input type="text" inputmode="decimal" id="f-lat" value="${num(rec.lat)}" placeholder="43.1258">
        </label>
        <label>Longitude
          <input type="text" inputmode="decimal" id="f-lon" value="${num(rec.lon)}" placeholder="5.9304">
        </label>
      </div>
      <p class="adm-help">
        Les coordonnées placent la commune sur la carte du site, et son délai
        d'intervention est calculé automatiquement d'après sa distance à Toulon.
        Pour les obtenir : clic droit sur la commune dans Google Maps → le premier
        élément du menu donne <em>latitude, longitude</em> dans cet ordre.
        Laisser vide affiche la commune en pastille, mais pas sur la carte.
      </p>
      <div class="adm-modal__actions">
        <button class="ghost" id="f-cancel">Annuler</button>
        <button class="primary" id="f-save">Enregistrer</button>
      </div>
    </div>`
  document.body.appendChild(dlg)

  dlg.querySelector('#f-cancel').onclick = () => dlg.remove()

  // Coller le couple de Google Maps dans « Latitude » remplit les deux champs.
  dlg.querySelector('#f-lat').addEventListener('input', (e) => {
    const couple = parseCouple(e.target.value)
    if (!couple) return
    e.target.value = couple[0]
    dlg.querySelector('#f-lon').value = couple[1]
  })

  dlg.querySelector('#f-save').onclick = async () => {
    const btn = dlg.querySelector('#f-save')
    const nom = dlg.querySelector('#f-nom').value.trim()
    if (!nom) { toast('Le nom est obligatoire', 'err'); return }
    const lat = parse(dlg.querySelector('#f-lat').value)
    const lon = parse(dlg.querySelector('#f-lon').value)
    if (lat === false || lon === false) { toast('Coordonnées illisibles — attendu par ex. 43.1258', 'err'); return }
    if ((lat === null) !== (lon === null)) { toast('Renseignez les deux coordonnées, ou aucune', 'err'); return }
    // Garde-fou : une inversion latitude/longitude est l'erreur classique, et elle
    // enverrait la commune à l'autre bout de la carte sans message d'erreur.
    if (lat !== null && (lat < 41 || lat > 46)) { toast('Latitude hors de France métropolitaine — champs inversés ?', 'err'); return }
    if (lon !== null && (lon < -6 || lon > 10)) { toast('Longitude hors de France métropolitaine — champs inversés ?', 'err'); return }
    btn.disabled = true; btn.textContent = 'Enregistrement…'
    try {
      const payload = { nom, lat, lon }
      let res
      if (isNew) {
        res = await supabase.from('communes').insert({ ...payload, ordre: (await maxOrdre()) + 1 })
      } else {
        res = await supabase.from('communes').update(payload).eq('id', rec.id)
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
  const { data } = await supabase.from('communes').select('ordre').order('ordre', { ascending: false }).limit(1)
  return data && data.length ? data[0].ordre : 0
}

async function del(rec, done) {
  if (!confirm(`Supprimer définitivement « ${rec.nom} » ?`)) return
  const { error } = await supabase.from('communes').delete().eq('id', rec.id)
  if (error) return toast('Erreur : ' + error.message, 'err')
  toast('Supprimé')
  done()
}

async function move(data, id, dir, done) {
  const i = data.findIndex(x => x.id === id)
  const j = i + dir
  if (j < 0 || j >= data.length) return
  const a = data[i], b = data[j]
  await supabase.from('communes').update({ ordre: b.ordre }).eq('id', a.id)
  await supabase.from('communes').update({ ordre: a.ordre }).eq('id', b.id)
  done()
}
