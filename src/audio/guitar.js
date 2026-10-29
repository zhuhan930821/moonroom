// Plucked-string guitar, synthesized with Karplus–Strong (a noise burst circulating through a
// damped delay line one period long), so there are no samples to download. Each string can ring
// once at a time; re-plucking a string chokes its old note, like a real string.
import { audioGraph } from './drums'
import { emitMusic } from './musicBus'
import { midiToFreq, strumPlan, TUNING } from '../game/guitarChords'
import { pluckSamples } from './pluck'

export const GUITARS = {
  acoustic: { name: '木吉他', brightness: .5, sustain: 3.2, gain: .45 },
  electric: { name: '电吉他', brightness: .28, sustain: 5.5, gain: .32, drive: 2.6 },
}

// Shared with the 3D strings: when each string was last plucked, how hard, and which guitar.
export const guitarState = { guitar: 'acoustic', pluckAt: Array(6).fill(-1e9), amp: Array(6).fill(0), chord: 'C' }
const listeners = new Set()
export const guitarStore = {
  get: () => guitarState,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  set(patch) { Object.assign(guitarState, patch); listeners.forEach(l => l()) },
}

const buffers = new Map()
function bufferFor(ctx, midi, kind) {
  const key = `${kind}:${midi}`
  if (!buffers.has(key)) {
    const g = GUITARS[kind], data = pluckSamples(midiToFreq(midi), ctx.sampleRate, { brightness: g.brightness, sustain: g.sustain, seconds: kind === 'electric' ? 3.4 : 2.6 })
    const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate)
    buffer.copyToChannel(data, 0)
    buffers.set(key, buffer)
  }
  return buffers.get(key)
}

// Per-guitar output chain (built once): acoustic gets a gentle body EQ, electric an amp
// (soft-clipping waveshaper into a speaker-ish low-pass).
const chains = {}
function chainFor(ctx, master, kind) {
  if (chains[kind]) return chains[kind]
  const input = ctx.createGain()
  if (kind === 'electric') {
    const shaper = ctx.createWaveShaper(), drive = GUITARS.electric.drive, curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * drive) / Math.tanh(drive) }
    shaper.curve = curve; shaper.oversample = '2x'
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3200; cab.Q.value = .8
    input.connect(shaper).connect(cab).connect(master)
  } else {
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 180; body.gain.value = 4; body.Q.value = 1.2
    const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 4000; air.gain.value = -3
    input.connect(body).connect(air).connect(master)
  }
  return (chains[kind] = input)
}

const ringing = Array(6).fill(null) // { source, gain } per string
function choke(string, when, ctx) {
  const voice = ringing[string]
  if (!voice) return
  voice.gain.gain.cancelScheduledValues(when); voice.gain.gain.setTargetAtTime(0, when, .012)
  voice.source.stop(when + .1)
  ringing[string] = null
}

function play(string, midi, delay, level) {
  const { ctx, master } = audioGraph()
  if (!master) return
  const kind = guitarState.guitar, when = ctx.currentTime + delay
  choke(string, when, ctx)
  const source = ctx.createBufferSource(), gain = ctx.createGain()
  source.buffer = bufferFor(ctx, midi, kind)
  gain.gain.value = GUITARS[kind].gain * level
  source.connect(gain).connect(chainFor(ctx, master, kind))
  source.start(when)
  const voice = { source, gain }
  ringing[string] = voice
  source.onended = () => { if (ringing[string] === voice) ringing[string] = null }
  // Strings and room lights react when the note actually sounds.
  setTimeout(() => { guitarState.pluckAt[string] = performance.now() / 1000; guitarState.amp[string] = level; emitMusic('guitar', midi) }, delay * 1000)
}

// Builds every chord note for both guitars ahead of time so the first strum has no hitch.
export async function prepareGuitar(chordNotesList) {
  const { ctx } = audioGraph()
  await ctx.resume()
  for (const kind of Object.keys(GUITARS)) for (const notes of chordNotesList) for (const midi of notes) if (midi != null) bufferFor(ctx, midi, kind)
}

export function strum(chord, dir = 'down') {
  const plan = strumPlan(chord, dir, { jitter: () => (Math.random() - .5) * .006 })
  plan.forEach(n => play(n.string, n.midi, n.delay, n.gain))
  return plan
}

// A single string, fretted as the current chord holds it (open if the chord skips it).
export function pluckString(string, notes) {
  play(string, notes[string] ?? TUNING[string], 0, .9)
}

// Palm mute: every ringing string stops quickly.
export function muteAll() {
  const { ctx } = audioGraph()
  for (let s = 0; s < 6; s++) choke(s, ctx.currentTime, ctx)
}

export function setGuitar(kind) { muteAll(); guitarStore.set({ guitar: kind }) }
