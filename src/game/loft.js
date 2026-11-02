// The loft over the left wall: you pull yourself up a knotted rope (a little rhythm game),
// walk the deck, look through a telescope at the sky, lie under a skylight, and find the
// band's rehearsal corner. Positions are room metres (see LoftExtension / the architecture GLB:
// deck top y 4.29, x -9.79…-6.11, z -6.49…7.83).

export const LOFT_Y = 4.29
// Where you can walk up there: inside the plant line along the rail and clear of the back wall.
export const LOFT_BOUNDS = { minX: -9.45, maxX: -6.9, minZ: -6.15, maxZ: 7.45 }
export const ROPE = { x: -6.02, z: -5.9, top: 7.6 }                 // hangs from a ceiling beam past the rail
export const ROPE_STAND = [-5.35, -5.9]                              // where you stand to climb (ground)
export const LOFT_ARRIVAL = { position: [-7.3, -5.75], yaw: -Math.PI / 2 } // step off facing the room
export const TELESCOPE = { position: [-8.05, -5.3], aim: [-3.6, 7.1, -9.6] }
export const MAT = { position: [-8.35, 3.3] }                         // stargazing mat under the skylight
export const SKYLIGHT = { position: [-8.1, 2.9], size: [2.6, 1.7] }
export const REHEARSAL = { position: [-8.3, 6.3] }
export const LOFT_COLLIDERS = [
  { minX: -8.45, maxX: -7.65, minZ: -5.7, maxZ: -4.9 },   // telescope tripod
  { minX: -9.6, maxX: -8.9, minZ: 6.55, maxZ: 7.4 },      // little amp in the band corner
]

export const insideLoft = (x, z, r = 0) => x - r >= LOFT_BOUNDS.minX && x + r <= LOFT_BOUNDS.maxX && z - r >= LOFT_BOUNDS.minZ && z + r <= LOFT_BOUNDS.maxZ
  && !LOFT_COLLIDERS.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ)

// ---------- rope climb: alternate hands in a steady rhythm ----------
// Same hand twice slips you back; mashing gains little; a steady 0.25–0.7 s rhythm gains most.
// Stop pulling and you slowly slide down. Pure, so tests cover the feel.
export const newClimb = () => ({ progress: 0, hand: null, at: -10, streak: 0, note: '' })
export function pull(climb, hand, t) {
  const gap = t - climb.at
  if (hand === climb.hand) return { ...climb, progress: Math.max(0, climb.progress - .025), at: t, streak: 0, note: '换手！' }
  let gain = .052, note = ''
  if (gap < .14) { gain = .018; note = '慢一点，稳住' }
  else if (gap > 1.1) { gain = .032 }
  const streak = gap <= 1.1 ? climb.streak + 1 : 1
  if (streak >= 6) { gain *= 1.25; note = note || '节奏很好！' }
  return { ...climb, progress: Math.min(1, climb.progress + gain), hand, at: t, streak, note }
}
export function slide(climb, t, dt) {
  if (climb.progress >= 1 || t - climb.at < 1.3) return climb
  return { ...climb, progress: Math.max(0, climb.progress - dt * .07), streak: 0, note: climb.progress > .02 ? '手松了，在往下滑…' : '' }
}

// ---------- shared state ----------
let state = { onLoft: false }
export const climbState = { current: newClimb() } // read every frame by the camera; no re-renders
const listeners = new Set()
export const loft = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  set(onLoft) { if (state.onLoft !== onLoft) { state = { onLoft }; listeners.forEach(l => l()) } },
}
