import test from 'node:test'
import assert from 'node:assert/strict'
import { BAR, BEAT, MELODY_SCALE, PROGRESSION, SWING, composeBar, eighth, rng } from '../src/audio/lofiScore.js'

test('the off-beat 8ths swing late and every event lands inside its bar', () => {
  assert.equal(eighth(0), 0)
  assert.ok(Math.abs(eighth(1) - BEAT * SWING) < 1e-9)
  assert.ok(eighth(1) > BEAT / 2)
  const random = rng(3)
  let last
  for (let bar = 0; bar < 64; bar++) {
    const { events, last: next } = composeBar(bar, random, { last })
    last = next
    for (const e of events) assert.ok(e.at > -.2 && e.at < BAR, `${e.kind} at ${e.at}`)
  }
})

test('melody stays on the F major pentatonic and chords follow the eight-bar progression', () => {
  const random = rng(11)
  let last
  for (let bar = 0; bar < 32; bar++) {
    const composed = composeBar(bar, random, { last })
    last = composed.last
    assert.equal(composed.chord, PROGRESSION[bar % 8].name)
    for (const e of composed.events.filter(e => e.kind === 'melody')) assert.ok(MELODY_SCALE.includes(e.note), `note ${e.note}`)
  }
})

test('drums come in after two bars and rest two bars in every sixteen', () => {
  const drumsIn = bar => composeBar(bar, rng(5)).events.some(e => e.kind === 'kick')
  assert.equal(drumsIn(0), false)
  assert.equal(drumsIn(1), false)
  assert.equal(drumsIn(2), true)
  assert.equal(drumsIn(14), false)
  assert.equal(drumsIn(16), true)
})

test('night is sparser than day', () => {
  const count = density => { const r = rng(9); let n = 0; for (let bar = 0; bar < 64; bar++) n += composeBar(bar, r, { density }).events.filter(e => e.kind === 'melody').length; return n }
  assert.ok(count(.5) < count(.85))
})
