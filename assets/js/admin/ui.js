// Petits utilitaires UI du back office.

export function toast(message, type = 'ok') {
  let host = document.getElementById('adm-toasts')
  if (!host) {
    host = document.createElement('div')
    host.id = 'adm-toasts'
    document.body.appendChild(host)
  }
  const t = document.createElement('div')
  t.className = `adm-toast adm-toast--${type}`
  t.textContent = message
  host.appendChild(t)
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300) }, 2600)
}

// Échappe le HTML pour une injection sûre de texte.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Compression / redimension côté client avant upload (léger sur mobile).
export async function compressImage(file, maxSize = 1600, quality = 0.82) {
  if (!file || !file.type.startsWith('image/')) return file
  let img
  try { img = await loadImage(file) } catch { return file }
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  if (scale === 1 && file.size < 600 * 1024) return file
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
  return blob || file
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}
