import { describe, it, expect } from 'vitest'
import { esc, renderCommunes } from './render.mjs'

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
