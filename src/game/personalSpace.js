// Small, local-only memories for the bed and writing chair.
const KEY = 'moonroom-personal-space-v1'
const empty = { note: '', dreams: [] }
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    return value && typeof value === 'object' ? {
      note: typeof value.note === 'string' ? value.note : '',
      dreams: Array.isArray(value.dreams) ? value.dreams.slice(0, 20) : [],
    } : { ...empty }
  } catch { return { ...empty } }
}
let snapshot = read()
const listeners = new Set()
export const personalSpace = {
  get: () => snapshot,
  subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
  update: patch => {
    const next = { ...snapshot, ...patch }
    try { localStorage.setItem(KEY, JSON.stringify(next)); snapshot = next; listeners.forEach(listener => listener()); return true }
    catch { return false }
  },
}
