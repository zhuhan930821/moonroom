import { pluckSamples } from './pluck'

const frequency = midi => 440 * 2 ** ((midi - 69) / 12)
const bufferCache = new Map()

// A short Karplus–Strong string. Fresh buffers allow overlapping notes.
export function scheduleGuitarNote(ctx, target, midi, when, strength = .7, options = {}) {
  const rate = ctx.sampleRate
  const duration = options.electric ? 5.5 : 3.4
  const key = `${rate}:${midi}:${options.electric ? 'electric' : 'acoustic'}`
  let buffer = bufferCache.get(key)
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.ceil(rate * duration), rate)
    buffer.copyToChannel(pluckSamples(frequency(midi), rate, {
      brightness: options.electric ? .28 : .5, sustain: options.electric ? 5.5 : 3.2, seconds: duration,
    }), 0)
    bufferCache.set(key, buffer)
  }
  const source = ctx.createBufferSource()
  const tone = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  const drive = options.electric ? ctx.createWaveShaper() : null
  source.buffer = buffer
  tone.type = 'lowpass'; tone.frequency.value = options.electric ? 2700 : 3400
  if (drive) {
    // Gentle soft clipping, not a harsh fuzz pedal.
    drive.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh(((i / 1023) * 2 - 1) * 2.2))
    drive.oversample = '2x'
  }
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(strength * (options.electric ? .12 : .22), when + .008)
  gain.gain.setValueAtTime(strength * (options.electric ? .12 : .22), when + duration - .08)
  gain.gain.exponentialRampToValueAtTime(.0001, when + duration)
  if (drive) source.connect(drive).connect(tone).connect(gain).connect(target)
  else source.connect(tone).connect(gain).connect(target)
  source.start(when)
  source.stop(when + duration)
  source.onended = () => { source.disconnect(); drive?.disconnect(); tone.disconnect(); gain.disconnect() }
  return { mute: (at = ctx.currentTime) => {
    const time = Math.max(when + .02, at)
    if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(time)
    else { gain.gain.cancelScheduledValues(time); gain.gain.setValueAtTime(strength * .06, time) }
    gain.gain.exponentialRampToValueAtTime(.0001, time + .085)
  } }
}
