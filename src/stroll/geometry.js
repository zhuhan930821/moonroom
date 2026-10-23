import { rng } from '../worlds/spec'
import * as THREE from 'three'
import { LENGTH } from './constants'

// ---------- textures ----------
export function canvasTexture(w, h, draw, repeat) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  draw(canvas.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}
export function roadTexture(kind, base, seed) {
  const r = rng(seed), c = new THREE.Color(base)
  const shade = k => `#${c.clone().multiplyScalar(k).getHexString()}`
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = shade(.8); ctx.fillRect(0, 0, w, h)
    if (kind === 'cobble') for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      ctx.fillStyle = shade(.9 + r() * .35); ctx.beginPath(); ctx.ellipse(x * 32 + 16 + (y % 2) * 8, y * 32 + 16, 13, 12, r(), 0, Math.PI * 2); ctx.fill()
    }
    if (kind === 'boardwalk') for (let x = 0; x < 8; x++) { ctx.fillStyle = shade(.85 + r() * .3); ctx.fillRect(x * 32 + 1, 0, 30, h); ctx.fillStyle = shade(.6); ctx.fillRect(x * 32 + 14, (r() * h) | 0, 3, 3) }
    if (kind === 'sand' || kind === 'moss') for (let i = 0; i < 2500; i++) { ctx.fillStyle = shade(.75 + r() * .45); ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3) }
    if (kind === 'moss') for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(120,170,110,.35)'; ctx.beginPath(); ctx.arc(r() * w, r() * h, 6 + r() * 14, 0, 7); ctx.fill() }
    if (kind === 'glass') for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = shade(.9 + r() * .4); ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x * 64 + 6, y * 64 + 6, 20, 4) }
  }, [5, LENGTH / 3])
}
export function signTexture(name, color) {
  return canvasTexture(512, 224, (ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(40,24,30,.55)'; ctx.lineWidth = 14; ctx.strokeRect(10, 10, w - 20, h - 20)
    ctx.fillStyle = '#2a1a22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `600 ${name.length > 4 ? 76 : 96}px "Songti SC","Noto Serif SC",Georgia,serif`; ctx.fillText(name, w / 2, h / 2 + 4)
  })
}

// ---------- roof geometries (unit size, scaled per building) ----------
function prism() { // gable: triangle in x–y, extruded along z
  const shape = new THREE.Shape(); shape.moveTo(-.5, 0); shape.lineTo(.5, 0); shape.lineTo(0, 1); shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); return g
}
export const GEO = { prism: prism(), box: new THREE.BoxGeometry(1, 1, 1), cone4: new THREE.ConeGeometry(.71, 1, 4, 1).rotateY(Math.PI / 4), dome: new THREE.SphereGeometry(.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(.5, 1, 16) }

