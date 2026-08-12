// Effets de la carte : entrée en scène au défilement et compteur de minutes
// des itinéraires. Isolé pour garder index.js sous la barre des 200 lignes.
import { zoneById } from './zones.js'

/* L'entrée en scène est pilotée par la classe .is-in posée sur le SVG quand il
   devient visible à 25 %. Le rang de cascade (--d) suit l'ordre du DOM : les
   communes sont déjà triées par distance dans buildCommunes. */
export function entree(svg) {
  svg.querySelectorAll('.zm-c').forEach((g, i) => g.style.setProperty('--d', i))
  const obs = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return
    svg.classList.add('is-in')
    obs.disconnect()
  }), { threshold: 0.25 })
  obs.observe(svg)
}

/* Compte 0 → minutes du palier (450 ms) dans le texte de la route survolée.
   Branché comme sink de wireHover : la commune peut donc aussi être allumée
   par la légende ou la ligne d'info. Reduced-motion : la valeur s'affiche
   directement, sans défilement. */
export function compteurSink(svg) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
  const textes = {}
  svg.querySelectorAll('.zm-c:not(.is-hub) .zm-route text').forEach((t) => {
    textes[t.closest('.zm-c').dataset.n] = t
  })
  let raf = 0
  const compter = (c) => {
    const t = textes[c.n]
    if (!t) return
    const fin = parseInt(zoneById(c.z).temps, 10) || 45
    if (RM) { t.textContent = `≤ ${fin} min`; return }
    cancelAnimationFrame(raf)
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 450)
      t.textContent = `≤ ${Math.round(fin * p)} min`
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  return { showCommune: compter }
}
