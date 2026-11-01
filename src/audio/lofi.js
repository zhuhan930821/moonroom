// Plays src/audio/lofiScore.js: the real piano samples (warm, slightly wobbly, through a room
// reverb), a soft synthesized lofi kit, and a bed of vinyl hiss. Works on a live AudioContext
// (scheduled a little ahead on a timer) or an OfflineAudioContext (scheduled all at once).
import { BAR, composeBar, rng } from './lofiScore'

const PIANO_ROOTS = [36, 41, 48, 53, 60, 65, 72]

function impulse(ctx, seconds = 2.6, decay = 3.2) {
  const length = Math.round(ctx.sampleRate * seconds), buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c), r = rng(c + 7)
    for (let i = 0; i < length; i++) data[i] = (r() * 2 - 1) * (1 - i / length) ** decay
  }
  return buffer
}

function noiseBuffer(ctx, seconds, fill) {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0), r = rng(seconds * 1000)
  for (let i = 0; i < data.length; i++) data[i] = fill(r, i)
  return buffer
}

// roots: { [midi]: { buffer, gain } } from preparePiano(). Returns { out, schedule(until), setTone(), stop() }.
export function createLofi(ctx, target, roots, { seed = Date.now() % 100000 } = {}) {
  const out = ctx.createGain(); out.gain.value = 0
  // Warm, dark top end: the whole bed sits behind a low-pass the time of day opens and closes.
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3600; tone.Q.value = .4
  out.connect(tone).connect(target)
  const reverb = ctx.createConvolver(); reverb.buffer = impulse(ctx)
  const wet = ctx.createGain(); wet.gain.value = .32
  reverb.connect(wet).connect(out)

  // Piano bus with tape wow: one slow LFO bends every voice a few cents together.
  const piano = ctx.createGain(); piano.gain.value = .9
  const pianoTone = ctx.createBiquadFilter(); pianoTone.type = 'lowpass'; pianoTone.frequency.value = 2600
  piano.connect(pianoTone); pianoTone.connect(out); pianoTone.connect(reverb)
  const wow = ctx.createOscillator(), wowDepth = ctx.createGain()
  wow.frequency.value = .45; wowDepth.gain.value = 7 // cents
  wow.connect(wowDepth); wow.start()

  const drums = ctx.createGain(); drums.gain.value = .5
  const drumTone = ctx.createBiquadFilter(); drumTone.type = 'lowpass'; drumTone.frequency.value = 5200
  drums.connect(drumTone).connect(out)
  const room = ctx.createGain(); room.gain.value = .12; drumTone.connect(room).connect(reverb)

  // Vinyl hiss with the odd pop, always under the music.
  const hiss = ctx.createBufferSource(), hissFilter = ctx.createBiquadFilter(), hissGain = ctx.createGain()
  hiss.buffer = noiseBuffer(ctx, 3.1, r => (r() * 2 - 1) * .01 + (r() < .00008 ? (r() < .5 ? -1 : 1) * (.15 + r() * .2) : 0))
  hiss.loop = true; hissFilter.type = 'bandpass'; hissFilter.frequency.value = 2200; hissFilter.Q.value = .6; hissGain.gain.value = .45
  hiss.connect(hissFilter).connect(hissGain).connect(out); hiss.start()

  const white = noiseBuffer(ctx, 1, r => r() * 2 - 1)

  function pianoNote(note, at, velocity, length, bus = piano) {
    const root = PIANO_ROOTS.reduce((best, r) => Math.abs(r - note) < Math.abs(best - note) ? r : best)
    const sample = roots[root]
    if (!sample) return
    const source = ctx.createBufferSource(), gain = ctx.createGain()
    source.buffer = sample.buffer
    source.playbackRate.value = 2 ** ((note - root) / 12)
    wowDepth.connect(source.detune)
    gain.gain.setValueAtTime(sample.gain * velocity, at)
    gain.gain.setTargetAtTime(0, at + length, .35)
    source.connect(gain).connect(bus)
    source.start(at); source.stop(at + length + 2)
  }
  function kick(at) {
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.frequency.setValueAtTime(120, at); osc.frequency.exponentialRampToValueAtTime(58, at + .1) // a round, soft thump that phone speakers can still carry
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.3, at + .008); gain.gain.exponentialRampToValueAtTime(.001, at + .3)
    osc.connect(gain).connect(drums); osc.start(at); osc.stop(at + .35)
  }
  function snare(at) {
    // brushed: a noise swish through a band-pass plus a faint low body
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
    source.buffer = white; filter.type = 'bandpass'; filter.frequency.value = 1900; filter.Q.value = .8
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.28, at + .012); gain.gain.exponentialRampToValueAtTime(.001, at + .24)
    source.connect(filter).connect(gain).connect(drums); source.start(at, Math.random() * .5); source.stop(at + .26)
    const body = ctx.createOscillator(), bodyGain = ctx.createGain()
    body.frequency.value = 185; bodyGain.gain.setValueAtTime(.12, at); bodyGain.gain.exponentialRampToValueAtTime(.001, at + .09)
    body.connect(bodyGain).connect(drums); body.start(at); body.stop(at + .1)
  }
  function hat(at, velocity = 1) {
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
    source.buffer = white; filter.type = 'highpass'; filter.frequency.value = 7200
    gain.gain.setValueAtTime(.07 * velocity, at); gain.gain.exponentialRampToValueAtTime(.001, at + .05)
    source.connect(filter).connect(gain).connect(drums); source.start(at, Math.random() * .5); source.stop(at + .06)
  }

  const random = rng(seed)
  let bar = 0, barStart = ctx.currentTime + .25, last, density = .7
  // Schedule every bar that starts before `until` (audio-clock seconds).
  function schedule(until) {
    while (barStart < until) {
      const composed = composeBar(bar, random, { density, last })
      last = composed.last
      for (const e of composed.events) {
        const at = barStart + Math.max(0, e.at)
        if (e.kind === 'piano') pianoNote(e.note, at, e.velocity, e.length)
        else if (e.kind === 'melody') pianoNote(e.note, at, e.velocity, e.length)
        else if (e.kind === 'kick') kick(at)
        else if (e.kind === 'snare') snare(at)
        else if (e.kind === 'hat') hat(at, e.velocity)
      }
      bar += 1; barStart += BAR
    }
  }
  // brightness 0 (night) – 1 (day): darker, sparser at night.
  function setTone(brightness) {
    density = .5 + brightness * .35
    tone.frequency.setTargetAtTime(2800 + brightness * 2600, ctx.currentTime, 2)
  }
  function stop() { try { hiss.stop(); wow.stop() } catch {} out.disconnect() }
  return { out, schedule, setTone, stop }
}
