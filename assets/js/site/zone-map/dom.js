// Micro-helper de création d'éléments (SVG et HTML), en une ligne.

const SVG_NS = 'http://www.w3.org/2000/svg'
const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'text', 'line', 'rect', 'defs', 'clipPath',
  'radialGradient', 'stop', 'textPath', 'filter', 'feGaussianBlur',
])

export function el(tag, attrs = {}, children = []) {
  const node = SVG_TAGS.has(tag)
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'text') node.textContent = v
    else node.setAttribute(k, v)
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c)
  return node
}
