import { describe, it, expect } from 'vitest'
import { esc, safeHref, renderCommunes, renderPiliers, renderProcess, renderFaq } from './render.mjs'

describe('safeHref', () => {
  it('rejette un schéma javascript: (fallback #contact)', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#contact')
  })
  it('accepte https:, mailto:, tel:', () => {
    expect(safeHref('https://x')).toBe('https://x')
    expect(safeHref('mailto:a@b')).toBe('mailto:a@b')
    expect(safeHref('tel:+33')).toBe('tel:+33')
  })
  it('accepte les chemins relatifs et ancres', () => {
    expect(safeHref('/page')).toBe('/page')
    expect(safeHref('#contact')).toBe('#contact')
    expect(safeHref('./x')).toBe('./x')
  })
  it('retombe sur le fallback si vide', () => {
    expect(safeHref('')).toBe('#contact')
    expect(safeHref(null)).toBe('#contact')
    expect(safeHref(undefined)).toBe('#contact')
  })
})

describe('esc', () => {
  it('échappe les caractères HTML dangereux', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
  it('gère null/undefined en chaîne vide', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })
})

describe('renderCommunes', () => {
  it('rend une puce par commune, dans l\'ordre donné', () => {
    const rows = [{ nom: 'Toulon' }, { nom: 'Fréjus' }]
    const html = renderCommunes(rows)
    expect(html).toBe(
      '<span class="zone__chip" data-reveal="up">Toulon</span>' +
      '<span class="zone__chip" data-reveal="up">Fréjus</span>'
    )
  })
  it('échappe le nom de la commune', () => {
    const html = renderCommunes([{ nom: '<b>X</b>' }])
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).not.toContain('<b>X</b>')
  })
  it('retourne une chaîne vide sur liste vide', () => {
    expect(renderCommunes([])).toBe('')
  })
})

describe('renderPiliers', () => {
  const row = {
    categorie: 'plomberie', numero: '01', titre: 'Plomberie',
    description: "De l'installation complète à la rénovation.",
    image_path: 'assets/photos/sdb-jacuzzi.jpg', image_alt: 'Plomberie',
    points: ['Installation sanitaire complète', 'Rénovation de salle de bain'],
    cta_texte: 'Demander un devis', cta_lien: '#contact',
  }

  it('rend une article.sb avec data-m = categorie', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<article class="sb" data-m="plomberie">')
    expect(html).toContain('<span class="sb__num">01</span>')
    expect(html).toContain('<h3>Plomberie</h3>')
  })

  it('rend chaque point de la liste points[] en <li>', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<ul class="sb__list"><li>Installation sanitaire complète</li><li>Rénovation de salle de bain</li></ul>')
  })

  it('rend le lien cta avec le texte fourni', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<a class="sb__link" href="#contact">Demander un devis</a>')
  })

  it('échappe titre/description/points', () => {
    const html = renderPiliers([{ ...row, titre: '<b>X</b>', points: ['<i>y</i>'] }])
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;y&lt;/i&gt;')
  })

  it('gère points absent/null sans planter (liste vide)', () => {
    const html = renderPiliers([{ ...row, points: null }])
    expect(html).toContain('<ul class="sb__list"></ul>')
  })

  it('neutralise un cta_lien en javascript: (pas de schéma actif dans le href)', () => {
    const html = renderPiliers([{ ...row, cta_lien: 'javascript:alert(1)' }])
    expect(html).not.toContain('javascript:')
  })

  it('conserve un cta_lien https légitime', () => {
    const html = renderPiliers([{ ...row, cta_lien: 'https://ex.fr' }])
    expect(html).toContain('href="https://ex.fr"')
  })

  it('émet une source webp dérivée de image_path', () => {
    const html = renderPiliers([row])
    expect(html).toContain('<source type="image/webp"')
    expect(html).toContain('srcset="assets/photos/sdb-jacuzzi.webp"')
  })
})

describe('renderProcess', () => {
  it('rend une étape .pstep avec numéro/titre/description', () => {
    const html = renderProcess([{ numero: '1', titre: 'On échange', description: 'Vous décrivez votre besoin.' }])
    expect(html).toBe(
      '<div class="pstep" data-reveal="up"><div class="pstep__n">1</div><h3>On échange</h3><p>Vous décrivez votre besoin.</p></div>'
    )
  })

  it('échappe titre/description', () => {
    const html = renderProcess([{ numero: '1', titre: '<b>T</b>', description: '<i>D</i>' }])
    expect(html).toContain('&lt;b&gt;T&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;D&lt;/i&gt;')
  })
})

describe('renderFaq', () => {
  it('rend un item accordéon avec question/réponse', () => {
    const html = renderFaq([{ question: 'Intervenez-vous en urgence ?', reponse: 'Oui, selon nos disponibilités.' }])
    expect(html).toBe(
      '<div class="faqitem" data-reveal="up">' +
      '<button class="faqitem__q">Intervenez-vous en urgence ?</button>' +
      '<div class="faqitem__a"><p>Oui, selon nos disponibilités.</p></div>' +
      '</div>'
    )
  })

  it('échappe question et réponse', () => {
    const html = renderFaq([{ question: '<b>Q</b>', reponse: '<i>R</i>' }])
    expect(html).toContain('&lt;b&gt;Q&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;R&lt;/i&gt;')
  })

  it('concatène plusieurs items dans l\'ordre', () => {
    const html = renderFaq([{ question: 'A', reponse: 'a' }, { question: 'B', reponse: 'b' }])
    expect(html.indexOf('>A<')).toBeLessThan(html.indexOf('>B<'))
  })
})
