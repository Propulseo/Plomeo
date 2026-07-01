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
