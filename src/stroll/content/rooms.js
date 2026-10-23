// Enterable building types. Each room decides which buildings it takes over (place), where its
// door is, how deep you can walk in, what blocks you, what you can interact with, and where
// coins hide. Its interior renderer is registered under the same id in content/render.jsx.
//
//   place({ world, r, candidates, overlaps }) → [{ b, ...extra }]   extra is copied onto b
//   door(b) → world z of the doorway (default b.z)
//   depth(b) → how far in you can walk (default DEPTH − .45)
//   blockers(b) → [[u0, u1, z0, z1]] furniture you can't walk through (local depth u, world z)
//   interactions(b, world) → [{ kind, u, z, radius, ... }]   kind = a registered interaction
//   coins(b, r) → [[u, z]]
//   order: lower places first (shops claim their buildings before anything else)
import { define } from '../registry.js'
import { DEPTH, LENGTH } from '../constants.js'

define('room', {
  id: 'shop', order: 0,
  place({ world, candidates }) {
    return world.shops.map((shop, i) => {
      const targetZ = -14 - (i + .5) * ((LENGTH - 30) / world.shops.length), side = i % 2 ? 1 : -1
      const b = candidates({ side }).reduce((best, b) => Math.abs(b.z - targetZ) < Math.abs(best.z - targetZ) ? b : best)
      b.room = 'shop' // claim now so the next shop picks another building
      return { b, shop: i, floors: Math.max(b.floors, 2) }
    })
  },
  depth: () => 3.5, // shoppers stay in front of the counter
  interactions(b, world) {
    const goods = world.shops[b.shop].goods
    return [
      ...goods.map((good, i) => ({ kind: 'good', shop: b.shop, good, u: 4.0, z: b.z + (i - (goods.length - 1) / 2) * 1.1, radius: 1.35 })),
      { kind: 'keeper', shop: b.shop, u: 5.2, z: b.z, radius: 2.7 },
    ]
  },
})

const FOUND = [
  { name: '一张旧船票', story: '目的地写着「明天」，日期被雨水打湿了。', shape: 'key', color: '#e8d8b0' },
  { name: '别人的日记页', story: '只写了一句：今天的月亮很圆，我很想你。', shape: 'feather', color: '#f4ecdc' },
  { name: '一颗玻璃纽扣', story: '从某件很喜欢的外套上掉下来的。', shape: 'stone', color: '#a8d8f0' },
  { name: '半块月光饼', story: '桌上留着一张纸条：给路过的人。', shape: 'seed', color: '#ffd890' },
  { name: '迷路的音符', story: '它在这间屋子里转了很久，终于等到你。', shape: 'star', color: '#c8b0ff' },
]

define('room', {
  id: 'home', order: 10,
  place({ world, r, candidates }) {
    const picked = []
    for (const b of candidates({ minZ: -LENGTH + 8, maxZ: -10 })) {
      if (picked.length >= 6 || r() > .3) continue
      if (picked.some(p => p.b.side === b.side && Math.abs(p.b.z - b.z) < 20)) continue
      picked.push({ b, doorZ: b.z + (b.roll - .5) * (b.w - 2.4) })
    }
    if (picked.length) picked[Math.floor(r() * picked.length)].found = { ...FOUND[Math.floor(r() * FOUND.length)], id: `found-${world.seed}`, price: 0 }
    return picked
  },
  door: b => b.doorZ,
  blockers: b => [[DEPTH - 2.5, DEPTH, b.z + b.w / 2 - 2.55, b.z + b.w / 2 + 1], [2.55, 3.95, b.z - .8, b.z + .8]], // bed, table
  interactions: b => b.found ? [{ kind: 'found', good: b.found, u: 3.25, z: b.z, radius: 1.6, building: b.id }] : [],
  coins: (b, r) => [0, 1].map(() => [.9 + r() * 1.4, b.z + (r() - .5) * (b.w - 1.6)]),
})
