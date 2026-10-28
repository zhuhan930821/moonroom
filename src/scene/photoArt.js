// Painted dreamy "photos" for the photo wall: night skies, moons, castles, hills, foxes.
// Each built-in is its own 256px canvas; thumbnails for the picker come from the same canvas.

const rand = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 } }
const SKIES = [['#1d2a6a', '#e89ac0'], ['#2a1e5a', '#7a5ab8'], ['#f4b6a0', '#ffe2c8'], ['#3a5a9a', '#bfe0ff'], ['#4a2a5a', '#ff9ac0'], ['#1a2040', '#5a7ac0'], ['#e8c0d8', '#fff4f8'], ['#2a3a2a', '#9ac08a'],
  ['#0e1430', '#3a4a8a'], ['#5a3a7a', '#f0b0a0'], ['#a0c8e8', '#fff0d8'], ['#301a40', '#c06a9a'], ['#1a3040', '#6ab0b0'], ['#f0a0a0', '#ffe8c0'], ['#20184a', '#9a8ae0'], ['#3a2a20', '#e0a060']]

const canvases = new Map()
export function builtinCanvas(id) {
  if (canvases.has(id)) return canvases.get(id)
  const i = Number(id.slice(1)) || 0, S = 256
  const c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d'), r = rand(5 + i * 97), [a, b] = SKIES[i % SKIES.length]
  const grad = g.createLinearGradient(0, 0, 0, S); grad.addColorStop(0, a); grad.addColorStop(1, b)
  g.fillStyle = grad; g.fillRect(0, 0, S, S)
  g.fillStyle = 'rgba(255,255,255,.9)'; for (let s = 0; s < 22; s++) { const k = r() < .15 ? 3 : 2; g.fillRect(r() * S, r() * 150, k, k) }
  g.fillStyle = '#fff6dc'
  const sky = i % 4
  if (sky === 0) { g.beginPath(); g.arc(170, 80, 34, 0, 7); g.fill(); g.fillStyle = a; g.beginPath(); g.arc(186, 72, 30, 0, 7); g.fill() } // crescent
  else if (sky === 1) { g.beginPath(); g.arc(128, 96, 44, 0, 7); g.fill() } // full moon
  else if (sky === 2) { g.globalAlpha = .55; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(40 + r() * 180, 50 + r() * 60, 40, 12, 0, 0, 7); g.fill() } g.globalAlpha = 1 } // clouds
  else { g.strokeStyle = '#fff6dc'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 30); g.lineTo(120, 90); g.stroke() } // shooting star
  g.fillStyle = 'rgba(30,20,50,.85)'
  const ground = Math.floor(i / 4) % 4
  if (ground === 0 || ground === 2) { // castle towers
    for (let t = 0; t < 5; t++) { const tx = 60 + t * 30, th = 60 + r() * 70; g.fillRect(tx, S - th, 18, th); g.beginPath(); g.moveTo(tx - 4, S - th); g.lineTo(tx + 9, S - 30 - th); g.lineTo(tx + 22, S - th); g.fill() }
  } else { // rolling hill with a fox on top
    g.beginPath(); g.moveTo(0, S); g.quadraticCurveTo(90, 150, 170, 200); g.quadraticCurveTo(220, 170, S, 190); g.lineTo(S, S); g.fill()
    g.beginPath(); g.moveTo(150, 200); g.lineTo(158, 180); g.lineTo(166, 196); g.lineTo(174, 180); g.lineTo(182, 200); g.fill()
  }
  if (ground === 2) { g.fillStyle = 'rgba(255,214,140,.9)'; for (let w = 0; w < 6; w++) g.fillRect(66 + r() * 120, S - 20 - r() * 50, 4, 6) } // lit windows
  if (ground === 3) { g.fillStyle = 'rgba(255,240,200,.85)'; for (let f = 0; f < 9; f++) { g.beginPath(); g.arc(r() * S, 150 + r() * 90, 1.6, 0, 7); g.fill() } } // fireflies
  canvases.set(id, c)
  return c
}

const thumbs = new Map()
export const builtinThumb = id => thumbs.get(id) || (thumbs.set(id, builtinCanvas(id).toDataURL('image/jpeg', .8)), thumbs.get(id))
