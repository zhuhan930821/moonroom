// Small shared room state that scene code reads every frame and UI subscribes to.
// `dawn`: 0 = deep night, 1 = sunrise. Advanced every frame by <TimeOfDay/>.
const state = { lamps: { moon: true, floor: true }, dawn: 0 }
const listeners = new Set()

export const roomState = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  toggleLamp(id) {
    state.lamps = { ...state.lamps, [id]: !state.lamps[id] }
    listeners.forEach(listener => listener())
  },
}
// 0 with every lamp on, 1 with every lamp off: the moon takes over the room as lamps go dark.
export const darkness = () => { const values = Object.values(state.lamps); return values.filter(on => !on).length / values.length }
