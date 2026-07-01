// Couche « LECTURE LIVE » des textes fixes (singletons site_content), en miroir de
// cms-lists.js. Au chargement, on écrase le contenu CUIT AU BUILD par la dernière
// version en base → l'édition apparaît tout de suite, sans redéploiement. Le HTML
// cuit reste le filet SEO + le fallback si Supabase est injoignable/vide.
//
// Portée : CORPS de la page uniquement. Le <head> (title, meta, JSON-LD) et le HTML
// riche des pages légales restent cuits au build (voir build/apply-cms.mjs) : ils
// changent rarement et injecter un <head> en JS est peu fiable pour le SEO.
import DOMPurify from 'dompurify'
import { supabase, configured } from '../admin/client.js'
import { buildTable, safeCmsAttrValue } from './apply-cms-live.mjs'

// Liste blanche alignée sur STRICT_ALLOWED de build/apply-cms.mjs : formatage en
// ligne uniquement. DOMPurify neutralise script, gestionnaires d'événements et URL
// javascript: par défaut → parité avec l'assainissement du build (sanitize-html).
const HTML_STRICT = {
  ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'br', 'a', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
}

async function mountSingletons() {
  if (!configured || !supabase || !document.body) return
  const textEls = document.body.querySelectorAll('[data-cms]')
  const htmlEls = document.body.querySelectorAll('[data-cms-html]')
  const attrEls = document.body.querySelectorAll('[data-cms-attr]')
  if (!textEls.length && !htmlEls.length && !attrEls.length) return

  const { data, error } = await supabase.from('site_content').select('section, cle, valeur')
  if (error || !data || !data.length) return // fallback : HTML cuit conservé
  const table = buildTable(data)

  textEls.forEach((el) => {
    const val = table[el.getAttribute('data-cms')]
    if (val !== undefined) el.textContent = val
  })

  htmlEls.forEach((el) => {
    const val = table[el.getAttribute('data-cms-html')]
    if (val !== undefined) el.innerHTML = DOMPurify.sanitize(val, HTML_STRICT)
  })

  attrEls.forEach((el) => {
    for (const pair of (el.getAttribute('data-cms-attr') || '').split(',')) {
      const [attr, key] = pair.split(':').map((s) => s.trim())
      if (!attr || !key) continue
      const val = table[key]
      if (val === undefined) continue
      const safe = safeCmsAttrValue(attr, val)
      if (safe !== null) el.setAttribute(attr, safe)
    }
  })

  // Le titre du hero (#heroTitle) est découpé lettre par lettre par main.js AVANT
  // nous : son repère data-cms a déjà disparu, la boucle « textEls » ne l'atteint
  // pas. On annonce donc la table ; main.js ré-anime le hero si le titre a changé.
  document.dispatchEvent(new CustomEvent('cms:singletons-applied', { detail: table }))
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSingletons)
else mountSingletons()
