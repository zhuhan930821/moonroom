import test from 'node:test'
import assert from 'node:assert/strict'
import { finishRecording, makeTake, mergeTakes, quantize, takeLength, toggleStep } from '../src/audio/takes.js'
import { DRUM_KEYS } from '../src/game/drumKeys.js'

test('recording stores hits relative to the start and drops unknown pads', () => {
  const take = finishRecording({ startedAt: 10, bpm: 120, name: 'T', now: 1, hits: [{ pad: 'snare', at: 10.75 }, { pad: 'kick', at: 10.01 }, { pad: 'cowbell', at: 11 }] })
  assert.deepEqual(take.events.map(e => e.pad), ['kick', 'snare'])
  assert.ok(Math.abs(take.events[1].t - .75) < 1e-9)
})

test('length rounds up to whole bars, respects an explicit bar count, and is at least one bar', () => {
  assert.equal(takeLength(makeTake({ name: 'a', bpm: 120, events: [] })), 2)
  assert.equal(takeLength(makeTake({ name: 'b', bpm: 120, events: [{ t: 2.1, pad: 'kick' }] })), 4)
  assert.equal(takeLength(makeTake({ name: 'c', bpm: 120, bars: 3, events: [{ t: .5, pad: 'kick' }] })), 6)
})

test('quantize snaps to 1/16, merges duplicates, and keeps the original for undo', () => {
  const take = makeTake({ name: 'q', bpm: 120, events: [{ t: .13, pad: 'hihat' }, { t: .118, pad: 'hihat' }, { t: .26, pad: 'snare' }] })
  const q = quantize(take, 4)
  assert.deepEqual(q.events, [{ t: .125, pad: 'hihat' }, { t: .25, pad: 'snare' }])
  assert.equal(q.original.length, 3)
})

test('step editing adds a hit on an empty cell and removes it on a second click', () => {
  const take = makeTake({ name: 's', bpm: 120, bars: 1 })
  const added = toggleStep(take, 'kick', 4, 4)
  assert.deepEqual(added.events, [{ t: .5, pad: 'kick' }])
  assert.equal(toggleStep(added, 'kick', 4, 4).events.length, 0)
})

test('every pad has a letter key and a digit key in the drum session', () => {
  const pads = ['kick', 'snare', 'hihat', 'hihatOpen', 'tom1', 'tom2', 'floor', 'crash', 'ride']
  for (const pad of pads) {
    assert.ok(Object.entries(DRUM_KEYS).some(([code, p]) => p === pad && !code.startsWith('Digit')), `${pad} letter key`)
    assert.ok(Object.entries(DRUM_KEYS).some(([code, p]) => p === pad && code.startsWith('Digit')), `${pad} digit key`)
  }
})

test('piano notes keep pitch and held length through recording, quantize, and step edits', async () => {
  const { PIANO_KEYS } = await import('../src/game/pianoKeys.js')
  assert.equal(PIANO_KEYS.KeyZ, 0); assert.equal(PIANO_KEYS.KeyQ, 12); assert.equal(PIANO_KEYS.KeyI, 24)
  const take = finishRecording({ startedAt: 0, bpm: 120, name: 'p', now: 1, hits: [{ pad: 'piano', note: 60, at: .26, until: .74 }, { pad: 'piano', at: .3 }] })
  assert.deepEqual(take.events, [{ t: .26, pad: 'piano', note: 60, d: .48 }])
  assert.deepEqual(quantize(take, 4).events, [{ t: .25, pad: 'piano', note: 60, d: .5 }])
  const edited = toggleStep(makeTake({ name: 'e', bpm: 120, bars: 1 }), 'piano', 2, 4, 64)
  assert.deepEqual(edited.events, [{ t: .25, pad: 'piano', note: 64, d: .25 }])
  assert.equal(toggleStep(edited, 'piano', 3, 4, 64).events.length, 0, 'clicking inside the held note removes it')
  assert.equal(toggleStep(edited, 'piano', 3, 4, 65).events.length, 2, 'another pitch is a new note')
})

test('guitar strings record as pitched notes and can layer with piano and drums', () => {
  const guitar = finishRecording({ startedAt: 10, bpm: 120, name: 'Guitar', now: 2, hits: [
    { pad: 'guitar', note: 40, at: 10.2 }, { pad: 'guitar', note: 47, at: 10.218 },
  ] })
  assert.deepEqual(guitar.events.map(event => [event.pad, event.note]), [['guitar', 40], ['guitar', 47]])
  assert.equal(quantize(guitar, 4).events[0].note, 40)
  const drumsAndPiano = makeTake({ name: 'Room', bpm: 90, bars: 2, events: [{ t: 0, pad: 'kick' }, { t: .5, pad: 'piano', note: 60, d: .5 }] })
  const mixed = mergeTakes(drumsAndPiano, guitar)
  assert.equal(mixed.events.length, 4)
  assert.deepEqual(new Set(mixed.events.map(event => event.pad)), new Set(['kick', 'piano', 'guitar']))
  assert.ok(Math.abs(mixed.events[1].t - .2 * 120 / 90) < .001)
})

test('project key follows the latest piano take', async () => {
  const { projectKey } = await import('../src/audio/takes.js')
  const notes = (list) => list.map((note, i) => ({ t: i * .5, pad: 'piano', note, d: .5 }))
  assert.equal(projectKey([]), null)
  assert.equal(projectKey([makeTake({ name: 'g', events: notes([67, 71, 74, 66, 67, 62]) })]), 7, 'G major (F# present)')
  assert.equal(projectKey([makeTake({ name: 'f', events: notes([65, 69, 72, 70, 65]) }), makeTake({ name: 'c', events: notes([60, 64, 67]) })]), 5, 'latest take first wins: F major (Bb)')
})
