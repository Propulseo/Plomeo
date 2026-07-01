import { describe, it, expect } from 'vitest'
import { applyCms } from './apply-cms.mjs'

describe('applyCms — texte via data-cms', () => {
  it('remplace le texte d\'un élément étiqueté', () => {
    const html = '<!DOCTYPE html><html><body><h1 data-cms="hero.titre">ANCIEN</h1></body></html>'
    const { html: out } = applyCms(html, { 'hero.titre': 'NOUVEAU' })
    expect(out).toContain('>NOUVEAU</h1>')
    expect(out).not.toContain('ANCIEN')
  })

  it('échappe le HTML de la valeur (pas d\'injection)', () => {
    const html = '<p data-cms="x.y">z</p>'
    const { html: out } = applyCms(html, { 'x.y': '<script>alert(1)</script>' })
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>alert(1)</script>')
  })

  it('garde le texte en dur et émet un warning si la clé manque', () => {
    const html = '<p data-cms="a.b">FALLBACK</p>'
    const { html: out, warnings } = applyCms(html, {})
    expect(out).toContain('FALLBACK')
    expect(warnings).toEqual(['clé manquante: a.b'])
  })

  it('préserve le doctype et le reste du document', () => {
    const html = '<!DOCTYPE html><html><head><title>T</title></head><body><p data-cms="a.b">x</p></body></html>'
    const { html: out } = applyCms(html, { 'a.b': 'y' })
    expect(out.toLowerCase()).toContain('<!doctype html>')
    expect(out).toContain('<title>T</title>')
  })
})
