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
    expect(out).toContain('>Nouveau titre</title>')
    expect(out).not.toContain('Old')
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

describe('applyCms — JSON-LD via data-cms-json', () => {
  it('met à jour les champs de premier niveau du bloc ld+json', () => {
    const html = `<script type="application/ld+json" data-cms-json="name:seo.meta_title,description:seo.meta_description">
      {"@type":"Plumber","name":"OLD","description":"OLDD"}
    </script>`
    const { html: out } = applyCms(html, { 'seo.meta_title': 'Ploméo', 'seo.meta_description': 'desc' })
    const json = JSON.parse(out.match(/\{[\s\S]*\}/)[0])
    expect(json.name).toBe('Ploméo')
    expect(json.description).toBe('desc')
    expect(json['@type']).toBe('Plumber')
  })
})

describe('applyCms — sécurité injection (revue finale)', () => {
  it('C1: neutralise </script> dans le JSON-LD (pas de breakout)', () => {
    const html = '<script type="application/ld+json" data-cms-json="description:s.d">{"description":"x"}</script>'
    const { html: out } = applyCms(html, { 's.d': '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script><script>alert(1)')
    expect(out).toContain('\\u003c')
    const m = out.match(/application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
    expect(() => JSON.parse(m[1])).not.toThrow()
  })
  it('C1bis: retire l’attribut data-cms-json de la sortie', () => {
    const html = '<script type="application/ld+json" data-cms-json="description:s.d">{"description":"x"}</script>'
    const { html: out } = applyCms(html, { 's.d': 'ok' })
    expect(out).not.toContain('data-cms-json')
  })
  it('C2: bloque une URL javascript: sur href + warning', () => {
    const html = '<a data-cms-attr="href:f.u" href="#">x</a>'
    const { html: out, warnings } = applyCms(html, { 'f.u': 'javascript:alert(1)' })
    expect(out).not.toContain('javascript:alert(1)')
    expect(warnings.some((w) => w.includes('URL bloquée'))).toBe(true)
  })
  it('C2bis: une URL normale passe et data-cms-attr est CONSERVÉ (couche live)', () => {
    const html = '<a data-cms-attr="href:f.u" href="#">x</a>'
    const { html: out } = applyCms(html, { 'f.u': 'https://instagram.com/plomeo' })
    expect(out).toContain('href="https://instagram.com/plomeo"')
    expect(out).toContain('data-cms-attr="href:f.u"')
  })
  it('C2ter: bloque un contournement de schéma via allowlist (pas un simple deny de javascript:)', () => {
    const html = '<a data-cms-attr="href:f.u" href="#">x</a>'
    const { html: out, warnings } = applyCms(html, { 'f.u': 'java\tscript:alert(1)' })
    expect(out).toContain('href="#"')
    expect(warnings.some((w) => w.includes('URL bloquée'))).toBe(true)
  })
})

describe('applyCms — repères conservés pour la couche « lecture live »', () => {
  it('CONSERVE data-cms (texte) après cuisson (cms-singletons.js s\'y accroche)', () => {
    const { html: out } = applyCms('<h1 data-cms="hero.titre">x</h1>', { 'hero.titre': 'Y' })
    expect(out).toContain('data-cms="hero.titre"')
    expect(out).toContain('>Y</h1>')
  })
  it('CONSERVE data-cms-html (strict) après cuisson', () => {
    const { html: out } = applyCms('<h2 data-cms-html="s.t">x</h2>', { 's.t': 'a<em>b</em>' })
    expect(out).toContain('data-cms-html="s.t"')
    expect(out).toContain('<em>b</em>')
  })
  it('RETIRE data-cms-html-rich (pages légales, cuites au build)', () => {
    const { html: out } = applyCms('<div data-cms-html-rich="legal.x">x</div>', { 'legal.x': '<p>ok</p>' })
    expect(out).not.toContain('data-cms-html-rich')
    expect(out).toContain('<p>ok</p>')
  })
  it('RETIRE data-cms-json (<head>, cuit au build)', () => {
    const html = '<script type="application/ld+json" data-cms-json="description:s.d">{"description":"x"}</script>'
    const { html: out } = applyCms(html, { 's.d': 'ok' })
    expect(out).not.toContain('data-cms-json')
  })
})
