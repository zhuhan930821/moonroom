// One authored voyage. The room stays walkable; only the scenery travels.
export const VOYAGE_SECONDS = 32
const KEY = 'moonroom.moon-river-ticket.v1'
const load = () => { try { return globalThis.localStorage?.getItem(KEY) === '1' } catch { return false } }
let state = { phase: 'idle', notes: 0, departedAt: 0, keepsake: load() }
const listeners = new Set()
const emit = () => listeners.forEach(listener => listener())
const set = patch => { state = { ...state, ...patch }; emit() }

export const journey = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  takeTicket() {
    if (state.phase === 'travel') return
    set({ phase: 'ticket', notes: 0, departedAt: 0 })
  },
  pianoNote(now = performance.now() / 1000) {
    if (state.phase !== 'ticket') return
    const notes = state.notes + 1
    set(notes >= 3 ? { phase: 'travel', notes, departedAt: now } : { notes })
  },
  progress(now = performance.now() / 1000) {
    if (state.phase === 'arrived') return 1
    if (state.phase !== 'travel') return 0
    return Math.min(1, Math.max(0, (now - state.departedAt) / VOYAGE_SECONDS))
  },
  tick(now = performance.now() / 1000) {
    if (state.phase === 'travel' && this.progress(now) >= 1) set({ phase: 'arrived' })
  },
  collect() {
    if (state.phase !== 'arrived') return false
    try { globalThis.localStorage?.setItem(KEY, '1') } catch { /* private mode */ }
    set({ keepsake: true })
    return true
  },
  // Fixed review pose for local capture; never used by normal gameplay.
  previewArrival() { set({ phase: 'arrived', notes: 3, departedAt: 0 }) },
}
