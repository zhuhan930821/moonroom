// Sound for the blindfold rehearsal (src/game/blindfold.js): Lin Che's F–G–F loop on the real
// piano samples, a breath before each of Sasa's entries, a soft sung note when she comes in,
// and a warm three-part chord when you lock in with her.
import { audioGraph, preparePiano } from './drums'
import { emitMusic } from './musicBus'
import { BREATH, PERIOD } from '../game/blindfold'

const ROOTS = [36, 41, 48, 53, 60, 65, 72]
const NOTE = { F3: 53, G3: 55, A3: 57, C4: 60, E4: 64, F4: 65, A4: 69, C5: 72 }

export async function createRehearsal() {
  const roots = await preparePiano()
  const { ctx, master } = audioGraph()
  await ctx.resume()
  const bus = ctx.createGain(); bus.gain.value = .9; bus.connect(master)
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
  const sources = []

  function piano(note, at, velocity = .3, length = 1.6) {
    const root = ROOTS.reduce((b, r) => Math.abs(r - note) < Math.abs(b - note) ? r : b)
    const s = ctx.createBufferSource(), g = ctx.createGain()
    s.buffer = roots[root].buffer; s.playbackRate.value = 2 ** ((note - root) / 12)
    g.gain.setValueAtTime(roots[root].gain * velocity, at); g.gain.setTargetAtTime(0, at + length, .4)
    s.connect(g).connect(bus); s.start(at); s.stop(at + length + 2); sources.push(s)
  }
  // Sasa's breath: filtered noise swelling in, then cut as she sings.
  function breath(entry) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = .7
    const from = entry - BREATH
    g.gain.setValueAtTime(0, from); g.gain.linearRampToValueAtTime(.16, entry - .08); g.gain.linearRampToValueAtTime(0, entry)
    f.frequency.setValueAtTime(900, from); f.frequency.linearRampToValueAtTime(1900, entry)
    s.connect(f).connect(g).connect(bus); s.start(from); s.stop(entry + .05); sources.push(s)
  }
  // Her sung note: a soft vowel-like tone (two detuned triangles through a formant filter).
  function voice(at, note = NOTE.C5, level = .09, length = 1.4) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain()
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.4
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(level, at + .12); g.gain.setTargetAtTime(0, at + length, .35)
    for (const d of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 440 * 2 ** ((note - 69) / 12); o.detune.value = d
      const vib = ctx.createOscillator(), depth = ctx.createGain(); vib.frequency.value = 5.2; depth.gain.value = 9
      vib.connect(depth).connect(o.detune); vib.start(at); vib.stop(at + length + 1.5)
      o.connect(f); o.start(at); o.stop(at + length + 1.5); sources.push(o, vib)
    }
    f.connect(g).connect(bus)
  }

  return {
    now: () => ctx.currentTime,
    // Lay out the whole take: the piano loop, and a breath + entry for each cue.
    schedule(cues) {
      const start = cues[0] - 2.4, end = cues[cues.length - 1] + PERIOD
      const loop = [NOTE.F3, NOTE.G3, NOTE.F3, NOTE.C4]
      for (let t = start, i = 0; t < end; t += PERIOD / 4, i++) piano(loop[i % 4], t, i % 4 === 0 ? .26 : .18, PERIOD / 3)
      cues.forEach((t, i) => { breath(t); voice(t, i % 2 ? NOTE.A4 : NOTE.C5) })
    },
    // You came in with her: a warm F major chord from all three, and the room glows.
    lock(at = ctx.currentTime) {
      ;[NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4].forEach((n, i) => piano(n, at + i * .02, .24, 2.6))
      voice(at, NOTE.F4, .05, 2.2)
      emitMusic('piano', NOTE.A4)
    },
    stop() { const t = ctx.currentTime; bus.gain.setTargetAtTime(0, t, .2); setTimeout(() => { sources.forEach(s => { try { s.stop() } catch {} }); bus.disconnect() }, 900) },
  }
}
