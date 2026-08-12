// Effets de la carte : entrée en scène au défilement et compteur de minutes
// des itinéraires. Isolé pour garder index.js sous la barre des 200 lignes.
import { zoneById } from './zones.js'

/* L'entrée en scène est pilotée par la classe .is-in posée sur le SVG quand il
   devient visible à 15 %. Le rang de cascade (--d) suit l'ordre du DOM : les
   communes sont déjà triées par distance dans buildCommunes. Sans
   IntersectionObserver, la carte s'affiche immédiatement — jamais de carte
   blanche à vie. */
export function entree(svg) {
  svg.querySelectorAll('.zm-c').forEach((g, i) => g.style.setProperty('--d', i))
  if (!('IntersectionObserver' in window)) return svg.classList.add('is-in')
  const obs = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return
    svg.classList.add('is-in')
    obs.disconnect()
  }), { threshold: 0.15 })
  obs.observe(svg)
}

/* Compte 0 → minutes du palier (450 ms) dans le texte de route de la commune
   allumée (.is-focus, posé par wireHover AVANT d'appeler les sinks). Le
   reduced-motion est relu à chaque survol : un basculement OS en cours de
   session est respecté. reset() coupe le compte quand le curseur sort. */
export function compteurSink(svg) {
  let raf = 0
  const compter = (c) => {
    cancelAnimationFrame(raf)
    const t = svg.querySelector('.zm-c.is-focus .zm-route text')
    if (!t) return
    const fin = zoneById(c.z).min
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      t.textContent = `≤ ${fin} min`
      return
    }
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 450)
      t.textContent = `≤ ${Math.round(fin * p)} min`
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  return { showCommune: compter, reset: () => cancelAnimationFrame(raf) }
}
