// Fonctions PURES de rendu HTML pour les sections « listes » du site.
// Aucune dépendance DOM : testables en Node/vitest. Chaque render* reproduit
// exactement le markup/classes de la section correspondante dans index.html.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
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
      <div class="sb__imgwrap tilt"><picture><img loading="lazy" src="${esc(r.image_path)}" alt="${esc(r.image_alt || '')}"></picture></div>
      <span class="sb__shutter"></span>
      <span class="sb__num">${esc(r.numero)}</span>
    </div>
    <div class="sb__body">
      <div class="sb__ico"><img src="${esc(r.icone_path || '')}" alt=""></div>
      <h3>${esc(r.titre)}</h3>
      <p>${esc(r.description)}</p>
      <ul class="sb__list">${points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <a class="sb__link" href="${esc(r.cta_lien || '#contact')}">${esc(r.cta_texte || 'Demander un devis')}</a>
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
