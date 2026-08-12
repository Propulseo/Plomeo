// Rendu des zones : un dégradé radial depuis Toulon, sans frontière tracée.
// Plus c'est lumineux, plus on intervient vite.

import { ZONES } from './zones.js'
import { el } from './dom.js'
import { CX, CY, R, RMAX } from './map.js'

const t = (id) => (R[id] / RMAX).toFixed(4)
const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]
}

/* La rampe passe par un ambré avant le bleu clair. Un dégradé orange → bleu
   direct traverse un brun violacé en sRGB : c'est ce qui salissait l'image. */
const RAMPE = [
  ['0', '#FF5A1E', 0.55],
  [t('r1'), '#FF7A2E', 0.4],
  [((Number(t('r1')) + Number(t('r2'))) / 2).toFixed(4), '#FFA53D', 0.28],
  [t('r2'), '#C9D5C6', 0.2],
  ['0.8', '#A5E2EA', 0.1],
  ['1', '#A5E2EA', 0],
]

export function paint({ svg, defs, zones, over, uid, dense }) {
  const gid = `${uid}-fade`
  const fid = `${uid}-soft`
  const grad = el('radialGradient', { id: gid, gradientUnits: 'userSpaceOnUse', cx: CX, cy: CY, r: RMAX })
  RAMPE.forEach(([o, c, op]) => grad.append(el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op })))
  // Léger flou : tue le banding des dégradés radiaux étendus.
  defs.append(grad, el('filter', { id: fid, x: '-25%', y: '-25%', width: '150%', height: '150%' },
    [el('feGaussianBlur', { stdDeviation: 6 })]))
  zones.append(el('circle', { class: 'zm-glow', cx: CX, cy: CY, r: RMAX, fill: `url(#${gid})`, filter: `url(#${fid})` }))
  ;[...ZONES].reverse().forEach((z) =>
    zones.append(el('circle', { class: 'zm-edge', 'data-zone': z.id, cx: CX, cy: CY, r: R[z.id] })))

  /* Temps posé sur l'arc. Le temps seul : « CŒUR D'AGGLO · 15 min » était plus long
     que l'arc de 15 min lui-même. Au sommet dans le hero ; décalé vers le haut-gauche
     dans la section, où le cadre est plus bas et le sommet tomberait dans le fondu. */
  ZONES.forEach((z) => {
    const id = `${uid}-arc-${z.id}`
    const [x0, y0] = pt(-168, R[z.id])
    const [x1, y1] = pt(-12, R[z.id])
    defs.append(el('path', { id, fill: 'none', d: `M${x0} ${y0} A${R[z.id]} ${R[z.id]} 0 0 1 ${x1} ${y1}` }))
    const tx = el('text', { class: 'zm-arc', 'data-zone': z.id, 'text-anchor': 'middle' })
    const tp = el('textPath', { startOffset: dense ? '40%' : '50%', text: z.temps.toUpperCase() })
    tp.setAttribute('href', `#${id}`)
    tx.append(tp)
    over.append(tx)
  })

  // Fil tiré de Toulon vers la commune survolée, avec sa distance.
  svg.querySelectorAll('.zm-c:not(.is-hub)').forEach((g) => {
    const d = g.querySelector('.zm-c__dot')
    const x = Number(d.getAttribute('cx'))
    const y = Number(d.getAttribute('cy'))
    const lead = el('g', { class: 'zm-lead' }, [
      el('line', { x1: CX, y1: CY, x2: x, y2: y }),
      el('text', {
        x: (CX + x) / 2, y: (CY + y) / 2 - 7, 'text-anchor': 'middle',
        text: `${String(g.dataset.km).replace('.', ',')} km`,
      }),
    ])
    g.insertBefore(lead, g.firstChild)
  })
}
