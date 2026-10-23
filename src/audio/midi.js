// Standard MIDI files for takes, so music moves between Moonroom's Studio and Mugo
// (Mugo: 乐谱库 → 导入 MIDI 文件… / ↓ 导出 MIDI). Drums use General MIDI on channel 10 with
// the same note map Mugo reads; piano is channel 1. No dependencies.
import { PAD_IDS, PIANO, makeTake } from './takes.js'

export const GM_NOTE = { kick: 36, snare: 38, hihat: 42, hihatOpen: 46, tom1: 50, tom2: 47, floor: 43, crash: 49, ride: 51 }
const GM_PAD = { 35: 'kick', 36: 'kick', 37: 'snare', 38: 'snare', 40: 'snare', 42: 'hihat', 44: 'hihat', 46: 'hihatOpen',
  48: 'tom1', 50: 'tom1', 45: 'tom2', 47: 'tom2', 41: 'floor', 43: 'floor', 49: 'crash', 52: 'crash', 55: 'crash', 57: 'crash', 51: 'ride', 53: 'ride', 59: 'ride' }
const PPQ = 480
const DRUM_GATE = .1

const vlq = value => { const bytes = [value & 0x7f]; while ((value >>= 7)) bytes.unshift((value & 0x7f) | 0x80); return bytes }
const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const chunk = (type, data) => [...[...type].map(c => c.charCodeAt(0)), ...u32(data.length), ...data]

function track(events) { // events: { tick, bytes }
  const data = []
  let last = 0
  for (const event of [...events].sort((a, b) => a.tick - b.tick || a.order - b.order)) { data.push(...vlq(event.tick - last), ...event.bytes); last = event.tick }
  data.push(0, 0xff, 0x2f, 0)
  return chunk('MTrk', data)
}

export function takeToMidi(take) {
  const ticks = seconds => Math.round(seconds / (60 / take.bpm) * PPQ)
  const tempo = Math.round(60e6 / take.bpm)
  const name = [...new TextEncoder().encode(take.name)]
  const meta = track([{ tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(name.length), ...name] },
    { tick: 0, order: 1, bytes: [0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] },
    { tick: 0, order: 2, bytes: [0xff, 0x58, 4, 4, 2, 24, 8] }])
  const notes = (channel, list) => list.flatMap(({ note, t, d }) => [
    { tick: ticks(t), order: 1, bytes: [0x90 | channel, note, 96] },
    { tick: ticks(t + d), order: 0, bytes: [0x80 | channel, note, 0] }])
  const drums = take.events.filter(event => GM_NOTE[event.pad]).map(event => ({ note: GM_NOTE[event.pad], t: event.t, d: DRUM_GATE }))
  const piano = take.events.filter(event => event.pad === PIANO).map(event => ({ note: event.note, t: event.t, d: event.d }))
  const tracks = [meta]
  if (piano.length) tracks.push(track([{ tick: 0, order: 0, bytes: [0xc0, 0] }, ...notes(0, piano)]))
  if (drums.length) tracks.push(track(notes(9, drums)))
  return new Uint8Array([...chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255]), ...tracks.flat()])
}

export function midiToTake(buffer, name, now = Date.now()) {
  const bytes = new Uint8Array(buffer)
  let pos = 0
  const read32 = () => (bytes[pos++] << 24 | bytes[pos++] << 16 | bytes[pos++] << 8 | bytes[pos++]) >>> 0
  const readVlq = () => { let value = 0, b; do { b = bytes[pos++]; value = (value << 7) | (b & 0x7f) } while (b & 0x80); return value }
  const tag = () => String.fromCharCode(...bytes.slice(pos, pos += 4))
  if (tag() !== 'MThd') throw new Error('这不是 MIDI 文件')
  const headerLength = read32(); const headerStart = pos
  const division = (bytes[headerStart + 4] << 8) | bytes[headerStart + 5]
  if (division & 0x8000) throw new Error('暂不支持 SMPTE 时间格式的 MIDI')
  pos = headerStart + headerLength
  const tempos = [{ tick: 0, us: 500000 }]
  const raw = [] // { tick, on, channel, note }
  while (pos < bytes.length) {
    const type = tag(), length = read32(), end = pos + length
    if (type !== 'MTrk') { pos = end; continue }
    let tick = 0, status = 0
    while (pos < end) {
      tick += readVlq()
      let byte = bytes[pos]
      if (byte & 0x80) { status = byte; pos++ } // otherwise running status
      if (status === 0xff) { const meta = bytes[pos++], len = readVlq(); if (meta === 0x51) tempos.push({ tick, us: bytes[pos] << 16 | bytes[pos + 1] << 8 | bytes[pos + 2] }); pos += len; continue }
      if (status === 0xf0 || status === 0xf7) { pos += readVlq(); continue }
      const kind = status & 0xf0, channel = status & 0x0f
      if (kind === 0x90 || kind === 0x80) { const note = bytes[pos++], velocity = bytes[pos++]; raw.push({ tick, on: kind === 0x90 && velocity > 0, channel, note }) }
      else pos += kind === 0xc0 || kind === 0xd0 ? 1 : 2
    }
    pos = end
  }
  tempos.sort((a, b) => a.tick - b.tick)
  const seconds = tick => { let s = 0, last = tempos[0]; for (const t of tempos.slice(1)) { if (t.tick >= tick) break; s += (t.tick - last.tick) / division * last.us / 1e6; last = t } return s + (tick - last.tick) / division * last.us / 1e6 }
  const bpm = Math.round(60e6 / (tempos.find(t => t.tick === 0 && t !== tempos[0])?.us ?? tempos.at(-1).us))
  const events = [], open = new Map()
  for (const event of raw.sort((a, b) => a.tick - b.tick || Number(a.on) - Number(b.on))) {
    if (event.channel === 9) { if (event.on && GM_PAD[event.note]) events.push({ t: seconds(event.tick), pad: GM_PAD[event.note] }); continue }
    const key = `${event.channel}:${event.note}`
    if (event.on) open.set(key, event.tick)
    else if (open.has(key)) { const start = open.get(key); open.delete(key); events.push({ t: seconds(start), pad: PIANO, note: event.note, d: Math.max(.05, seconds(event.tick) - seconds(start)) }) }
  }
  const take = makeTake({ name, bpm: Math.max(50, Math.min(180, bpm || 120)), events: events.filter(e => e.pad === PIANO || PAD_IDS.includes(e.pad)), now })
  return { ...take, events: take.events.map(e => ({ ...e, t: Math.round(e.t * 1e4) / 1e4, ...(e.d ? { d: Math.round(e.d * 1e4) / 1e4 } : {}) })) }
}
