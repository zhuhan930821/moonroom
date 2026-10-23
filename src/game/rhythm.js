// Rhythm challenge: any drum take becomes a chart. Pure logic (tested); the overlay draws it.
import { PIANO } from '../audio/takes.js'

export const WINDOW = { perfect: .05, good: .11 } // seconds either side of the note
export const POINTS = { perfect: 300, good: 100 }

export function startRun(take, startAt) {
  const notes = take.events.filter(event => event.pad !== PIANO).map((event, id) => ({ id, pad: event.pad, t: startAt + event.t, result: null }))
  return { notes, score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, miss: 0 }, end: (notes.at(-1)?.t ?? startAt) + 1.2 }
}

// A strike on `pad` at time `t`: judges the nearest open note on that pad within the good window.
export function judge(run, pad, t) {
  let best = null
  for (const note of run.notes) {
    if (note.result || note.pad !== pad) continue
    const dt = Math.abs(t - note.t)
    if (dt <= WINDOW.good && (!best || dt < Math.abs(t - best.t))) best = note
  }
  if (!best) return { result: 'stray' }
  const result = Math.abs(t - best.t) <= WINDOW.perfect ? 'perfect' : 'good'
  best.result = result
  run.counts[result]++
  run.combo++
  run.maxCombo = Math.max(run.maxCombo, run.combo)
  run.score += POINTS[result] * (1 + Math.min(run.combo, 50) / 50)
  return { result, note: best, offset: t - best.t }
}

// Notes whose window has passed without a hit become misses (and break the combo).
export function sweep(run, t) {
  const missed = []
  for (const note of run.notes) if (!note.result && t > note.t + WINDOW.good) { note.result = 'miss'; run.counts.miss++; run.combo = 0; missed.push(note) }
  return missed
}

export function grade(run) {
  const total = run.notes.length || 1
  const accuracy = (run.counts.perfect + run.counts.good * .5) / total
  return { accuracy, stars: accuracy >= .9 ? 3 : accuracy >= .7 ? 2 : accuracy >= .4 ? 1 : 0 }
}
