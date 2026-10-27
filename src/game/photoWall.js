// Which photos hang on the photo wall, plus photos the player added. Persists to localStorage.
// Built-in photos are painted at runtime (ids 'b0'…); uploads are small JPEG data URLs.

export const BUILTIN_COUNT = 16
export const MAX_HUNG = 24
export const MAX_UPLOADS = 30
export const BUILTIN_IDS = Array.from({ length: BUILTIN_COUNT }, (_, i) => `b${i}`)
// Built-ins are painted square, but frame them in a mix of shapes.
const BUILTIN_ASPECTS = [.78, 1, 1.35, .78, 1.3, 1, .8, 1.4, 1, .75, 1.35, 1, .8, 1.3, .78, 1]
export const builtinAspect = id => BUILTIN_ASPECTS[Number(id.slice(1)) % BUILTIN_ASPECTS.length]

const KEY = 'moonroom.photoWall.v1'
const defaults = () => ({ hung: BUILTIN_IDS.slice(0, 11), uploads: [], seed: 1 })

export function normalize(raw) {
  const base = defaults()
  if (!raw || typeof raw !== 'object') return base
  const uploads = Array.isArray(raw.uploads) ? raw.uploads.filter(u => u && typeof u.id === 'string' && typeof u.src === 'string').slice(0, MAX_UPLOADS) : []
  const known = new Set([...BUILTIN_IDS, ...uploads.map(u => u.id)])
  const hung = Array.isArray(raw.hung) ? [...new Set(raw.hung)].filter(id => known.has(id)).slice(0, MAX_HUNG) : base.hung
  return { hung, uploads, seed: Number.isInteger(raw.seed) ? raw.seed : 1 }
}

// Pure state transitions (tested directly).
export const toggle = (state, id) => state.hung.includes(id)
  ? { ...state, hung: state.hung.filter(h => h !== id) }
  : state.hung.length >= MAX_HUNG ? state : { ...state, hung: [...state.hung, id] }
export const addUpload = (state, upload) => state.uploads.length >= MAX_UPLOADS ? state : {
  ...state, uploads: [...state.uploads, upload],
  hung: state.hung.length >= MAX_HUNG ? state.hung : [...state.hung, upload.id],
}
export const removeUpload = (state, id) => ({ ...state, uploads: state.uploads.filter(u => u.id !== id), hung: state.hung.filter(h => h !== id) })
export const shuffle = state => ({ ...state, seed: state.seed + 1 })

// The hung photos as layout input, in hanging order.
export const hungItems = state => state.hung.map(id => {
  const upload = state.uploads.find(u => u.id === id)
  return upload ? { id, aspect: upload.aspect || 1, src: upload.src } : { id, aspect: builtinAspect(id) }
})

const load = () => { try { return normalize(JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null')) } catch { return defaults() } }
let state = load()
const listeners = new Set()
let saveError = ''
const commit = next => {
  if (next === state) return
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(next)); saveError = '' }
  catch { saveError = '浏览器存储满了，这张照片只在本次打开时挂着' }
  state = next
  listeners.forEach(listener => listener())
}

export const photoWall = {
  get: () => state,
  saveError: () => saveError,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  toggle: id => commit(toggle(state, id)),
  add: upload => commit(addUpload(state, upload)),
  remove: id => commit(removeUpload(state, id)),
  shuffle: () => commit(shuffle(state)),
  reset: () => commit({ ...defaults(), uploads: state.uploads }),
}

// Shrinks a picked image file to a JPEG data URL (long side ≤ 512px) so many fit in storage.
export async function fileToUpload(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('读不了这张图片')); i.src = url })
    const k = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k))
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return { id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, src: c.toDataURL('image/jpeg', .82), aspect: c.width / c.height, name: file.name }
  } finally { URL.revokeObjectURL(url) }
}
