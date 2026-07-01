// Monte les sections « listes » du site sur Supabase (lecture live).
// Patron repris de assets/js/site/realisations.js : fetch -> remplace le HTML
// en dur -> fallback (return tot) si la base est injoignable/vide.
import { supabase, configured, publicUrl } from '../admin/client.js'
import { renderCommunes, renderPiliers, renderProcess, renderFaq, renderArticles, renderAvis } from './render.mjs'

// Monte une liste : fetch la table, filtre/trie, remplace le HTML en dur.
// hasVisible=true ajoute .eq('visible', true) (tables avec cette colonne uniquement).
// Retourne true si le remplacement a eu lieu, false si le fallback en dur est conservé.
export async function mountList({ table, selector, hasVisible, render }) {
  const container = document.querySelector(selector)
  if (!container || !configured || !supabase) return false
  let query = supabase.from(table).select('*')
  if (hasVisible) query = query.eq('visible', true)
  const { data, error } = await query.order('ordre', { ascending: true })
  if (error || !data || !data.length) return false // fallback : HTML en dur conserve
  container.innerHTML = render(data)
  // anim.js observe les [data-reveal] UNE SEULE FOIS au chargement (pas de
  // MutationObserver) : les noeuds injectés ici après coup ne seraient jamais
  // révélés (opacity:0 pour toujours). On les révèle donc directement.
  if (container.matches('[data-reveal]')) container.classList.add('is-in')
  container.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'))
  return true
}

// main.js (script classique, exécuté avant les modules différés) attache déjà
// le comportement accordéon au chargement, mais sur les .faqitem en dur : si
// le CMS a remplacé le contenu après coup, ces écouteurs pointent sur des
// noeuds DOM disparus. On ré-attache donc sur les nouveaux boutons.
function bindFaqAccordion() {
  document.querySelectorAll('.faqitem__q').forEach(q => q.addEventListener('click', () => {
    const item = q.closest('.faqitem')
    const wasOpen = item.classList.contains('open')
    document.querySelectorAll('.faqitem').forEach(i => i.classList.remove('open'))
    if (!wasOpen) item.classList.add('open')
  }))
}

async function mountAll() {
  const avisMounted = await mountList({ table: 'avis', selector: '#reaTrack', hasVisible: true, render: renderAvis })
  if (avisMounted) document.getElementById('reaTrack').dataset.cmsFilled = '1'
  await mountList({ table: 'communes', selector: '.zone__communes', hasVisible: false, render: renderCommunes })
  await mountList({ table: 'piliers', selector: '#pilCards', hasVisible: true, render: renderPiliers })
  await mountList({ table: 'process_etapes', selector: '.process__grid', hasVisible: false, render: renderProcess })
  const faqMounted = await mountList({ table: 'faq', selector: '.faq__list', hasVisible: true, render: renderFaq })
  if (faqMounted) bindFaqAccordion()
  await mountList({
    table: 'articles', selector: '.blog__list', hasVisible: true,
    render: rows => renderArticles(rows, path => publicUrl('articles', path)),
  })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll)
else mountAll()
