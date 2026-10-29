import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GUITAR_CHORDS, PICK_STRINGS, strumNotes } from '../src/audio/guitarChords.js'
import { pluckSamples } from '../src/audio/pluck.js'
import { addEvent, normalizeLog } from '../src/game/activity.js'
import { writeDiaryEntry } from '../src/ui/diaryWriter.js'

test('guitar chords have six strings and a playable voicing', () => {
  assert.deepEqual(GUITAR_CHORDS.map(chord => chord.name), ['C', 'G', 'Am', 'F', 'Dm', 'Em', 'E', 'A'])
  for (const chord of GUITAR_CHORDS) {
    assert.equal(chord.notes.length, 6)
    assert.ok(chord.notes.filter(note => note !== null).length >= 4)
    assert.ok(chord.notes.every(note => note === null || Number.isInteger(note) && note >= 40 && note <= 67))
  }
  assert.deepEqual(PICK_STRINGS, [0, 2, 3, 5])
  const down = strumNotes(3)
  const up = strumNotes(3, true)
  assert.equal(down.length, 6)
  assert.deepEqual(up.map(hit => hit.note), [...down].reverse().map(hit => hit.note))
  assert.ok(down.every((hit, index) => index === 0 || hit.offset - down[index - 1].offset >= .01))
})

test('plucked-string waveform decays and stays near the intended pitch', () => {
  let seed = 1
  const random = () => ((seed = seed * 16807 % 2147483647) / 2147483647)
  const rate = 44100, data = pluckSamples(110, rate, { sustain: 2, seconds: 2, random })
  const rms = (a, b) => Math.sqrt(data.slice(a, b).reduce((sum, value) => sum + value * value, 0) / (b - a))
  assert.ok(rms(0, 4410) > rms(rate, rate + 4410) * 3)
  const corr = lag => { let sum = 0; for (let i = rate / 2; i < rate / 2 + 8000; i++) sum += data[i] * data[i + lag]; return sum }
  const best = [...Array(700).keys()].slice(100).reduce((winner, lag) => corr(lag) > corr(winner) ? lag : winner, 100)
  assert.ok(Math.abs(best - 401) <= 2)
})

test('the room diary remembers strumming and chord changes', () => {
  let log = normalizeLog(null)
  const at = new Date(2026, 9, 29, 21).getTime()
  for (let i = 0; i < 40; i++) log = addEvent(log, 'guitar', null, at)
  log = addEvent(log, 'chord', 'C', at)
  log = addEvent(log, 'chord', 'G', at)
  const page = writeDiaryEntry('2026-10-29', log.days['2026-10-29'])
  assert.match(page.text, /吉他扫了 40 下/)
  assert.match(page.text, /C、G/)
})
