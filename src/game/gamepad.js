// Game controllers (Gamepad API, "standard" layout: Xbox / PlayStation / Switch Pro).
// One polling loop reads every connected pad each animation frame, turns button changes into
// events, and keeps the sticks of the first active pad for walking around.

export const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right', 'Home']
const DEADZONE = .18
export const deadzone = v => Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE)

// Walking input for PlayerController (same shape as the touch controls).
export const padInput = { forward: 0, strafe: 0, lookX: 0, lookY: 0, sprint: false, active: false }

const listeners = new Set() // (padIndex, button, pressed) => void
const connListeners = new Set()
const prev = new Map() // padIndex -> boolean[]
let connected = []
let lastUsed = -1e9

export const gamepads = {
  onButton(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  subscribe(listener) { connListeners.add(listener); return () => connListeners.delete(listener) },
  connected: () => connected,
  // A pad was used in the last few seconds (hides mouse hints, lets the sticks walk).
  recentlyUsed: () => performance.now() - lastUsed < 30000,
}

// Pure: which buttons changed between two frames (tested directly).
export function buttonChanges(before, now) {
  const out = []
  now.forEach((pressed, i) => { if (pressed !== !!before?.[i] && BUTTONS[i]) out.push([BUTTONS[i], pressed]) })
  return out
}

function poll() {
  const pads = [...(navigator.getGamepads?.() || [])].filter(p => p && p.connected)
  const ids = pads.map(p => p.index)
  if (ids.join() !== connected.join()) { connected = ids; connListeners.forEach(l => l()) }
  let walker = null
  for (const pad of pads) {
    const now = pad.buttons.map((b, i) => (i === 6 || i === 7) ? b.value > .5 : b.pressed)
    const changes = buttonChanges(prev.get(pad.index), now)
    prev.set(pad.index, now)
    const moving = pad.axes.slice(0, 4).some(a => Math.abs(a) > .3)
    if (changes.length || moving) lastUsed = performance.now()
    for (const [button, pressed] of changes) listeners.forEach(l => l(pad.index, button, pressed))
    if (!walker && (moving || now.some(Boolean))) walker = pad
  }
  const p = walker || pads[0]
  if (p) {
    padInput.strafe = deadzone(p.axes[0] || 0); padInput.forward = -deadzone(p.axes[1] || 0)
    padInput.lookX = deadzone(p.axes[2] || 0); padInput.lookY = deadzone(p.axes[3] || 0)
    padInput.sprint = !!p.buttons[10]?.pressed
  } else Object.assign(padInput, { forward: 0, strafe: 0, lookX: 0, lookY: 0, sprint: false })
  padInput.active = pads.length > 0 && gamepads.recentlyUsed()
  requestAnimationFrame(poll)
}

let started = false
export function startGamepads() {
  if (started || typeof navigator === 'undefined' || !navigator.getGamepads) return
  started = true
  requestAnimationFrame(poll)
}
