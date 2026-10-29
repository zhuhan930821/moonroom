import { audioGraph } from './drums'
import { GUITAR_CHORDS, strumNotes } from './guitarChords'
import { scheduleGuitarNote } from './guitarSynth'
const activeVoices = new Map()
export const guitarVisual = { acoustic: Array(6).fill(-1e9), electric: Array(6).fill(-1e9) }
function replaceString(string, voice) {
  activeVoices.get(string)?.mute()
  activeVoices.set(string, voice)
}
function markString(electric, string, delay = 0) {
  setTimeout(() => { guitarVisual[electric ? 'electric' : 'acoustic'][string] = performance.now() }, delay * 1000)
}
let ampAnalyser
let ampBus
let ampWaveform
function electricOutput(ctx, master) {
  if (!ampBus) {
    ampBus = ctx.createGain()
    ampAnalyser = ctx.createAnalyser()
    ampAnalyser.fftSize = 256
    ampWaveform = new Uint8Array(ampAnalyser.fftSize)
    ampBus.connect(ampAnalyser).connect(master)
  }
  return ampBus
}
export function guitarAmpLevel() {
  if (!ampAnalyser) return 0
  ampAnalyser.getByteTimeDomainData(ampWaveform)
  let power = 0
  for (const sample of ampWaveform) power += ((sample - 128) / 128) ** 2
  return Math.min(1, Math.sqrt(power / ampWaveform.length) * 5)
}
export function muteGuitar() { activeVoices.forEach(voice => voice.mute()); activeVoices.clear() }

export function playGuitarString(chordIndex, stringIndex, strength = .7, electric = false) {
  const midi = GUITAR_CHORDS[chordIndex]?.notes[stringIndex]
  if (midi == null) return false
  const { ctx, master } = audioGraph()
  ctx.resume()
  replaceString(stringIndex, scheduleGuitarNote(ctx, electric ? electricOutput(ctx, master) : master, midi, ctx.currentTime + .005, strength, { electric }))
  markString(electric, stringIndex)
  return midi
}

export function playGuitarNote(midi) {
  const { ctx, master } = audioGraph()
  ctx.resume()
  scheduleGuitarNote(ctx, master, midi, ctx.currentTime + .005)
}

export function playGuitarStrum(chordIndex, upward = false, electric = false) {
  const notes = strumNotes(chordIndex, upward)
  if (!notes.length) return []
  const { ctx, master } = audioGraph()
  ctx.resume()
  const target = electric ? electricOutput(ctx, master) : master
  notes.forEach(({ note, offset, string }, step) => {
    replaceString(string, scheduleGuitarNote(ctx, target, note, ctx.currentTime + .008 + offset, .72 - step * .035, { electric }))
    markString(electric, string, offset)
  })
  return notes
}
