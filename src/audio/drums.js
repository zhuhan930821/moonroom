import { takeLength } from './takes'
import { scheduleGuitarNote } from './guitarSynth'
import { FLAGS } from '../config/flags'

// All CC0 (Virtuosity Drums, see ASSETS.md). Floor tom reuses the low tom pitched down.
// `peak` is the target level after per-buffer normalisation: the source files range from
// -46 dB to -7 dB peak, so raw gains would make the kit wildly uneven.
const SAMPLES = {
  kick: { url: '/assets/audio/kick.wav', peak: .9 },
  snare: { url: '/assets/audio/snare.wav', peak: .8 },
  hihat: { url: '/assets/audio/hihat.wav', peak: .42 },
  hihatOpen: { url: '/assets/audio/hihat-open.wav', peak: .38 },
  tom1: { url: '/assets/audio/tom-high.wav', peak: .72 },
  tom2: { url: '/assets/audio/tom-low.wav', peak: .72, rate: 1.12 },
  floor: { url: '/assets/audio/tom-low.wav', peak: .8, rate: .84 },
  crash: { url: '/assets/audio/crash.wav', peak: .5 },
  ride: { url: '/assets/audio/ride.wav', peak: .4 },
}
export const DRUM_PADS = Object.keys(SAMPLES)
// Steinway grand (University of Iowa MIS, free for any use), one mezzo-forte sample every
// 5–7 semitones; other notes are resampled from the nearest one.
const PIANO_ROOTS = [36, 41, 48, 53, 60, 65, 72]
let pianoPromise

let context
let samplePromise
let master
let ambientGain
let ambientAirFilter
let ambientPlaying = false
let volume = .42
let openHat = null // closed hi-hat chokes a ringing open hi-hat

function getContext() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)()
    master = context.createGain()
    master.gain.value = volume
    if (FLAGS.demo) {
      // Demo capture runs in slow motion; sound is rebuilt offline from the event log instead.
      const mute = context.createGain(); mute.gain.value = 0
      master.connect(mute).connect(context.destination)
    } else master.connect(context.destination)
  }
  return context
}

function bufferPeak(buffer) {
  let peak = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  }
  return peak || 1
}

export async function prepareAudio() {
  const audio = getContext()
  await audio.resume()
  const urls = [...new Set(Object.values(SAMPLES).map(sample => sample.url))]
  samplePromise ??= Promise.all(urls.map(async url => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Audio load failed: ${url}`)
    const buffer = await audio.decodeAudioData(await response.arrayBuffer())
    return [url, { buffer, peak: bufferPeak(buffer) }]
  })).then(entries => {
    const decoded = Object.fromEntries(entries)
    return Object.fromEntries(Object.entries(SAMPLES).map(([pad, sample]) => {
      const { buffer, peak } = decoded[sample.url]
      return [pad, { buffer, gain: sample.peak / peak, rate: sample.rate || 1 }]
    }))
  })
  return samplePromise
}

// Demo capture: every live voice is logged with its (audio-clock) time for an offline remix.
let demoLog = null
export function startDemoLog() { demoLog = { events: [], origin: getContext().currentTime, ambient: ambientPlaying }; return demoLog.origin }
const logEvent = (ctx, event) => { if (demoLog && ctx === context) demoLog.events.push(event); return event }

function voice(target, ctx, sample, when, level = 1, pad) {
  if (pad) logEvent(ctx, { pad, when, level })
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = sample.buffer
  source.playbackRate.value = sample.rate
  gain.gain.value = sample.gain * level
  source.connect(gain).connect(target)
  source.start(when)
  return { source, gain }
}

// Plays a pad at an audio-clock time (default: now). Returns the time it sounds.
export async function playDrum(name, when) {
  const samples = await prepareAudio()
  const audio = getContext()
  const at = Math.max(audio.currentTime, when ?? audio.currentTime)
  if (name === 'hihat' && openHat) { openHat.gain.gain.setTargetAtTime(0, at, .015); openHat = null }
  const playing = voice(master, audio, samples[name], at, 1, name)
  if (name === 'hihat' && demoLog) demoLog.events.push({ choke: true, when: at })
  if (name === 'hihatOpen') openHat = playing
  return at
}

export function audioNow() { return getContext().currentTime }

// Shared graph for other sound sources (world music) so they follow the master volume.
export function audioGraph() { return { ctx: getContext(), master } }

// Milo's Tiny Band groove (same pattern as Mugo: hi-hat eighths, kick on 1 & 3, snare on 2 & 4),
// scheduled ahead on the audio clock. `onHit(pad, delaySeconds)` lets the caller show and record
// each hit. Returns stop().
export function startGroove(bpm, onHit) {
  const audio = getContext()
  const step = 60 / bpm / 2
  let next = audio.currentTime + .1, n = 0
  const tick = async () => {
    const samples = await prepareAudio()
    while (next < audio.currentTime + .2) {
      const position = n % 8
      const pads = ['hihat', ...(position === 0 || position === 4 ? ['kick'] : []), ...(position === 2 || position === 6 ? ['snare'] : [])]
      for (const pad of pads) { voice(master, audio, samples[pad], next, .85, pad); onHit?.(pad, next - audio.currentTime) }
      next += step; n++
    }
  }
  tick()
  const timer = setInterval(tick, 40)
  return () => clearInterval(timer)
}

// Wind chime: struck metal tubes (inharmonic partials, long decay) for MIDI `notes`, spread
// over ~2 s like a breeze moving through them.
export function playChime(notes) {
  const audio = getContext()
  const times = notes.map((_, i) => audio.currentTime + i * (.18 + Math.random() * .32))
  if (demoLog) demoLog.events.push({ chime: notes, times, when: times[0] })
  chimeVoices(audio, master, notes, times)
}

function chimeVoices(ctx, target, notes, times) {
  notes.forEach((note, i) => {
    const at = times[i]
    const f = 440 * 2 ** ((note - 69) / 12)
    ;[[1, .2], [2.76, .08], [5.4, .04]].forEach(([ratio, level]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.frequency.value = f * ratio
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(level, at + .004)
      gain.gain.exponentialRampToValueAtTime(.0001, at + 2.8 / ratio ** .4)
      osc.connect(gain).connect(target)
      osc.start(at); osc.stop(at + 3)
    })
  })
}

// Soft vinyl surface noise (hiss + sparse pops) under a playing record. Returns stop().
export function startCrackle() {
  const audio = getContext()
  const seconds = 3, buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * .012
    if (Math.random() < .00012) data[i] += (Math.random() < .5 ? -1 : 1) * (.25 + Math.random() * .35)
  }
  const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain()
  source.buffer = buffer; source.loop = true
  filter.type = 'bandpass'; filter.frequency.value = 2400; filter.Q.value = .5
  gain.gain.value = 0; gain.gain.setTargetAtTime(.5, audio.currentTime, .4)
  source.connect(filter).connect(gain).connect(master); source.start()
  return () => { gain.gain.setTargetAtTime(0, audio.currentTime, .15); setTimeout(() => source.stop(), 800) }
}



export async function preparePiano() {
  const audio = getContext()
  await audio.resume()
  pianoPromise ??= Promise.all(PIANO_ROOTS.map(async root => {
    const response = await fetch(`/assets/audio/piano/${root}.mp3`)
    if (!response.ok) throw new Error(`Audio load failed: piano ${root}`)
    const buffer = await audio.decodeAudioData(await response.arrayBuffer())
    return [root, { buffer, gain: .55 / bufferPeak(buffer) }]
  })).then(Object.fromEntries)
  return pianoPromise
}

function pianoVoice(target, ctx, roots, note, when, duration) {
  const logged = logEvent(ctx, { note, when, end: duration != null ? when + duration : null })
  const root = PIANO_ROOTS.reduce((best, r) => Math.abs(r - note) < Math.abs(best - note) ? r : best)
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = roots[root].buffer
  source.playbackRate.value = 2 ** ((note - root) / 12)
  gain.gain.value = roots[root].gain
  source.connect(gain).connect(target)
  source.start(when)
  const release = held => { const at = Math.max(when, held); logged.end = at; gain.gain.setTargetAtTime(0, at, .12); source.stop(at + 1.2) }
  if (duration != null) release(when + duration)
  return release
}

// Live play: returns a release(time?) for key-up. Notes ring until released.
export async function playPiano(note) {
  const roots = await preparePiano()
  const audio = getContext()
  const at = audio.currentTime
  const release = pianoVoice(master, audio, roots, note, at)
  return { at, release: () => { release(audio.currentTime); return audio.currentTime } }
}

function click(ctx, target, when, accent) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = accent ? 1760 : 1180
  gain.gain.setValueAtTime(.0001, when)
  gain.gain.exponentialRampToValueAtTime(accent ? .32 : .2, when + .002)
  gain.gain.exponentialRampToValueAtTime(.0001, when + .05)
  osc.connect(gain).connect(target)
  osc.start(when); osc.stop(when + .06)
}

// Count-in: `beats` clicks starting now (accent on the first).
export function countIn(bpm, beats = 4) {
  const audio = getContext()
  for (let i = 0; i < beats; i++) click(audio, master, audio.currentTime + .05 + i * 60 / bpm, i === 0)
}

// Metronome: schedules clicks a little ahead of the clock until stopped.
export function startMetronome(bpm, onBeat) {
  const audio = getContext()
  const beat = 60 / bpm
  let next = Math.ceil(audio.currentTime / beat) * beat + .05
  let count = 0
  const timer = setInterval(() => {
    while (next < audio.currentTime + .15) {
      click(audio, master, next, count % 4 === 0)
      onBeat?.(count % 4, next)
      next += beat; count++
    }
  }, 25)
  return () => clearInterval(timer)
}

// Plays a take from the start through its own bus, so stopping also silences hits that were
// already scheduled. `onHit(pad)` fires in sync for visuals; loops if asked.
export async function playTake(take, { loop = false, onHit, onEnd, onPosition } = {}) {
  const [samples, roots] = await Promise.all([prepareAudio(), take.events.some(e => e.pad === 'piano') ? preparePiano() : null])
  const audio = getContext()
  const bus = audio.createGain(); bus.connect(master)
  const length = takeLength(take)
  let start = audio.currentTime + .08
  let stopped = false
  let frame
  const timers = []
  const later = (fn, at) => timers.push(setTimeout(fn, Math.max(0, (at - audio.currentTime) * 1000)))
  const schedule = () => {
    for (const event of take.events) {
      if (event.pad === 'piano') pianoVoice(bus, audio, roots, event.note, start + event.t, event.d)
      else if (event.pad === 'guitar') scheduleGuitarNote(audio, bus, event.note, start + event.t, .7, { electric: event.tone === 'electric' }).mute(start + event.t + (event.d || 1.1))
      else voice(bus, audio, samples[event.pad], start + event.t, 1, event.pad)
      later(() => !stopped && onHit?.(event.pad, event.note), start + event.t)
    }
    later(() => {
      if (stopped) return
      if (loop) { start += length; schedule() } else { stop(); onEnd?.() }
    }, start + length - (loop ? .1 : 0))
  }
  const stop = () => {
    if (stopped) return
    stopped = true
    timers.forEach(clearTimeout); cancelAnimationFrame(frame)
    bus.gain.setTargetAtTime(0, audio.currentTime, .03)
    setTimeout(() => bus.disconnect(), 400)
  }
  schedule()
  const tick = () => { if (stopped) return; onPosition?.(Math.max(0, (audio.currentTime - start) % length) / length); frame = requestAnimationFrame(tick) }
  if (onPosition) tick()
  return stop
}

// Offline render of a take to a 16-bit stereo WAV blob.
export async function renderTakeWav(take) {
  const [samples, roots] = await Promise.all([prepareAudio(), take.events.some(e => e.pad === 'piano') ? preparePiano() : null])
  const rate = 44100
  const length = takeLength(take) + 2.5 // cymbal tails
  const offline = new OfflineAudioContext(2, Math.ceil(length * rate), rate)
  const out = offline.createGain(); out.gain.value = .85; out.connect(offline.destination)
  for (const event of take.events) {
    if (event.pad === 'piano') pianoVoice(out, offline, roots, event.note, event.t, event.d)
    else if (event.pad === 'guitar') scheduleGuitarNote(offline, out, event.note, event.t, .7, { electric: event.tone === 'electric' }).mute(event.t + (event.d || 1.1))
    else voice(out, offline, samples[event.pad], event.t)
  }
  return wavBlob(await offline.startRendering())
}

function wavBlob(rendered) {
  const rate = rendered.sampleRate
  const frames = rendered.length
  const view = new DataView(new ArrayBuffer(44 + frames * 4))
  const text = (offset, value) => [...value].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, 36 + frames * 4, true); text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, frames * 4, true)
  const left = rendered.getChannelData(0), right = rendered.getChannelData(1)
  for (let i = 0, o = 44; i < frames; i++, o += 4) {
    view.setInt16(o, Math.max(-1, Math.min(1, left[i])) * 0x7fff, true)
    view.setInt16(o + 2, Math.max(-1, Math.min(1, right[i])) * 0x7fff, true)
  }
  return new Blob([view], { type: 'audio/wav' })
}

function makeAmbient() { ambientGain = buildAmbient(getContext(), master) }

export function setTimeOfDayAudio(dawn, day = 0) {
  if (!ambientAirFilter) return
  ambientAirFilter.frequency.setTargetAtTime(260 + 180 * Math.max(dawn, day), getContext().currentTime, 2)
}

function buildAmbient(audio, target) {
  const ambientGain = audio.createGain()
  ambientGain.gain.value = 0
  ambientGain.connect(target)
  // Two soft suspended voicings drift through one another over ~45 seconds.
  // Low levels leave headroom for the player's drums, piano and guitar.
  const swell = audio.createOscillator()
  swell.type = 'sine'
  swell.frequency.value = 1 / 45
  for (const [frequencies, phase] of [
    [[110, 164.81, 220, 246.94], 1],     // Am(add9)
    [[87.31, 130.81, 174.61, 261.63], -1], // Fmaj7
  ]) {
    const chord = audio.createGain()
    chord.gain.value = .48
    const motion = audio.createGain()
    motion.gain.value = .25 * phase
    swell.connect(motion).connect(chord.gain)
    chord.connect(ambientGain)
    frequencies.forEach((frequency, index) => {
      const osc = audio.createOscillator()
      const level = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      level.gain.value = index === 0 ? .018 : .008
      osc.connect(level).connect(chord)
      osc.start()
    })
  }
  swell.start()
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0, seed = 137
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    last = (last + (seed / 0xffffffff * 2 - 1) * .008) * .992
    data[i] = last
  }
  const noise = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  noise.buffer = noiseBuffer
  noise.loop = true
  filter.type = 'lowpass'
  filter.frequency.value = 260
  gain.gain.value = .045
  noise.connect(filter).connect(gain).connect(ambientGain)
  noise.start()
  if (audio === context) ambientAirFilter = filter
  return ambientGain
}

export async function setAmbientPlaying(playing) {
  const audio = getContext()
  await audio.resume()
  if (!ambientGain) makeAmbient()
  ambientPlaying = playing
  ambientGain.gain.setTargetAtTime(playing ? .7 : 0, audio.currentTime, .8)
  if (demoLog) demoLog.events.push({ ambient: playing, when: audio.currentTime })
  return ambientPlaying
}

export function setMasterVolume(value) {
  volume = Math.max(0, Math.min(1, value))
  if (master) master.gain.setTargetAtTime(volume, getContext().currentTime, .05)
}

export function getAmbientPlaying() { return ambientPlaying }

// Demo capture: re-render everything that sounded since startDemoLog() into a WAV,
// starting at the log origin. Times are in the (possibly slowed) audio clock.
export async function renderDemoLog(seconds) {
  const [samples, roots] = await Promise.all([prepareAudio(), preparePiano()])
  const rate = 44100
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate)
  const out = offline.createGain(); out.gain.value = volume; out.connect(offline.destination)
  const origin = demoLog.origin
  const ambient = buildAmbient(offline, out)
  if (demoLog.ambient) ambient.gain.setValueAtTime(.7, 0)
  for (const e of demoLog.events.filter(e => e.ambient != null)) ambient.gain.setTargetAtTime(e.ambient ? .7 : 0, Math.max(0, e.when - origin), .8)
  let openHat = null
  for (const e of [...demoLog.events].sort((a, b) => a.when - b.when)) {
    const at = Math.max(0, e.when - origin)
    if (e.choke && openHat) { openHat.gain.gain.setTargetAtTime(0, at, .015); openHat = null }
    else if (e.pad) { const v = voice(out, offline, samples[e.pad], at, e.level); if (e.pad === 'hihatOpen') openHat = v }
    else if (e.note != null) pianoVoice(out, offline, roots, e.note, at, (e.end ?? e.when + 2) - e.when)
    else if (e.chime) chimeVoices(offline, out, e.chime, e.times.map(time => Math.max(0, time - origin)))
  }
  const rendered = await offline.startRendering()
  return wavBlob(rendered)
}
