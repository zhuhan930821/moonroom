// Anywhere Door state: which world you're in, the souvenirs you've brought home, and the walk
// bounds / ground height the player controller uses while you're away from the room.
import { generateOffline, ID_SEA, normalize } from './spec.js'
import { generateStrollOffline, normalizeStroll } from '../stroll/spec.js'
import { spend } from '../stroll/wallet.js'
import { activity } from '../game/activity.js'

const KEY = 'moonroom.souvenirs.v1', COINS = 'moonroom.coins.v1'
const load = () => { try { const v = JSON.parse(globalThis.localStorage?.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }

const loadCoins = () => { try { const v = +globalThis.localStorage?.getItem(COINS); return Number.isFinite(v) && globalThis.localStorage?.getItem(COINS) != null ? v : 15 } catch { return 15 } }
const state = { world: null, status: 'idle', note: '', souvenirs: load(), carried: false, visits: 0, coins: loadCoins() }
const listeners = new Set()
const emit = () => listeners.forEach(listener => listener())
const persist = () => { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state.souvenirs)); globalThis.localStorage?.setItem(COINS, String(state.coins)) } catch { /* private mode */ } }

export const worldState = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  // Opens the door: Id 之海, a revisit of a souvenir's world, or a freshly generated one.
  async open({ wish = '', context = '', destination = 'stroll', spec } = {}) {
    state.status = 'opening'; state.note = ''; emit()
    let world
    if (destination === 'idsea') world = { ...ID_SEA }
    else if (spec) world = spec
    else {
      const stroll = destination === 'stroll'
      try {
        const response = await fetch('/__world', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wish, context, kind: stroll ? 'stroll' : 'wild' }) })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.spec) throw new Error(body.error || `门后没有回应（${response.status}）`)
        world = stroll ? normalizeStroll(body.spec) : normalize(body.spec)
        state.note = '由 Claude 实时生成'
      } catch (error) {
        world = stroll ? generateStrollOffline(wish) : generateOffline()
        state.note = `离线生成 · ${error.message}`
      }
    }
    activity.log('world', world.name)
    state.world = world; state.status = 'inside'; state.carried = state.souvenirs.some(s => s.worldId === worldId(world)); state.visits++
    emit()
    return world
  },
  pickUp() {
    if (!state.world || state.carried) return null
    const s = state.world.souvenir
    const item = { id: `souvenir-${Date.now().toString(36)}`, worldId: worldId(state.world), worldName: state.world.name, ...s, world: state.world, at: Date.now() }
    state.souvenirs = [item, ...state.souvenirs]; state.carried = true; persist(); emit()
    activity.log('souvenir', item.name)
    return item
  },
  close() { state.world = null; state.status = 'idle'; emit() },
  addCoins(n) { state.coins += n; persist(); emit() },
  owns(world, good) { return state.souvenirs.some(s => s.worldId === worldId(world) && s.goodId === good.id) },
  // Buying in a stroll shop: pay in moonlight coins, the good goes to the shelf at home.
  buy(world, shop, good) {
    const result = spend(state.coins, good.price, this.owns(world, good))
    if (!result.ok) return result
    state.coins = result.coins
    activity.log('souvenir', good.name)
    state.souvenirs = [{ id: `souvenir-${Date.now().toString(36)}`, worldId: worldId(world), goodId: good.id, worldName: `${world.name} · ${shop.name}`,
      name: good.name, story: good.story, shape: good.shape, color: good.color, glow: .6, world, at: Date.now() }, ...state.souvenirs]
    persist(); emit()
    return result
  },
}
export const worldId = world => world.kind === 'idsea' ? 'idsea' : `w${world.seed}`

// Walk bounds + ground height while in a world (null = in the room; collision.js uses the room).
export const worldPhysics = { active: false, radius: 40, blockers: [], ground: () => 0 }
