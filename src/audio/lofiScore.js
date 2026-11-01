// The room's background music: a lazy lofi beat under a Ghibli-ish piano, written bar by bar.
// Pure (no Web Audio) so the harmony, melody and groove are tested in Node; src/audio/lofi.js
// turns these events into sound.

export const BPM = 72
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
export const SWING = .62 // the off-beat 8th lands 62% of the way through the beat: lazy, laid back

// F major, eight bars: Fmaj7 Em7 Dm9 Cmaj7 | B♭maj7 Am7 Gm9 C7sus4. Voicings sit in the
// middle of the piano (warm, audible on phone speakers); `bass` is the left hand.
export const PROGRESSION = [
  { name: 'Fmaj7', bass: 41, voicing: [57, 60, 64, 69] },
  { name: 'Em7', bass: 40, voicing: [55, 59, 62, 67] },
  { name: 'Dm9', bass: 38, voicing: [53, 57, 60, 64] },
  { name: 'Cmaj7', bass: 36, voicing: [52, 55, 59, 64] },
  { name: 'B♭maj7', bass: 46, voicing: [57, 58, 62, 65] },
  { name: 'Am7', bass: 45, voicing: [55, 57, 60, 64] },
  { name: 'Gm9', bass: 43, voicing: [53, 57, 58, 62] },
  { name: 'C7sus4', bass: 48, voicing: [53, 55, 58, 62] },
]
// Melody notes: F major pentatonic (F G A C D) over two octaves, kept above the chords.
export const MELODY_SCALE = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86]

export function rng(seed = 1) {
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 }
}

// Time (seconds from the bar start) of the n-th 8th note, with swing on the off-beats.
export const eighth = n => Math.floor(n / 2) * BEAT + (n % 2 ? BEAT * SWING : 0)

// Everything that sounds in bar `index` (0-based since the music started).
// `density` (0–1) thins the melody and drums at night. Returns [{ kind, at, ... }].
export function composeBar(index, random, { density = .7, last = MELODY_SCALE[3] } = {}) {
  const chord = PROGRESSION[index % PROGRESSION.length]
  const events = []
  const humanize = () => (random() - .5) * .018
  // Comping: a light touch, two or three notes at a time, in a rhythm that changes every bar
  // (never the same pattern twice running), so the chords talk instead of thumping on beat 1.
  const pattern = pickPattern(index, random)
  const pick = size => voiceSubset(chord.voicing, size, random)
  const vel = base => base * (.8 + random() * .4)
  const play = (notes, at, base, length, roll = .03) => notes.forEach((n, i) => events.push({ kind: 'piano', at: Math.max(0, at + i * roll + humanize()), note: n, velocity: vel(base), length }))
  const bassAt = pattern === 'late' || pattern === 'float' ? eighth(1) : 0
  if (pattern !== 'float' || random() < .5) play([chord.bass], bassAt, .26, BAR * .9)
  if (pattern === 'lazy') play(pick(2), eighth(1), .17, BAR * .8)
  else if (pattern === 'push') play(pick(3), eighth(3), .16, BEAT * 2.6)
  else if (pattern === 'charleston') { play(pick(2), 0, .16, BEAT * 1.3); play(pick(2), eighth(3), .13, BEAT * 2) }
  else if (pattern === 'broken') pick(3).sort((x, y) => x - y).forEach((n, i) => play([n], eighth([2, 3, 5][i]), .15, BAR * .6, 0))
  else if (pattern === 'late') play(pick(2), eighth(2), .16, BAR * .7, .06)
  else if (pattern === 'float') play(pick(2).map((n, i) => i ? n + 12 : n), eighth(4), .13, BEAT * 3, .09)
  else if (pattern === 'answer') { play(pick(2), 0, .15, BEAT * 1.6); play(pick(1), eighth(6), .12, BEAT * 1.2) }

  // Melody: a few notes per bar, mostly stepwise, resting often; every 4th bar ends a phrase
  // on a long chord tone.
  let note = last
  const slots = [0, 2, 3, 4, 5, 6, 7]
  const phraseEnd = index % 4 === 3
  for (const slot of slots) {
    if (random() > density * (slot % 2 ? .35 : .55)) continue
    const i = Math.max(0, MELODY_SCALE.indexOf(nearest(note)))
    const step = Math.round((random() - .5) * 3.2)
    note = MELODY_SCALE[Math.max(0, Math.min(MELODY_SCALE.length - 1, i + step))]
    events.push({ kind: 'melody', at: eighth(slot) + humanize(), note, velocity: .24 + random() * .1, length: BEAT * (slot % 2 ? .8 : 1.4) })
    if (phraseEnd && slot >= 4) break
  }
  if (phraseEnd) {
    const tone = nearest(chord.voicing[chord.voicing.length - 1] + 12)
    events.push({ kind: 'melody', at: eighth(6), note: tone, velocity: .22, length: BEAT * 2.4 })
    note = tone
  }

  // Drums: in after the first two bars; a two-bar breather every 16 bars.
  const drumsOn = index >= 2 && index % 16 < 14
  if (drumsOn) {
    events.push({ kind: 'kick', at: 0 })
    if (random() < .55) events.push({ kind: 'kick', at: eighth(3) })
    events.push({ kind: 'kick', at: eighth(4) + (random() < .3 ? BEAT * (1 - SWING) : 0) })
    events.push({ kind: 'snare', at: BEAT + humanize() })
    events.push({ kind: 'snare', at: BEAT * 3 + humanize() })
    for (let n = 0; n < 8; n++) if (random() < .55 + density * .4) events.push({ kind: 'hat', at: eighth(n) + humanize(), velocity: n % 2 ? .55 : .85 })
  }
  return { events: events.sort((a, b) => a.at - b.at), last: note, chord: chord.name }
}

// Comping rhythms (8th-note slots, swung): see composeBar. Weighted, and never repeated back to back.
const PATTERNS = [['lazy', 3], ['push', 2], ['charleston', 2], ['broken', 2], ['late', 2], ['float', 1], ['answer', 2]]
let lastPattern = null
export function pickPattern(index, random) {
  const options = PATTERNS.filter(([name]) => name !== lastPattern)
  let roll = random() * options.reduce((sum, [, w]) => sum + w, 0)
  for (const [name, w] of options) { roll -= w; if (roll <= 0) return (lastPattern = name) }
  return (lastPattern = options[0][0])
}
// `size` notes from a voicing, always keeping at least one inner (colour) tone.
export function voiceSubset(voicing, size, random) {
  const inner = voicing[1 + Math.floor(random() * 2)]
  const rest = voicing.filter(n => n !== inner).sort(() => random() - .5)
  return [inner, ...rest].slice(0, size).sort((x, y) => x - y)
}

function nearest(note) {
  return MELODY_SCALE.reduce((best, n) => Math.abs(n - note) < Math.abs(best - note) ? n : best)
}
