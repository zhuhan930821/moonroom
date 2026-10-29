// Guitar chords and strum timing. Pure (tested); the sound lives in src/audio/guitar.js.

// Standard tuning, low to high (MIDI): E2 A2 D3 G3 B3 E4.
export const TUNING = [40, 45, 50, 55, 59, 64]

// Open-position shapes as frets per string (low E → high E); null = not played.
const SHAPES = {
  C: [null, 3, 2, 0, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  Am: [null, 0, 2, 2, 1, 0],
  F: [1, 3, 3, 2, 1, 1],
  Dm: [null, null, 0, 2, 3, 1],
  Em: [0, 2, 2, 0, 0, 0],
  E: [0, 2, 2, 1, 0, 0],
  A: [null, 0, 2, 2, 2, 0],
}
export const CHORD_NAMES = Object.keys(SHAPES)
export const CHORD_KEYS = Object.fromEntries(CHORD_NAMES.map((name, i) => [`Digit${i + 1}`, name]))
export const STRING_KEYS = { KeyZ: 0, KeyX: 1, KeyC: 2, KeyV: 3, KeyB: 4, KeyN: 5 }

// MIDI note on each string for a chord (null where the string is skipped).
export const chordNotes = name => (SHAPES[name] || SHAPES.C).map((fret, i) => fret == null ? null : TUNING[i] + fret)

// One strum: which strings sound, when (seconds after the stroke) and how loud.
// Down strokes run low → high across every played string; up strokes run high → low and catch
// only the top four, a little softer, like a real pick coming back up.
export function strumPlan(name, dir = 'down', { gap = .016, jitter = () => 0 } = {}) {
  const notes = chordNotes(name).map((midi, string) => ({ string, midi })).filter(n => n.midi != null)
  const order = dir === 'up' ? notes.slice(-4).reverse() : notes
  return order.map((n, i) => ({ ...n, delay: Math.max(0, i * gap + jitter()), gain: (dir === 'up' ? .72 : 1) * (1 - i * .04) }))
}

export const midiToFreq = midi => 440 * 2 ** ((midi - 69) / 12)
