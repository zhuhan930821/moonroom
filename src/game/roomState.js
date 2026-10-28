import { activity } from './activity'
// Small shared room state that scene code reads every frame and UI subscribes to.
// Time of day, advanced by <TimeOfDay/>: `time` 0 = deep night, 1 = sunrise, 2 = full day;
// `dawn` (0–1) and `day` (0–1) are its two halves. `timeMode`: 'auto' (sofa cycle) | 'night' | 'dawn' | 'day'.
const state = { lamps: { moon: true, floor: true }, time: 0, dawn: 0, day: 0, timeMode: 'auto', celebrateAt: -1e9, celebration: '' }
const listeners = new Set()

export const roomState = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  // A finished piece lights the castle outside (see SkyBackdrop); `reason` is shown as a toast.
  celebrate(reason) {
    state.celebrateAt = performance.now() / 1000
    state.celebration = reason
    activity.log('castle', reason)
    listeners.forEach(listener => listener())
  },
  setTimeMode(mode) { state.timeMode = mode; listeners.forEach(listener => listener()) },
  toggleLamp(id) {
    state.lamps = { ...state.lamps, [id]: !state.lamps[id] }
    listeners.forEach(listener => listener())
  },
}
// 0 with every lamp on, 1 with every lamp off: the moon takes over the room as lamps go dark.
export const darkness = () => { const values = Object.values(state.lamps); return values.filter(on => !on).length / values.length }
