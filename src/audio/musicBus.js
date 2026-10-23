// "The room breathes with the music": every drum hit or piano note (live or played back)
// stamps a time here; scene components read decaying energies inside useFrame, so reacting
// to music never re-renders React.
import * as THREE from 'three'

const CHANNEL = { kick: 'kick', snare: 'snare', hihat: 'hat', hihatOpen: 'hat', tom1: 'tom', tom2: 'tom', floor: 'tom', crash: 'cymbal', ride: 'cymbal', piano: 'piano' }
const last = { kick: -1e9, snare: -1e9, hat: -1e9, tom: -1e9, cymbal: -1e9, piano: -1e9, any: -1e9 }
export const pianoColor = new THREE.Color('#ffd0a0')
const LOW = new THREE.Color('#ffa257'), HIGH = new THREE.Color('#9cc6ff')

// Loudness (for the sleeping fox): heavy hits add more, everything decays over a few seconds.
const LOUD = { kick: .5, snare: .35, cymbal: .8, tom: .3, hat: .1, piano: .12 }
let loudLevel = 0, loudAt = 0
const recent = [] // emit times for activity()

export function emitMusic(pad, note) {
  const now = performance.now() / 1000
  const channel = CHANNEL[pad]
  if (!channel) return
  last[channel] = now
  last.any = now
  loudLevel = loudness() + LOUD[channel]; loudAt = now
  recent.push(now); while (recent.length && recent[0] < now - 8) recent.shift()
  if (pad === 'piano' && Number.isFinite(note)) pianoColor.copy(LOW).lerpHSL(HIGH, THREE.MathUtils.clamp((note - 40) / 44, 0, 1))
}

// 1 right after a hit on `channel`, falling off exponentially at `rate` per second.
export function energy(channel, rate = 4) {
  return Math.exp(-Math.max(0, performance.now() / 1000 - last[channel]) * rate)
}

// Seconds since the last hit on `channel` (for travelling effects).
export function age(channel) { return performance.now() / 1000 - last[channel] }

// How loud the room has been lately (sum of decaying hit weights; ~6 is "a loud fill").
export function loudness() { return loudLevel * Math.exp(-(performance.now() / 1000 - loudAt) * .45) }
// Notes per second over the last `seconds` (music is "playing" above ~0.5).
export function activity(seconds = 6) {
  const now = performance.now() / 1000
  return recent.filter(t => t > now - seconds).length / seconds
}
