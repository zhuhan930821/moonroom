import test from 'node:test'
import assert from 'node:assert/strict'
import { journey, VOYAGE_SECONDS } from '../src/game/journey.js'

test('the moon-river voyage requires a ticket and three actual piano notes', () => {
  journey.pianoNote(10)
  assert.equal(journey.get().phase, 'idle')
  journey.takeTicket()
  assert.equal(journey.get().phase, 'ticket')
  journey.pianoNote(10)
  journey.pianoNote(11)
  assert.equal(journey.get().notes, 2)
  assert.equal(journey.get().phase, 'ticket')
  journey.pianoNote(12)
  assert.equal(journey.get().phase, 'travel')
  assert.equal(journey.progress(12 + VOYAGE_SECONDS / 2), .5)
  journey.tick(12 + VOYAGE_SECONDS - .01)
  assert.equal(journey.get().phase, 'travel')
  journey.tick(12 + VOYAGE_SECONDS)
  assert.equal(journey.get().phase, 'arrived')
  assert.equal(journey.collect(), true)
  assert.equal(journey.get().keepsake, true)
})
