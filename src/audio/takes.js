// Drum takes ("music projects"): recorded or step-edited hit lists shared between the
// drum session (records them) and the CRT Studio app (opens, edits, plays, exports them).
// Pure helpers are exported for tests; the store persists to localStorage when available.

export const PADS = [
  { id: 'crash', label: 'Crash' },
  { id: 'ride', label: 'Ride' },
  { id: 'hihatOpen', label: 'Open HH' },
  { id: 'hihat', label: 'Hi-hat' },
  { id: 'tom1', label: 'Tom 1' },
  { id: 'tom2', label: 'Tom 2' },
  { id: 'floor', label: 'Floor' },
  { id: 'snare', label: 'Snare' },
  { id: 'kick', label: 'Kick' },
]
export const PAD_IDS = PADS.map(pad => pad.id)
// Piano events use pad 'piano' plus a MIDI `note` and a held duration `d` (seconds).
export const PIANO = 'piano'
export const GUITAR = 'guitar'
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const noteName = note => `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`
const isEvent = event => PAD_IDS.includes(event.pad) || ([PIANO, GUITAR].includes(event.pad) && Number.isFinite(event.note))
const eventKey = (event, t) => `${event.pad}:${event.note ?? ''}@${t.toFixed(4)}`

export const beatLength = bpm => 60 / bpm
export const barLength = bpm => 4 * beatLength(bpm)

// Length rounded up to whole bars so loops stay in time; at least one bar.
export function takeLength(take) {
  const bar = barLength(take.bpm)
  const last = take.events.reduce((max, event) => Math.max(max, event.t + Math.max(0, (event.d || 0) - 1e-3)), 0)
  return Math.max(take.bars ? take.bars * bar : 0, Math.ceil((last + 1e-6) / bar) * bar, bar)
}

export function makeTake({ name, bpm = 90, events = [], bars, now = Date.now() }) {
  return {
    id: `take-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name, bpm, bars, createdAt: now,
    events: [...events].sort((a, b) => a.t - b.t),
  }
}

// Recording: hits arrive with absolute audio-clock times; store them relative to the start.
export function finishRecording({ startedAt, hits, bpm, name, now }) {
  const events = hits.filter(isEvent).map(hit => {
    const event = { t: Math.max(0, hit.at - startedAt), pad: hit.pad }
    if (hit.pad === PIANO || hit.pad === GUITAR) Object.assign(event, { note: hit.note, d: Math.max(.08, (hit.until ?? hit.at + (hit.pad === GUITAR ? 1.1 : .4)) - hit.at) })
    if (hit.pad === GUITAR && hit.tone === 'electric') event.tone = 'electric'
    return event
  })
  return makeTake({ name, bpm, events, now })
}

export function quantize(take, division = 4) {
  const step = beatLength(take.bpm) / division
  const seen = new Set()
  const events = []
  for (const event of take.events) {
    const t = Math.round(event.t / step) * step
    const key = eventKey(event, t)
    if (seen.has(key)) continue
    seen.add(key)
    events.push(event.pad === PIANO || event.pad === GUITAR ? { ...event, t, d: Math.max(step, Math.round(event.d / step) * step) } : { t, pad: event.pad })
  }
  return { ...take, events: events.sort((a, b) => a.t - b.t), original: take.original || take.events }
}

// Step editing: click a grid cell to add a hit, click an existing hit to remove it.
// For piano pass `note`; a click inside an existing note's length removes it.
export function toggleStep(take, pad, step, division = 4, note) {
  const size = beatLength(take.bpm) / division
  const t = step * size
  const hit = take.events.findIndex(event => event.pad === pad && event.note === note &&
    (pad === PIANO || pad === GUITAR ? t >= event.t - size / 2 && t < event.t + Math.max(event.d, size) : Math.abs(event.t - t) < size / 2))
  const added = pad === PIANO || pad === GUITAR ? { t, pad, note, d: size * 2 } : { t, pad }
  const events = hit >= 0 ? take.events.filter((_, i) => i !== hit) : [...take.events, added].sort((a, b) => a.t - b.t)
  return { ...take, events }
}

// Align the other take by beat, not by wall-clock seconds, when their BPM differs.
export function mergeTakes(base, layer) {
  const scale = layer.bpm / base.bpm
  const events = [...base.events, ...layer.events.map(event => ({ ...event, t: event.t * scale, ...(event.d ? { d: event.d * scale } : {}) }))].sort((a, b) => a.t - b.t)
  return { ...base, events, bars: Math.max(base.bars || 0, Math.ceil(takeLength(layer) * scale / barLength(base.bpm))), original: undefined }
}

// Key of the music you've been making: Krumhansl–Schmuckler major-key profile correlated with
// the most recent piano take's pitch classes (weighted by held length). Returns 0–11 or null.
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
function correlation(a, b) {
  const mean = list => list.reduce((x, y) => x + y, 0) / list.length
  const ma = mean(a), mb = mean(b)
  let num = 0, da = 0, db = 0
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
  return num / Math.sqrt(da * db || 1)
}
export function projectKey(takes) {
  const piano = takes.find(take => take.events.some(event => event.pad === PIANO))
  if (!piano) return null
  const weight = Array(12).fill(0)
  piano.events.filter(event => event.pad === PIANO).forEach(event => { weight[event.note % 12] += event.d || .25 })
  let best = 0, bestScore = -Infinity
  for (let root = 0; root < 12; root++) {
    const score = correlation(weight, weight.map((_, pc) => MAJOR_PROFILE[(pc - root + 12) % 12]))
    if (score > bestScore) { bestScore = score; best = root }
  }
  return best
}

const STORAGE_KEY = 'moonroom.takes.v1'

function load() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

let takes = load()
const listeners = new Set()

function commit(next) {
  takes = next
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(takes)) } catch { /* private mode: keep in memory */ }
  listeners.forEach(listener => listener())
}

export const takeStore = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  getAll() { return takes },
  add(take) { commit([take, ...takes]); return take },
  update(id, patch) { commit(takes.map(take => take.id === id ? { ...take, ...(typeof patch === 'function' ? patch(take) : patch) } : take)) },
  remove(id) { commit(takes.filter(take => take.id !== id)) },
}
