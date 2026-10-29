import test from 'node:test'
import assert from 'node:assert/strict'
import { CHORD_KEYS, CHORD_NAMES, chordNotes, midiToFreq, strumPlan, TUNING } from '../src/game/guitarChords.js'
import { pluckSamples } from '../src/audio/pluck.js'
import { addEvent, normalizeLog } from '../src/game/activity.js'
import { writeDiaryEntry } from '../src/ui/diaryWriter.js'

test('chord shapes give the right notes', () => {
  assert.deepEqual(chordNotes('C'), [null, 48, 52, 55, 60, 64]) // x32010: C E G C E
  assert.deepEqual(chordNotes('G'), [43, 47, 50, 55, 59, 67])
  assert.deepEqual(chordNotes('Em'), TUNING.map((n, i) => n + [0, 2, 2, 0, 0, 0][i]))
  // Every chord's notes belong to that chord (pitch classes).
  const pcs = { C: [0, 4, 7], G: [7, 11, 2], Am: [9, 0, 4], F: [5, 9, 0], Dm: [2, 5, 9], Em: [4, 7, 11], E: [4, 8, 11], A: [9, 1, 4] }
  for (const name of CHORD_NAMES) for (const n of chordNotes(name)) if (n != null) assert.ok(pcs[name].includes(n % 12), `${name} has ${n}`)
  assert.equal(CHORD_KEYS.Digit1, 'C'); assert.equal(CHORD_KEYS.Digit8, 'A')
  assert.equal(Math.round(midiToFreq(69)), 440)
})

test('strums run low→high down, high→low up, softer on the way up', () => {
  const down = strumPlan('C', 'down')
  assert.deepEqual(down.map(n => n.string), [1, 2, 3, 4, 5])
  assert.ok(down.every((n, i) => i === 0 || n.delay > down[i - 1].delay))
  const up = strumPlan('G', 'up')
  assert.deepEqual(up.map(n => n.string), [5, 4, 3, 2])
  assert.ok(up[0].gain < down[0].gain)
})

test('Karplus–Strong pluck rings at the right pitch and dies away', () => {
  let seed = 1; const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const rate = 44100, data = pluckSamples(110, rate, { sustain: 2, seconds: 2, random })
  const rms = (a, b) => Math.sqrt(data.slice(a, b).reduce((s, x) => s + x * x, 0) / (b - a))
  assert.ok(rms(0, 4410) > rms(rate, rate + 4410) * 3, 'decays')
  // It repeats every period (44100 / 110 ≈ 401 samples): strongest self-similarity at that lag.
  const corr = lag => { let sum = 0; for (let i = rate / 2; i < rate / 2 + 8000; i++) sum += data[i] * data[i + lag]; return sum }
  const best = [...Array(700).keys()].slice(100).reduce((b, lag) => corr(lag) > corr(b) ? lag : b, 100)
  assert.ok(Math.abs(best - 401) <= 2, `period ${best}`)
})

test('the diary mentions the guitar', () => {
  let log = normalizeLog(null); const t = new Date(2026, 9, 29, 21).getTime()
  for (let i = 0; i < 40; i++) log = addEvent(log, 'guitar', null, t)
  log = addEvent(log, 'chord', 'C', t); log = addEvent(log, 'chord', 'G', t)
  const page = writeDiaryEntry('2026-10-29', log.days['2026-10-29'])
  assert.ok(page.text.includes('吉他扫了 40 下') && page.text.includes('C、G'), page.text)
})
