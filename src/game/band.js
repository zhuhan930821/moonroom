// Band mode: up to three controllers, one per instrument, playing together on the little stage.
import { BAND_PARTS, joinBand, leaveBand, switchPart } from './padMaps'

const empty = () => Object.fromEntries(BAND_PARTS.map(part => [part, null]))
let state = { phase: 'off', seats: empty() } // phase: off | lobby | playing
const listeners = new Set()
const set = patch => { state = { ...state, ...patch }; listeners.forEach(l => l()) }

export const band = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  open: () => set({ phase: 'lobby' }),
  close: () => set({ phase: 'off', seats: empty() }),
  join: pad => set({ seats: joinBand(state.seats, pad) }),
  leave: pad => set({ seats: leaveBand(state.seats, pad) }),
  switchPart: (pad, dir) => set({ seats: switchPart(state.seats, pad, dir) }),
  play: () => { if (Object.values(state.seats).some(p => p != null)) set({ phase: 'playing' }) },
  lobby: () => set({ phase: 'lobby' }),
}
