import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERACTIONS } from '../src/config/scene.js'
import { isBlocked, nearestInteraction } from '../src/game/collision.js'
import { LOFT_ARRIVAL, ROPE_STAND, insideLoft, loft, newClimb, pull, slide } from '../src/game/loft.js'

test('a steady left-right rhythm reaches the top in about twenty pulls; same hand slips', () => {
  let c = newClimb(), t = 0, n = 0
  while (c.progress < 1 && n < 60) { t += .4; c = pull(c, n % 2 ? 'right' : 'left', t); n++ }
  assert.ok(n >= 14 && n <= 26, `took ${n} pulls`)
  let d = pull(pull(newClimb(), 'left', 1), 'right', 1.4)
  const before = d.progress
  d = pull(d, 'right', 1.8)
  assert.ok(d.progress < before && d.note === '换手！')
})

test('mashing gains little, and letting go slides you down (never below zero)', () => {
  let fast = newClimb(), steady = newClimb()
  for (let i = 0; i < 10; i++) { fast = pull(fast, i % 2 ? 'right' : 'left', i * .05); steady = pull(steady, i % 2 ? 'right' : 'left', i * .4) }
  assert.ok(fast.progress < steady.progress / 2)
  const slid = slide(steady, 10, 5)
  assert.ok(slid.progress < steady.progress && slid.progress >= 0)
  assert.equal(slide(steady, steady.at + .5, .1).progress, steady.progress) // still pulling: no slide
})

test('on the loft you walk the deck only, and see only loft things', () => {
  const [ax, az] = LOFT_ARRIVAL.position
  assert.ok(insideLoft(ax, az, .34))
  assert.equal(nearestInteraction({ x: ROPE_STAND[0], z: ROPE_STAND[1] }, INTERACTIONS), 'rope')
  assert.equal(nearestInteraction({ x: ax, z: az }, INTERACTIONS, null, true), 'ropeDown')
  assert.ok(!INTERACTIONS[nearestInteraction({ x: ax, z: az }, INTERACTIONS)]?.loft) // same spot on the floor: room things only
  loft.set(true)
  try {
    assert.equal(isBlocked(ax, az), false)
    assert.equal(isBlocked(-5.5, az), true)   // off the edge, over the rail
    assert.equal(isBlocked(-8.0, 0), false)   // middle of the deck
  } finally { loft.set(false) }
})
