// Construction de la carte : silhouette du Var, points de communes, légende.
// Chaque commune est une cible de survol à part entière.

import { ZONES, VAR_PATH, proj, HUB, PX_PER_KM, LABELS, HERO_LABELS, zoneById } from './zones.js'
import { el } from './dom.js'

/* Cadrages. Le hero reprend le format de la carte d'origine (1.186) et doit contenir
   le cercle 45 min en entier, sinon son étiquette se dessine hors cadre et remonte
   sur le header. La section du bas est en paysage, recadrée sur l'aire réelle. */
export const VIEW_HERO = '-80 165 860 725'
export const VIEW_ZONE = '-50 270 800 590'

const H = proj(HUB.lon, HUB.lat)
export const CX = H.x
export const CY = H.y
export const R = Object.fromEntries(ZONES.map((z) => [z.id, z.km * PX_PER_KM]))
export const RMAX = R[ZONES[ZONES.length - 1].id]

export function baseMap(uid, communes, { view, dense = false }) {
  const clip = `${uid}-land`
  /* aria-hidden : la carte est une aide visuelle, la même information est donnée
     en texte juste à côté (paliers, liste des communes, champ de recherche).
     Sans ça, ses 23 communes s'inséraient dans l'ordre de tabulation AVANT les
     boutons du hero — 43 arrêts au clavier avant « Demander un devis ». */
  const svg = el('svg', {
    viewBox: view, class: `zm${dense ? ' zm--dense' : ''}`, 'aria-hidden': 'true',
  })
  const defs = el('defs', {}, [el('clipPath', { id: clip }, [el('path', { d: VAR_PATH })])])
  const zones = el('g', { class: 'zm-zones', 'clip-path': `url(#${clip})` })
  const over = el('g', { class: 'zm-over' })
  const hits = el('g', { class: 'zm-hits' })

  svg.append(defs, el('path', { class: 'zm-land', d: VAR_PATH }), zones)
  svg.append(el('path', { class: 'zm-coast', d: VAR_PATH, pathLength: '1' }))
  ;[...ZONES].reverse().forEach((z) =>
    hits.append(el('circle', { class: 'zm-hit', 'data-zone': z.id, cx: CX, cy: CY, r: R[z.id] })))
  svg.append(over, hits, pins(communes, dense)) // les communes captent avant les paliers

  return { svg, zones, over, defs, clip }
}

function pins(communes, dense) {
  const g = el('g', { class: 'zm-pins' })
  const xy = communes.map((c) => proj(c.lon, c.lat))
  let ping = 0
  communes.forEach((c, i) => {
    const { x, y } = xy[i]
    /* Rayon de la cible borné par la moitié de la distance au voisin le plus
       proche : sinon Solliès-Pont recouvrait Solliès-Ville, et La Moutonne
       La Crau — deux communes devenaient impossibles à survoler. */
    const voisin = Math.min(...xy.map((p, j) => (j === i ? Infinity : Math.hypot(p.x - x, p.y - y))))
    const rHit = Math.max(7, Math.min(dense ? 17 : 15, voisin / 2))
    const cfg = LABELS[c.n] || { dx: c.lon >= HUB.lon ? 15 : -15, dy: 6, anchor: c.lon >= HUB.lon ? 'start' : 'end' }
    const named = LABELS[c.n] && (dense || HERO_LABELS.includes(c.n))
    const node = el('g', {
      class: `zm-c${c.hub ? ' is-hub' : ''}${named ? ' is-named' : ''}`,
      'data-zone': c.z, 'data-n': c.n, 'data-km': c.d.toFixed(1),
    })
    // Ping orange décalé dans le temps : sinon les villes clignotent ensemble.
    if (c.major) node.append(el('circle', { class: 'zm-ping', cx: x, cy: y, r: c.hub ? 8 : 6, style: `--i:${ping++}` }))
    node.append(
      el('circle', { class: 'zm-c__ring', cx: x, cy: y, r: c.hub ? 13 : 11 }),
      el('circle', { class: 'zm-c__dot', cx: x, cy: y, r: c.hub ? 7.5 : c.major ? 5.5 : 4 }),
      el('text', { class: 'zm-c__lab', x: x + cfg.dx, y: y + cfg.dy, 'text-anchor': cfg.anchor, text: cfg.short || c.n }),
      el('circle', { class: 'zm-c__hit', cx: x, cy: y, r: rHit }),
    )
    g.append(node)
  })
  return g
}

/* ---------- Légende (une ligne) ---------- */
export function ringLegend(onFocus, onBlur) {
  const row = el('div', { class: 'zm-legend' })
  ZONES.forEach((z) => {
    const b = el('button', { type: 'button', class: 'zm-legend__i', 'data-zone': z.id }, [
      el('i', { class: 'zm-legend__sw' }), el('b', { text: z.temps }), el('span', { text: z.nom }),
    ])
    b.addEventListener('mouseenter', () => onFocus?.(z.id))
    b.addEventListener('focus', () => onFocus?.(z.id))
    b.addEventListener('mouseleave', () => onBlur?.())
    b.addEventListener('blur', () => onBlur?.())
    row.appendChild(b)
  })
  return row
}

/* Appel à l'action sur SA propre ligne : au repos de la ligne d'info, il fallait
   traverser la légende pour l'atteindre, ce qui le faisait disparaître sous le curseur. */
export function ctaLink(label, href) {
  return el('a', { class: 'zm-cta', href }, [
    el('span', { text: label }),
    el('i', { class: 'zm-cta__arrow', 'aria-hidden': 'true', text: '↓' }),
  ])
}

/* ---------- Ligne d'info à hauteur réservée (vide au repos) ---------- */
export function caption(nbParZone) {
  const node = el('p', { class: 'zm-cap', 'aria-live': 'polite' })
  const reset = () => { node.className = 'zm-cap'; node.replaceChildren() }
  const show = (id) => {
    const z = zoneById(id)
    if (!z) return reset()
    node.className = 'zm-cap is-on'
    node.dataset.zone = z.id
    /* Nom + nombre seulement : le descriptif complet vit dans les paliers de la
       section. Ici il débordait la ligne réservée et se faisait tronquer. */
    node.replaceChildren(
      el('b', { text: z.nom }), el('em', { text: z.temps }),
      el('span', { text: `${nbParZone[z.id] || 0} communes desservies` }),
    )
  }
  const showCommune = (c) => {
    const z = zoneById(c.z)
    node.className = 'zm-cap is-on is-commune'
    node.dataset.zone = z.id
    node.replaceChildren(
      el('b', { text: c.n }), el('em', { text: z.temps }),
      el('span', { text: c.hub ? 'Notre point de départ' : `${z.nom} — à ${c.d.toFixed(1).replace('.', ',')} km de Toulon` }),
    )
  }
  reset()
  return { node, show, showCommune, reset }
}

/**
 * Un seul état pour tout : palier survolé (`data-active`) ou commune (`data-focus`).
 * `is-focus` est posé en classe et pas via :hover, pour que la mise en avant puisse
 * aussi venir d'une puce de commune ou du champ de recherche.
 */
export function wireHover(root, svg, communes, ...sinks) {
  const call = (fn, arg) => sinks.forEach((s) => s[fn]?.(arg))
  const groups = [...svg.querySelectorAll('.zm-c')]
  const mark = (n) => groups.forEach((g) => g.classList.toggle('is-focus', !!n && g.dataset.n === n))

  const zone = (id) => {
    mark(null)
    root.removeAttribute('data-focus')
    if (id) root.setAttribute('data-active', id); else root.removeAttribute('data-active')
    id ? call('show', id) : call('reset')
  }
  const clear = () => { mark(null); root.removeAttribute('data-active'); root.removeAttribute('data-focus'); call('reset') }
  const commune = (c) => {
    if (!c) return clear()
    root.setAttribute('data-active', c.z)
    root.setAttribute('data-focus', c.n)
    mark(c.n)
    call('showCommune', c)
  }

  svg.querySelectorAll('.zm-hit').forEach((h) => {
    h.addEventListener('mouseenter', () => zone(h.dataset.zone))
    h.addEventListener('touchstart', () => zone(h.dataset.zone), { passive: true })
  })
  groups.forEach((g) => {
    const c = communes.find((x) => x.n === g.dataset.n)
    g.addEventListener('mouseenter', () => commune(c))
    g.addEventListener('touchstart', () => commune(c), { passive: true })
    // Sans ce mouseleave, sortir d'une commune par un bord que ne couvre aucun
    // cercle de palier laissait la surbrillance figée sur elle.
    g.addEventListener('mouseleave', clear)
  })
  svg.addEventListener('mouseleave', clear)
  return { zone, commune, clear }
}
