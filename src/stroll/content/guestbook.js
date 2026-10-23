// The guestbook remembers what you wrote on every street, so later streets show your old notes
// next to strangers'. Pure (localStorage guarded) so it can be tested.
const KEY = 'moonroom.guestbook.v1'
export const STRANGERS = [
  ['一只路过的狐狸', '在这条街上走了三遍，还是没找到回家的路。不过没关系。'], ['没有署名', '今天买了一颗会发光的石头，送给明天的自己。'],
  ['阿月', '如果你也在找一扇门，它就在你上次停下来的地方。'], ['住在三楼的猫', '请不要在窗台上放鱼干。（请放。）'],
  ['一个不会写字的小孩', '☾ ☆ ☾ ☆'], ['图书管理员', '借书不用还，看完记得做个好梦。'],
  ['写信的人', '我把没寄出的信都夹在第二排的书里了。'], ['L', '喷泉真的会把硬币吐回来，我试了七次。'],
]
export function readBook() { try { const v = JSON.parse(globalThis.localStorage?.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
export function writeBook(entry) {
  const text = String(entry.text || '').trim().slice(0, 140)
  if (!text) return null
  const item = { text, street: entry.street, at: entry.at ?? Date.now() }
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify([item, ...readBook()].slice(0, 200))) } catch { /* private mode */ }
  return item
}
// Three strangers (stable per street) + your own latest notes.
export function pageFor(seed, mine = readBook()) {
  const pick = [0, 1, 2].map(i => STRANGERS[(Math.abs(seed) + i * 3) % STRANGERS.length])
  return { strangers: pick.map(([name, text]) => ({ name, text })), mine: mine.slice(0, 5) }
}
