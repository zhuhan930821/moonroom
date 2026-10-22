// Piano session: two rows of the computer keyboard laid out like a DAW "musical typing"
// keyboard. Values are semitones above the current octave's C (default C3 = MIDI 48).
export const PIANO_KEYS = {
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16,
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23, KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28,
}
export const PIANO_LOW = 36   // C2, lowest base after octave shifts
export const PIANO_HIGH = 84  // C6
export const DEFAULT_PIANO_BASE = 48 // C3
// The 3D keyboard shows C3–C6 (37 keys).
export const KEYBOARD_FIRST = 48
export const KEYBOARD_LAST = 84
export const isBlackKey = note => [1, 3, 6, 8, 10].includes(note % 12)
