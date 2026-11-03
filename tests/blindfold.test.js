import test from 'node:test'
import assert from 'node:assert/strict'
import { BLINDFOLD_STORY, MAX_CUES, PERIOD, WINDOW, cueTimes, judge } from '../src/game/blindfold.js'

test('entries come one period apart after a short lead-in', () => {
  const cues = cueTimes(10)
  assert.equal(cues.length, MAX_CUES)
  assert.ok(cues[0] > 11)
  assert.ok(Math.abs(cues[1] - cues[0] - PERIOD) < 1e-9)
})

test('pressing with her entry locks in; early, late and stray presses do not', () => {
  const cues = cueTimes(0)
  assert.equal(judge(cues[2] + WINDOW * .8, cues).result, 'lock')
  assert.equal(judge(cues[2] - WINDOW * 2, cues).result, 'early')
  assert.equal(judge(cues[2] + WINDOW * 2, cues).result, 'late')
  assert.equal(judge(cues[2] + PERIOD / 2, cues).result, 'stray')
  assert.equal(judge(cues[2], cues, new Set([2])).result, 'stray') // an entry only counts once
})

test('the unlocked chapter has five sections, all with text', () => {
  assert.equal(BLINDFOLD_STORY.length, 5)
  for (const s of BLINDFOLD_STORY) assert.ok(s.title && s.text.length > 100)
})
