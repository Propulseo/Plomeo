import { describe, it, expect } from 'vitest'
import { buildTable, safeCmsAttrValue } from './apply-cms-live.mjs'

// Le module pur derrière la couche « lecture live » des singletons (cms-singletons.js).
// Miroir navigateur de build/fetch-content.mjs + de la règle URL de build/apply-cms.mjs.

describe('buildTable', () => {
  it('indexe les lignes par "section.cle"', () => {
    const rows = [
      { section: 'hero', cle: 'titre', valeur: 'Bonjour' },
      { section: 'seo', cle: 'meta_title', valeur: 'Ploméo' },
    ]
    expect(buildTable(rows)).toEqual({ 'hero.titre': 'Bonjour', 'seo.meta_title': 'Ploméo' })
  })

  it('convertit une valeur non-chaîne en chaîne (comme fetch-content.mjs)', () => {
    expect(buildTable([{ section: 'a', cle: 'b', valeur: 42 }])).toEqual({ 'a.b': '42' })
  })

  it('gère une liste vide ou nulle sans planter', () => {
    expect(buildTable([])).toEqual({})
    expect(buildTable(null)).toEqual({})
    expect(buildTable(undefined)).toEqual({})
  })
})

describe('safeCmsAttrValue', () => {
  it('laisse passer une valeur normale pour un attribut non-URL', () => {
    expect(safeCmsAttrValue('content', 'Bonjour')).toBe('Bonjour')
  })

  it('laisse passer une URL légitime pour href/src', () => {
    expect(safeCmsAttrValue('href', 'https://instagram.com/plomeo')).toBe('https://instagram.com/plomeo')
    expect(safeCmsAttrValue('href', 'mailto:contact@plomeo.fr')).toBe('mailto:contact@plomeo.fr')
    expect(safeCmsAttrValue('href', 'tel:+33695165889')).toBe('tel:+33695165889')
    expect(safeCmsAttrValue('href', '#contact')).toBe('#contact')
    expect(safeCmsAttrValue('src', '/assets/photos/x.jpg')).toBe('/assets/photos/x.jpg')
  })

  it('renvoie null pour un schéma javascript: sur href/src → on laisse l\'attribut cuit en place', () => {
    expect(safeCmsAttrValue('href', 'javascript:alert(1)')).toBeNull()
    expect(safeCmsAttrValue('src', '  JavaScript:alert(1)')).toBeNull()
  })

  it('bloque les contournements de schéma (allowlist) : caractère de contrôle intra-schéma, préfixe de contrôle, data:', () => {
    expect(safeCmsAttrValue('href', 'java\tscript:alert(1)')).toBeNull()
    expect(safeCmsAttrValue('href', 'javascript:alert(1)')).toBeNull()
    expect(safeCmsAttrValue('src', 'data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('ne contrôle que href/src (parité avec build/apply-cms.mjs) : les autres attributs passent tels quels', () => {
    expect(safeCmsAttrValue('content', 'javascript:peu importe')).toBe('javascript:peu importe')
  })
})
