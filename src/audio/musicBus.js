// "The room breathes with the music": every drum hit or piano note (live or played back)
// stamps a time here; scene components read decaying energies inside useFrame, so reacting
// to music never re-renders React.
import * as THREE from 'three'

const CHANNEL = { kick: 'kick', snare: 'snare', hihat: 'hat', hihatOpen: 'hat', tom1: 'tom', tom2: 'tom', floor: 'tom', crash: 'cymbal', ride: 'cymbal', piano: 'piano' }
const last = { kick: -1e9, snare: -1e9, hat: -1e9, tom: -1e9, cymbal: -1e9, piano: -1e9, any: -1e9 }
export const pianoColor = new THREE.Color('#ffd0a0')
const LOW = new THREE.Color('#ffa257'), HIGH = new THREE.Color('#9cc6ff')

export function emitMusic(pad, note) {
  const now = performance.now() / 1000
  const channel = CHANNEL[pad]
  if (!channel) return
  last[channel] = now
  last.any = now
  if (pad === 'piano' && Number.isFinite(note)) pianoColor.copy(LOW).lerpHSL(HIGH, THREE.MathUtils.clamp((note - 40) / 44, 0, 1))
}

// 1 right after a hit on `channel`, falling off exponentially at `rate` per second.
export function energy(channel, rate = 4) {
  return Math.exp(-Math.max(0, performance.now() / 1000 - last[channel]) * rate)
}

// Seconds since the last hit on `channel` (for travelling effects).
export function age(channel) { return performance.now() / 1000 - last[channel] }
