// Fonctions PURES de rendu HTML pour les sections « listes » du site.
// Aucune dépendance DOM : testables en Node/vitest. Chaque render* reproduit
// exactement le markup/classes de la section correspondante dans index.html.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Valide le schéma d'une URL destinée à un attribut href (défense en profondeur :
// esc() échappe le HTML mais n'empêche pas un schéma actif type javascript:).
export function safeHref(u, fallback = '#contact') {
  if (!u) return fallback
  const s = String(u).trim()
  // relatif / ancre / chemin autorisés
  if (/^(#|\/|\.\/|\.\.\/)/.test(s)) return s
  // schémas explicitement autorisés
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s
  return fallback
}

// Dérive le chemin de la variante WebP d'une image par convention (remplace
// l'extension). Reste pur : pas de résolution d'URL publique ici (voir client.js).
function webpPath(imagePath) {
  const s = String(imagePath ?? '')
  return s.replace(/\.[a-zA-Z0-9]+$/, '.webp')
}

// Section « ZONE D'INTERVENTION » — index.html .zone__communes (table communes, pas de colonne visible).
export function renderCommunes(rows) {
  return rows.map(r => (
    `<span class="zone__chip" data-reveal="up">${esc(r.nom)}</span>`
  )).join('')
}

// Section « PILLARS » — index.html .sb (table piliers, colonne visible).
// Reproduit chaque <article class="sb" data-m="..."> ; le bloc .pil__head reste en dur (hors CMS).
export function renderPiliers(rows) {
  return rows.map((r, i) => {
    const points = Array.isArray(r.points) ? r.points : []
    return `<article class="sb" data-m="${esc(r.categorie)}">
    <div class="sb__media">
      <div class="sb__imgwrap tilt"><picture><source type="image/webp" srcset="${esc(webpPath(r.image_path))}"><img loading="lazy" src="${esc(r.image_path)}" alt="${esc(r.image_alt || '')}"></picture></div>
      <span class="sb__shutter"></span>
      <span class="sb__num">${esc(r.numero)}</span>
    </div>
    <div class="sb__body">
      <div class="sb__ico"><img src="${esc(r.icone_path || '')}" alt=""></div>
      <h3>${esc(r.titre)}</h3>
      <p>${esc(r.description)}</p>
      <ul class="sb__list">${points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <a class="sb__link" href="${esc(safeHref(r.cta_lien))}">${esc(r.cta_texte || 'Demander un devis')}</a>
    </div>
  </article>`
  }).join('')
}

// Section « PROCESS » — index.html .pstep (table process_etapes, PAS de colonne visible).
export function renderProcess(rows) {
  return rows.map(r => (
    `<div class="pstep" data-reveal="up"><div class="pstep__n">${esc(r.numero)}</div><h3>${esc(r.titre)}</h3><p>${esc(r.description)}</p></div>`
  )).join('')
}

// Section « FAQ » — index.html .faqitem (table faq, colonne visible).
export function renderFaq(rows) {
  return rows.map(r => (
    `<div class="faqitem" data-reveal="up"><button class="faqitem__q">${esc(r.question)}</button><div class="faqitem__a"><p>${esc(r.reponse)}</p></div></div>`
  )).join('')
}

// Section « CONSEILS » — index.html .bitem (table articles, colonne visible).
// resolveImg : fonction fournie par l'appelant (publicUrl de admin/client.js) pour
// garder ce module sans dependance DOM/Supabase, donc testable en Node pur.
// lien passe par safeHref (defense en profondeur contre un schema javascript:).
export function renderArticles(rows, resolveImg) {
  return rows.map(r => {
    const img = resolveImg(r.image_path)
    return `<a href="${esc(safeHref(r.lien, '#blog'))}" class="bitem" data-m="${esc(r.categorie)}">
      <div class="bitem__img"><picture><source type="image/webp" srcset="${esc(webpPath(r.image_path))}"><img loading="lazy" src="${esc(img)}" alt="${esc(r.image_alt || '')}"></picture></div>
      <span class="bitem__n">${esc(r.numero)}</span>
      <div class="bitem__body">
        <span class="bitem__cat">${esc(r.categorie)}</span>
        <h3>${esc(r.titre)}</h3>
        <p>${esc(r.extrait)}</p>
        <span class="bitem__meta">${esc(r.meta_lecture)}</span>
      </div>
      <span class="bitem__arrow">↗</span>
    </a>`
  }).join('')
}
