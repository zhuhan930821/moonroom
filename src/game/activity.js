// What you did in the room, per day, so the bookshelf diary can write a page about it.
// Counts and a few names only, kept locally for the last 30 days.

const KEY = 'moonroom.activity.v1'
const KEEP_DAYS = 30
const LIST_KINDS = ['take', 'vinyl', 'world', 'souvenir', 'photo', 'dream', 'castle', 'fox', 'chord']

export const dayKey = (time = Date.now()) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Pure: returns a new log with one event added (tested directly).
export function addEvent(log, kind, detail, time = Date.now()) {
  const key = dayKey(time)
  const day = log.days[key] || { counts: {}, lists: {}, firstAt: time }
  const counts = { ...day.counts, [kind]: (day.counts[kind] || 0) + 1 }
  let lists = day.lists
  if (detail && LIST_KINDS.includes(kind)) {
    const list = lists[kind] || []
    if (!list.includes(detail)) lists = { ...lists, [kind]: [...list, String(detail).slice(0, 24)].slice(-6) }
  }
  const days = { ...log.days, [key]: { ...day, counts, lists, lastAt: time } }
  const keys = Object.keys(days).sort()
  for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[old]
  return { ...log, days }
}

export function normalizeLog(raw) {
  if (!raw || typeof raw !== 'object' || !raw.days || typeof raw.days !== 'object') return { days: {}, seen: '' }
  return { days: raw.days, seen: typeof raw.seen === 'string' ? raw.seen : '' }
}

const load = () => { try { return normalizeLog(JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null')) } catch { return normalizeLog(null) } }
let log = load()
let saveTimer = null
const save = () => { saveTimer = null; try { globalThis.localStorage?.setItem(KEY, JSON.stringify(log)) } catch { /* private mode / full */ } }
// Piano notes and drum hits arrive fast, so writes are batched.
const scheduleSave = () => { if (!saveTimer) saveTimer = setTimeout(save, 1500) }
globalThis.addEventListener?.('pagehide', () => { if (saveTimer) { clearTimeout(saveTimer); save() } })

export const activity = {
  get: () => log,
  log(kind, detail) { log = addEvent(log, kind, detail); scheduleSave() },
  // The newest finished day's page has been read.
  markSeen(key) { if (key && key > log.seen) { log = { ...log, seen: key }; save() } },
}
