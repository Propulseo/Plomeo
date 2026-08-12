// Carte de la zone d'intervention : hero + section « Zone ».
// Lit les communes dans Supabase (lecture live), avec repli sur une liste embarquée
// si la base est injoignable — le hero ne doit jamais se retrouver vide.

import { supabase, configured } from '../../admin/client.js'
import { renderCommunes } from '../render.mjs'
import { ZONES, buildCommunes, FALLBACK, zoneById } from './zones.js'
import { baseMap, ringLegend, caption, ctaLink, wireHover, VIEW_HERO, VIEW_ZONE } from './map.js'
import { paint } from './paint.js'
import { entree, compteurSink } from './fx.js'
import { el } from './dom.js'

async function chargerCommunes() {
  if (!configured || !supabase) return FALLBACK
  const { data, error } = await supabase.from('communes').select('*').order('ordre', { ascending: true })
  if (error || !data || !data.length) return FALLBACK
  return data
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/g, '')

export async function mountZoneMap() {
  const heroSlot = document.querySelector('.hero__map')
  const mapSlot = document.querySelector('.zone__map')
  if (!heroSlot && !mapSlot) return

  const rows = await chargerCommunes()
  const communes = buildCommunes(rows)
  // Aucune coordonnée exploitable : pas de carte, mais la liste des communes de la
  // base doit quand même remplacer le repli en dur — cms-lists.js ne le fait plus.
  if (!communes.length) {
    const inner = mapSlot?.closest('.zone__inner')
    if (inner) remplirPuces(inner, rows, [])
    return
  }
  const nbParZone = Object.fromEntries(ZONES.map((z) => [z.id, communes.filter((c) => c.z === z.id).length]))
  majCompteur(communes.length)

  if (heroSlot) monterHero(heroSlot, communes, nbParZone)
  if (mapSlot) monterSection(mapSlot, rows, communes, nbParZone)
}

/* ---------- Hero ---------- */
function monterHero(slot, communes, nbParZone) {
  const root = el('div', { class: 'zm-hero' })
  const { svg, zones, over, defs, clip } = baseMap('zmh', communes, { view: VIEW_HERO })
  paint({ svg, zones, over, defs, uid: 'zmh', clip, dense: false })

  const cap = caption(nbParZone)
  const leg = ringLegend()
  root.append(
    el('div', { class: 'zm-hero__map' }, [svg]),
    leg,
    cap.node,
    ctaLink('Votre commune est-elle couverte ?', '#zone'),
  )
  const { zone } = wireHover(root, svg, communes, cap, compteurSink(svg))
  leg.querySelectorAll('.zm-legend__i').forEach((b) => {
    ;['mouseenter', 'focus'].forEach((e) => b.addEventListener(e, () => zone(b.dataset.zone)))
    ;['mouseleave', 'blur'].forEach((e) => b.addEventListener(e, () => zone(null)))
  })

  slot.replaceChildren(root)
  entree(svg)
}

/* La barre de réassurance annonce le nombre de communes. Il est écrit en dur dans
   index.html (anim.js le compte au chargement, avant notre fetch) : on le remet à
   la vraie valeur si la base en dit autre chose. */
function majCompteur(n) {
  const cible = document.querySelector('[data-zone-count]')
  if (!cible) return
  cible.dataset.count = String(n)
  if (cible.textContent !== String(n)) cible.textContent = String(n)
}

/* ---------- Section « Zone d'intervention » ---------- */
function monterSection(slot, rows, communes, nbParZone) {
  const root = slot.closest('.zone__inner') || slot.parentElement
  const { svg, zones, over, defs, clip } = baseMap('zmz', communes, { view: VIEW_ZONE, dense: true })
  paint({ svg, zones, over, defs, uid: 'zmz', clip, dense: true })
  slot.replaceChildren(svg)
  entree(svg)

  remplirPreuves(root, communes, nbParZone)
  const lignes = remplirPaliers(root, nbParZone)
  const puces = remplirPuces(root, rows, communes)

  const sink = {
    show: (id) => {
      lignes.forEach((r) => r.classList.toggle('is-on', r.dataset.zone === id))
      puces.forEach((p) => p.classList.remove('is-hit'))
    },
    showCommune: (c) => {
      lignes.forEach((r) => r.classList.toggle('is-on', r.dataset.zone === c.z))
      puces.forEach((p) => p.classList.toggle('is-hit', p.dataset.n === c.n))
    },
    reset: () => {
      lignes.forEach((r) => r.classList.remove('is-on'))
      puces.forEach((p) => p.classList.remove('is-hit'))
    },
  }
  const { zone, commune, clear } = wireHover(root, svg, communes, sink)
  lignes.forEach((r) => {
    ;['mouseenter', 'focus'].forEach((e) => r.addEventListener(e, () => zone(r.dataset.zone)))
    ;['mouseleave', 'blur'].forEach((e) => r.addEventListener(e, () => zone(null)))
  })
  // Lien dans les deux sens : la puce éclaire la commune sur la carte.
  puces.forEach((p) => {
    const c = communes.find((x) => x.n === p.dataset.n)
    if (!c) return
    ;['mouseenter'].forEach((e) => p.addEventListener(e, () => commune(c)))
    p.addEventListener('mouseleave', clear)
  })
  brancherRecherche(root, communes, commune, clear)
}

function remplirPreuves(root, communes, nbParZone) {
  const box = root.querySelector('.zone__proof')
  if (!box) return
  const items = [
    [String(communes.length), 'communes desservies'],
    [String(nbParZone[ZONES[0].id]), `à moins de ${ZONES[0].temps}`],
    ['Gratuit', 'devis sans engagement'],
  ]
  box.replaceChildren(...items.map(([b, s]) =>
    el('div', { class: 'zone__proof-i' }, [el('b', { text: b }), el('span', { text: s })])))
}

function remplirPaliers(root, nbParZone) {
  const box = root.querySelector('.zone__paliers')
  if (!box) return []
  const lignes = ZONES.map((z) => el('button', { type: 'button', class: 'zone__palier', 'data-zone': z.id }, [
    el('div', { class: 'zone__palier-head' }, [
      el('span', { class: 'zone__palier-temps', text: z.temps }),
      el('span', { class: 'zone__palier-nom', text: z.nom }),
      el('span', { class: 'zone__palier-n', text: `${nbParZone[z.id]} communes` }),
    ]),
    el('p', { class: 'zone__palier-pitch', text: z.pitch }),
  ]))
  box.replaceChildren(...lignes)
  return lignes
}

/* Les puces restent rendues en HTML (repli SEO dans index.html) puis remplacées ici
   par la liste de la base, enrichie du palier. C'est cette carte qui en est
   propriétaire : `communes` a été retiré de cms-lists.js pour éviter deux écrivains.
   L'ordre est celui de la base, donc celui des flèches ↑↓ du back-office : trier
   par distance ici aurait rendu ces boutons sans effet. */
function remplirPuces(root, rows, communes) {
  const box = root.querySelector('.zone__communes')
  if (!box) return []
  const parNom = Object.fromEntries(communes.map((c) => [c.n, c]))
  box.innerHTML = renderCommunes(rows.map((r) => ({ nom: r.nom, zone: parNom[r.nom]?.z })))
  const puces = [...box.querySelectorAll('.zone__chip')]
  puces.forEach((p) => p.classList.add('is-in')) // anim.js n'observe plus : on révèle
  return puces
}

function brancherRecherche(root, communes, commune, clear) {
  const box = root.querySelector('.zone__search')
  if (!box) return
  const input = el('input', {
    type: 'search', class: 'zone__search-in', autocomplete: 'off',
    placeholder: 'Votre commune ? Ex. Solliès-Pont, La Crau, Bandol…',
    'aria-label': 'Vérifier si votre commune est desservie',
  })
  const out = el('p', { class: 'zone__search-out', 'aria-live': 'polite' })
  box.replaceChildren(input, out)

  input.addEventListener('input', () => {
    const q = norm(input.value)
    out.className = 'zone__search-out'
    if (q.length < 2) { out.textContent = ''; return clear() }
    const hit = communes.find((c) => norm(c.n).startsWith(q)) || communes.find((c) => norm(c.n).includes(q))
    if (hit) {
      const z = zoneById(hit.z)
      out.className = 'zone__search-out is-yes'
      out.dataset.zone = z.id
      out.textContent = `Oui — ${hit.n} : intervention sous ${z.temps} (${z.nom}).`
      commune(hit)
    } else {
      out.className = 'zone__search-out is-no'
      out.textContent = 'Pas dans notre liste — écrivez-nous, on vous dit tout de suite si on peut s’y rendre.'
      clear()
    }
  })
}
