// The prompt the in-world HUD is currently showing ("看看「…」", "回到房间"…), so touch controls
// can label (and enable) their interact button the same way the E prompt reads on desktop.
let prompt = null
const listeners = new Set()
export const worldPrompt = {
  get: () => prompt,
  set(next) { if (next === prompt) return; prompt = next; listeners.forEach(l => l()) },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
}
