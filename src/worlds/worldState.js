// Anywhere Door state: which world you're in, the souvenirs you've brought home, and the walk
// bounds / ground height the player controller uses while you're away from the room.
import { generateOffline, ID_SEA, normalize } from './spec.js'

const KEY = 'moonroom.souvenirs.v1'
const load = () => { try { const v = JSON.parse(globalThis.localStorage?.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }

const state = { world: null, status: 'idle', note: '', souvenirs: load(), carried: false, visits: 0 }
const listeners = new Set()
const emit = () => listeners.forEach(listener => listener())
const persist = () => { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state.souvenirs)) } catch { /* private mode */ } }

export const worldState = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  // Opens the door: Id 之海, a revisit of a souvenir's world, or a freshly generated one.
  async open({ wish = '', context = '', destination = 'new', spec } = {}) {
    state.status = 'opening'; state.note = ''; emit()
    let world
    if (destination === 'idsea') world = { ...ID_SEA }
    else if (spec) world = spec
    else {
      try {
        const response = await fetch('/__world', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wish, context }) })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.spec) throw new Error(body.error || `门后没有回应（${response.status}）`)
        world = normalize(body.spec)
        state.note = '由 Claude 实时生成'
      } catch (error) {
        world = generateOffline()
        state.note = `离线生成 · ${error.message}`
      }
    }
    state.world = world; state.status = 'inside'; state.carried = state.souvenirs.some(s => s.worldId === worldId(world)); state.visits++
    emit()
    return world
  },
  pickUp() {
    if (!state.world || state.carried) return null
    const s = state.world.souvenir
    const item = { id: `souvenir-${Date.now().toString(36)}`, worldId: worldId(state.world), worldName: state.world.name, ...s, world: state.world, at: Date.now() }
    state.souvenirs = [item, ...state.souvenirs]; state.carried = true; persist(); emit()
    return item
  },
  close() { state.world = null; state.status = 'idle'; emit() },
}
export const worldId = world => world.kind === 'idsea' ? 'idsea' : `w${world.seed}`

// Walk bounds + ground height while in a world (null = in the room; collision.js uses the room).
export const worldPhysics = { active: false, radius: 40, blockers: [], ground: () => 0 }
