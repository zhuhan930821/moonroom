import test from 'node:test'
import assert from 'node:assert/strict'
import { addEvent, dayKey, normalizeLog } from '../src/game/activity.js'
import { diaryPages, formatDate, writeDiaryEntry } from '../src/ui/diaryWriter.js'
import { DIARY } from '../src/ui/diary.js'

const at = (d, h) => new Date(2026, 9, d, h).getTime()

test('the activity log counts per day and keeps a few names', () => {
  let log = normalizeLog(null)
  for (let i = 0; i < 40; i++) log = addEvent(log, 'piano', null, at(27, 23))
  log = addEvent(log, 'fox', '眠眠', at(27, 23)); log = addEvent(log, 'fox', '眠眠', at(27, 23))
  log = addEvent(log, 'world', 'Id 之海', at(28, 1))
  assert.equal(log.days['2026-10-27'].counts.piano, 40)
  assert.deepEqual(log.days['2026-10-27'].lists.fox, ['眠眠'])
  assert.equal(log.days['2026-10-28'].counts.world, 1)
  for (let d = 1; d <= 40; d++) log = addEvent(log, 'lamp', null, new Date(2026, 10, d, 12).getTime())
  assert.equal(Object.keys(log.days).length, 30, 'only the last 30 days are kept')
  assert.equal(dayKey(at(5, 9)), '2026-10-05')
})

test('a day becomes a diary page in the room voice', () => {
  let log = normalizeLog(null)
  for (let i = 0; i < 128; i++) log = addEvent(log, 'piano', null, at(27, 23))
  log = addEvent(log, 'take', 'Piano 3', at(27, 23))
  log = addEvent(log, 'fox', '云团', at(27, 23))
  log = addEvent(log, 'world', 'Id 之海', at(27, 23)); log = addEvent(log, 'photo', 'Id 之海', at(27, 23))
  const page = writeDiaryEntry('2026-10-27', log.days['2026-10-27'])
  assert.equal(page.date, '10 月 27 日')
  for (const bit of ['弹了 128 个音', '「Piano 3」', '云团', '「Id 之海」']) assert.ok(page.text.includes(bit), `${bit} in ${page.text}`)
  assert.equal(page.text, writeDiaryEntry('2026-10-27', log.days['2026-10-27']).text, 'same day, same page')
  assert.equal(writeDiaryEntry('2026-10-27', { counts: {}, lists: {} }), null)
  assert.equal(formatDate('2026-01-05'), '1 月 5 日')
})

test('diary pages: today first, then unread past days, then the authored pages', () => {
  let log = normalizeLog(null)
  log = addEvent(log, 'lamp', null, at(26, 20)); log = addEvent(log, 'drums', null, at(27, 21)); log = addEvent(log, 'curtain', null, at(28, 9))
  const pages = diaryPages({ ...log, seen: '2026-10-26' }, '2026-10-28')
  assert.deepEqual(pages.slice(0, 3).map(p => [p.key, !!p.today, !!p.fresh]), [['2026-10-28', true, false], ['2026-10-27', false, true], ['2026-10-26', false, false]])
  assert.equal(pages.length, 3 + DIARY.length)
})
