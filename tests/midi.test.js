import test from 'node:test'
import assert from 'node:assert/strict'
import { GM_NOTE, midiToTake, takeToMidi } from '../src/audio/midi.js'
import { makeTake } from '../src/audio/takes.js'

test('a take survives a MIDI round trip: tempo, drums on GM notes, piano pitches and lengths', () => {
  const take = makeTake({ name: 'Moon Song', bpm: 96, events: [
    { t: 0, pad: 'kick' }, { t: .3125, pad: 'hihatOpen' }, { t: .625, pad: 'snare' }, { t: .9375, pad: 'floor' },
    { t: 0, pad: 'piano', note: 60, d: .625 }, { t: .625, pad: 'piano', note: 67, d: .3125 },
  ] })
  const bytes = takeToMidi(take)
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd')
  const back = midiToTake(bytes.buffer, 'back')
  assert.equal(back.bpm, 96)
  const norm = events => events.map(e => JSON.stringify({ ...e, t: +e.t.toFixed(3), ...(e.d ? { d: +e.d.toFixed(3) } : {}) })).sort()
  assert.deepEqual(norm(back.events), norm(take.events))
})

test('guitar, piano and drum tracks survive one MIDI export', () => {
  const take = makeTake({ name: 'Trio', bpm: 100, events: [
    { t: 0, pad: 'kick' }, { t: .2, pad: 'guitar', note: 52, d: .8 }, { t: .4, pad: 'piano', note: 64, d: .3 },
  ] })
  const restored = midiToTake(takeToMidi(take).buffer, 'Trio')
  assert.deepEqual(restored.events.map(event => event.pad), ['kick', 'guitar', 'piano'])
  assert.equal(restored.events[1].note, 52)
})

test('drum notes use the General MIDI numbers Mugo maps', () => {
  assert.deepEqual(GM_NOTE, { kick: 36, snare: 38, hihat: 42, hihatOpen: 46, tom1: 50, tom2: 47, floor: 43, crash: 49, ride: 51 })
})

test('non-MIDI data is rejected with a readable message', () => {
  assert.throws(() => midiToTake(new TextEncoder().encode('hello world!').buffer, 'x'), /不是 MIDI/)
})
