import test from 'node:test'
import assert from 'node:assert/strict'
import { appendDrumHit, initialDrumHit } from '../src/game/drumHitState.js'
import { animateKit } from '../src/scene/drumKitHits.js'

test('two drum strikes in the same render batch are retained independently', () => {
  const chord = appendDrumHit(appendDrumHit(initialDrumHit, 'kick', 100), 'snare', 100)
  assert.deepEqual(chord.events.map(event => event.name), ['kick', 'snare'])
  assert.deepEqual(chord.events.map(event => event.id), [1, 2])
  assert.equal(chord.name, 'snare') // legacy room-wide feedback stays intact
})

test('kick and snare animate together without one cancelling the other', () => {
  const nodes = Object.fromEntries(['Kick', 'Snare', 'HiHat_Top'].map(name => [name, { rotation: { z: 0 }, scale: { y: 1 } }]))
  animateKit({ getObjectByName: name => nodes[name] }, { kick: 1, snare: 1 })
  assert.equal(nodes.Kick.scale.y, .92)
  assert.equal(nodes.Snare.scale.y, .92)
  assert.equal(nodes.HiHat_Top.scale.y, 1)
})
