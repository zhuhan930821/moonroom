// Low E to high E. Open and muted strings use MIDI note numbers and null.
export const GUITAR_CHORDS = [
  { name: 'C', notes: [null, 48, 52, 55, 60, 64] },
  { name: 'G', notes: [43, 47, 50, 55, 59, 67] },
  { name: 'Am', notes: [null, 45, 52, 57, 60, 64] },
  { name: 'F', notes: [41, 48, 53, 57, 60, 65] },
  { name: 'Dm', notes: [null, null, 50, 57, 62, 65] },
  { name: 'Em', notes: [40, 47, 52, 55, 59, 64] },
  { name: 'E', notes: [40, 47, 52, 56, 59, 64] },
  { name: 'A', notes: [null, 45, 52, 57, 61, 64] },
]

export function strumNotes(chordIndex, upward = false) {
  const chord = GUITAR_CHORDS[chordIndex]
  if (!chord) return []
  const order = upward ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5]
  return order.flatMap((string, step) => chord.notes[string] == null ? [] : [{ note: chord.notes[string], offset: step * .018, string }])
}

export const PICK_STRINGS = [0, 2, 3, 5]
