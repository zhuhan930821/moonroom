import test from 'node:test'
import assert from 'node:assert/strict'
import { MEMBERS, pushSecretKey, pushTap } from '../src/game/sasaBand.js'

const type = (codes, gap = .2) => {
  let keys = [], hit = false
  codes.forEach((code, i) => { const r = pushSecretKey(keys, code, i * gap); keys = r.keys; hit = hit || r.hit })
  return hit
}

test('typing s-a-s-a reveals the band; other words and slow typing do not', () => {
  assert.equal(type(['KeyS', 'KeyA', 'KeyS', 'KeyA']), true)
  assert.equal(type(['KeyW', 'KeyS', 'KeyA', 'KeyS', 'KeyA']), true)
  assert.equal(type(['KeyS', 'KeyA', 'KeyA', 'KeyS']), false)
  assert.equal(type(['KeyS', 'KeyA', 'KeyS', 'KeyA'], 1), false)
})

test('three quick taps toggle; slow taps do not', () => {
  let taps = [], hit = false
  for (const t of [0, .4, .8]) { const r = pushTap(taps, t); taps = r.taps; hit = hit || r.hit }
  assert.equal(hit, true)
  taps = []; hit = false
  for (const t of [0, 1, 2]) { const r = pushTap(taps, t); taps = r.taps; hit = hit || r.hit }
  assert.equal(hit, false)
})

test('each member stands by their own instrument and has something to say', () => {
  assert.deepEqual(MEMBERS.map(m => m.part).sort(), ['drums', 'guitar', 'piano'])
  for (const m of MEMBERS) { assert.ok(m.quote && m.lines.length && m.playing); assert.match(m.image, /^\/assets\/band\/.+\.webp$/) }
})
