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

describe('applyCms — attributs via data-cms-attr', () => {
  it("pose la valeur sur l'attribut visé", () => {
    const html = '<meta name="description" data-cms-attr="content:seo.meta_description" content="old">'
    const { html: out } = applyCms(html, { 'seo.meta_description': 'nouvelle desc' })
    expect(out).toContain('content="nouvelle desc"')
  })

  it("gère plusieurs paires attr:clé séparées par une virgule", () => {
    const html = '<meta data-cms-attr="content:a.b, data-x:c.d" content="o" data-x="o2">'
    const { html: out } = applyCms(html, { 'a.b': 'V1', 'c.d': 'V2' })
    expect(out).toContain('content="V1"')
    expect(out).toContain('data-x="V2"')
  })

  it("laisse l'attribut inchangé + warning si la clé manque", () => {
    const html = '<meta data-cms-attr="content:a.b" content="OLD">'
    const { html: out, warnings } = applyCms(html, {})
    expect(out).toContain('content="OLD"')
    expect(warnings).toContain('clé manquante (attr): a.b')
  })

  it("remplace le <title> via data-cms (texte)", () => {
    const html = '<head><title data-cms="seo.meta_title">Old</title></head>'
    const { html: out } = applyCms(html, { 'seo.meta_title': 'Nouveau titre' })
    expect(out).toContain('<title>Nouveau titre</title>')
  })
})

describe('applyCms — HTML assaini via data-cms-html', () => {
  it('injecte le HTML autorisé (em, br) sans l’échapper', () => {
    const html = '<h2 data-cms-html="s.t">EN DUR</h2>'
    const { html: out } = applyCms(html, { 's.t': 'Bonjour <em>le Var</em><br>ici' })
    expect(out).toContain('<em>le Var</em>')
    expect(out).toContain('<br>')
    expect(out).not.toContain('EN DUR')
  })

  it('retire les balises interdites (script)', () => {
    const html = '<h2 data-cms-html="s.t">x</h2>'
    const { html: out } = applyCms(html, { 's.t': 'ok<script>alert(1)</script><strong>gras</strong>' })
    expect(out).toContain('<strong>gras</strong>')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('alert(1)')
  })

  it('garde le contenu en dur + warning si la clé manque', () => {
    const html = '<h2 data-cms-html="a.b">FALLBACK</h2>'
    const { html: out, warnings } = applyCms(html, {})
    expect(out).toContain('FALLBACK')
    expect(warnings).toContain('clé manquante (html): a.b')
  })
})

describe('applyCms — HTML riche via data-cms-html-rich', () => {
  it('conserve les balises de structure (h2, ul, li)', () => {
    const html = '<div data-cms-html-rich="legal.x">EN DUR</div>'
    const val = '<h2>Titre</h2><ul><li>un</li><li>deux</li></ul>'
    const { html: out } = applyCms(html, { 'legal.x': val })
    expect(out).toContain('<h2>Titre</h2>')
    expect(out).toContain('<li>un</li>')
    expect(out).not.toContain('EN DUR')
  })
  it('retire quand même les balises dangereuses (script, iframe)', () => {
    const html = '<div data-cms-html-rich="legal.x">y</div>'
    const { html: out } = applyCms(html, { 'legal.x': '<p>ok</p><script>alert(1)</script><iframe src="x"></iframe>' })
    expect(out).toContain('<p>ok</p>')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('alert(1)')
  })
})
