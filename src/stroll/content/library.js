// A small library: shelves to wander between and a guestbook by the door to read and sign.
import { define } from '../registry.js'
import { LENGTH } from '../constants.js'

export const aisles = b => [[3.0, 3.5, b.z - b.w / 2 + .3, b.z - .7], [3.0, 3.5, b.z + .7, b.z + b.w / 2 - .3], [4.9, 5.4, b.z - b.w / 2 + .3, b.z + b.w / 2 - 1.6]]
define('room', {
  id: 'library', order: 16,
  place: ({ r, candidates }) => {
    const c = candidates({ minZ: -LENGTH + 20, maxZ: -20 }).filter(b => b.w >= 8)
    return c.length ? [{ b: c[Math.floor(r() * c.length)], floors: 3 }] : []
  },
  blockers: b => [...aisles(b), [1.0, 1.5, b.z + b.w / 4 - .3, b.z + b.w / 4 + .3]], // shelves + lectern
  interactions: b => [{ kind: 'guestbook', u: 1.25, z: b.z + b.w / 4, radius: 1.5 }],
  coins: (b, r) => [[6.1, b.z + b.w / 2 - .9]], // tucked behind the last shelf
})
define('interaction', { id: 'guestbook', label: () => '翻开留言簿', use: (it, ctx) => ctx.panel('guestbook', it) })
