import test from 'node:test'
import assert from 'node:assert/strict'
import { buttonChanges, deadzone } from '../src/game/gamepad.js'
import { BAND_PARTS, DRUM_PAD, PIANO_PAD, chooseShot, guitarChordFor, joinBand, leaveBand, partOf, switchPart } from '../src/game/padMaps.js'
import { GUITAR_CHORDS } from '../src/audio/guitarChords.js'
const CHORD_NAMES = GUITAR_CHORDS.map(c => c.name)

test('button presses and releases become events', () => {
  assert.deepEqual(buttonChanges([false, false], [true, false]), [['A', true]])
  assert.deepEqual(buttonChanges([true, true], [false, true]), [['A', false]])
  assert.deepEqual(buttonChanges(undefined, [false, false, false, false, false, false, false, true]), [['RT', true]])
  assert.equal(deadzone(.1), 0); assert.equal(deadzone(1), 1); assert.ok(deadzone(-.6) < 0)
})

test('instrument layouts never use B (it always backs out) and cover every chord', () => {
  for (const map of [DRUM_PAD, PIANO_PAD]) assert.ok(!('B' in map))
  const chords = ['Up', 'Right', 'Down', 'Left'].flatMap(b => [guitarChordFor(b, false), guitarChordFor(b, true)])
  assert.deepEqual([...chords].sort(), [...CHORD_NAMES].sort())
  assert.equal(guitarChordFor('A', false), null)
})

test('band seats: join in order, switch to a free part, leave', () => {
  let seats = { drums: null, guitar: null, piano: null }
  seats = joinBand(seats, 0); seats = joinBand(seats, 2); seats = joinBand(seats, 0)
  assert.deepEqual(seats, { drums: 0, guitar: 2, piano: null })
  seats = switchPart(seats, 0, 1) // guitar taken, so drums → piano
  assert.equal(partOf(seats, 0), 'piano')
  seats = joinBand(seats, 1); seats = joinBand(seats, 3)
  assert.deepEqual(seats, { drums: 1, guitar: 2, piano: 0 }, 'a fourth pad finds no seat')
  assert.deepEqual(switchPart(seats, 1, 1), seats, 'nowhere free to go')
  seats = leaveBand(seats, 2)
  assert.equal(seats.guitar, null)
  assert.deepEqual(BAND_PARTS, ['drums', 'guitar', 'piano'])
})

test('auto camera: close-up on a solo, wide when several play, never flickers', () => {
  const quiet = { drums: 9, guitar: 9, piano: 9 }
  assert.equal(chooseShot({ ...quiet, guitar: .2 }, 'wide', 5), 'guitar')
  assert.equal(chooseShot({ ...quiet, guitar: .2, drums: .1 }, 'guitar', 5), 'wide')
  assert.equal(chooseShot({ ...quiet, piano: .1 }, 'guitar', 1), 'guitar', 'held for at least a couple of seconds')
  assert.equal(chooseShot(quiet, 'drums', 5), 'wide')
})
