import test from 'node:test'
import assert from 'node:assert/strict'
import { grade, judge, startRun, sweep } from '../src/game/rhythm.js'

const take = { bpm: 120, events: [{ t: 0, pad: 'kick' }, { t: .5, pad: 'snare' }, { t: .5, pad: 'hihat' }, { t: 1, pad: 'kick' }, { t: .2, pad: 'piano', note: 60, d: .2 }] }

test('a take becomes a chart of its drum hits, offset by the count-in', () => {
  const run = startRun(take, 10)
  assert.deepEqual(run.notes.map(n => [n.pad, n.t]), [['kick', 10], ['snare', 10.5], ['hihat', 10.5], ['kick', 11]])
})

test('hits are judged perfect / good by distance, on the right pad only, once each', () => {
  const run = startRun(take, 0)
  assert.equal(judge(run, 'kick', .03).result, 'perfect')
  assert.equal(judge(run, 'kick', .04).result, 'stray', 'that kick is already taken; the next is 1 s away')
  assert.equal(judge(run, 'snare', .59).result, 'good')
  assert.equal(judge(run, 'ride', .5).result, 'stray')
  assert.equal(run.combo, 2)
})

test('unplayed notes become misses that reset the combo, and the grade reflects accuracy', () => {
  const run = startRun(take, 0)
  judge(run, 'kick', 0); judge(run, 'snare', .5); judge(run, 'hihat', .5)
  assert.equal(sweep(run, 1.2).length, 1)
  assert.equal(run.combo, 0); assert.equal(run.maxCombo, 3)
  assert.deepEqual(grade(run), { accuracy: .75, stars: 2 })
})
