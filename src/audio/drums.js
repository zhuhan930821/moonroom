import { takeLength } from './takes'

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
let ambientPlaying = false
let volume = .42
let openHat = null // closed hi-hat chokes a ringing open hi-hat

function getContext() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)()
    master = context.createGain()
    master.gain.value = volume
    master.connect(context.destination)
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

function voice(target, ctx, sample, when, level = 1) {
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
  const playing = voice(master, audio, samples[name], at)
  if (name === 'hihatOpen') openHat = playing
  return at
}

export function audioNow() { return getContext().currentTime }

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
  const root = PIANO_ROOTS.reduce((best, r) => Math.abs(r - note) < Math.abs(best - note) ? r : best)
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = roots[root].buffer
  source.playbackRate.value = 2 ** ((note - root) / 12)
  gain.gain.value = roots[root].gain
  source.connect(gain).connect(target)
  source.start(when)
  const release = held => { const at = Math.max(when, held); gain.gain.setTargetAtTime(0, at, .12); source.stop(at + 1.2) }
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
      else voice(bus, audio, samples[event.pad], start + event.t)
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
    else voice(out, offline, samples[event.pad], event.t)
  }
  const rendered = await offline.startRendering()
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

function makeAmbient() {
  const audio = getContext()
  ambientGain = audio.createGain()
  ambientGain.gain.value = 0
  ambientGain.connect(master)
  // Original quiet drone and room air; no external music recording.
  ;[130.81, 196, 261.63].forEach((frequency, i) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.value = [.12, .06, .045][i]
    osc.connect(gain).connect(ambientGain)
    osc.start()
  })
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + (Math.random() * 2 - 1) * .025) * .995
    data[i] = last
  }
  const noise = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  noise.buffer = noiseBuffer
  noise.loop = true
  filter.type = 'lowpass'
  filter.frequency.value = 550
  gain.gain.value = .12
  noise.connect(filter).connect(gain).connect(ambientGain)
  noise.start()
}

export async function setAmbientPlaying(playing) {
  const audio = getContext()
  await audio.resume()
  if (!ambientGain) makeAmbient()
  ambientPlaying = playing
  ambientGain.gain.setTargetAtTime(playing ? .7 : 0, audio.currentTime, .8)
  return ambientPlaying
}

export function setMasterVolume(value) {
  volume = Math.max(0, Math.min(1, value))
  if (master) master.gain.setTargetAtTime(volume, getContext().currentTime, .05)
}

export function getAmbientPlaying() { return ambientPlaying }
