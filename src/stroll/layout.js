// Street layout + walk physics (pure, tested). Coordinates: the street runs along -Z, its centre
// is x = 0; a building on side s (−1 left, +1 right) has its front wall at x = s·FRONT and a local
// depth u (0 at the front wall, DEPTH at the back), so world x = s·(FRONT + u).
import { rng } from '../worlds/spec.js'

export const LENGTH = 200, FRONT = 6.2, DEPTH = 7, WALK = 5.3, FLOOR_H = 3.1
export const START_DOOR = [0, 0, 9.4], END_DOOR = [0, 0, -LENGTH - 5]
export const SHOP_DEPTH = 3.5 // shoppers stay in front of the counter
const STAIR = { inner: 4.6, outer: 5.6, length: 10.5 }
export const wx = (side, u) => side * (FRONT + u)

const FOUND = [
  { name: '一张旧船票', story: '目的地写着「明天」，日期被雨水打湿了。', shape: 'key', color: '#e8d8b0' },
  { name: '别人的日记页', story: '只写了一句：今天的月亮很圆，我很想你。', shape: 'feather', color: '#f4ecdc' },
  { name: '一颗玻璃纽扣', story: '从某件很喜欢的外套上掉下来的。', shape: 'stone', color: '#a8d8f0' },
  { name: '半块月光饼', story: '桌上留着一张纸条：给路过的人。', shape: 'seed', color: '#ffd890' },
  { name: '迷路的音符', story: '它在这间屋子里转了很久，终于等到你。', shape: 'star', color: '#c8b0ff' },
]

export function layoutStreet(world) {
  const r = rng(world.seed), style = world.street.style, tall = world.street.height
  const walls = [world.palette.wallA, world.palette.wallB, world.palette.wallC]
  const buildings = []
  for (const side of [-1, 1]) {
    let z = -2
    while (z > -LENGTH + 4) {
      const w = 6 + r() * 4
      const floors = 1 + Math.floor(r() * (1.5 + tall * (style === 'gothic' ? 4 : 3)))
      buildings.push({ id: buildings.length, side, z: z - w / 2, w, floors, wall: walls[Math.floor(r() * 3)], roll: r(), shop: null, home: false, roof: false })
      z -= w + .3 + r() * .8
    }
  }
  const range = b => [b.z - b.w / 2, b.z + b.w / 2]
  const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1

  // Shops: spread evenly, alternating sides.
  const shops = world.shops.map((shop, i) => {
    const targetZ = -14 - (i + .5) * ((LENGTH - 30) / world.shops.length), side = i % 2 ? 1 : -1
    const b = buildings.filter(b => b.side === side && b.shop == null).reduce((best, b) => Math.abs(b.z - targetZ) < Math.abs(best.z - targetZ) ? b : best)
    b.shop = i; b.floors = Math.max(b.floors, 2); b.doorZ = b.z
    return { ...shop, index: i, side, z: b.z, w: b.w, building: b.id }
  })

  // Rooftops: two wide buildings with an outside stair along the kerb, rising toward -Z.
  const stairs = []
  for (const b of buildings.filter(b => b.shop == null && b.w >= 7 && b.z < -30 && b.z > -LENGTH + 20).sort(() => r() - .5)) {
    if (stairs.length >= 2) break
    const top = b.z + b.w / 2 - .3, bottom = top + STAIR.length
    const clash = buildings.some(o => o.side === b.side && o !== b && o.shop != null && overlaps(...range(o), top - 2, bottom + 1))
      || stairs.some(s => Math.abs(s.top - top) < 30)
    if (clash) continue
    b.roof = true; b.floors = 2
    stairs.push({ side: b.side, building: b.id, top, bottom, height: 2 * FLOOR_H + .2, z0: b.z - b.w / 2, z1: b.z + b.w / 2 })
  }

  // Homes: a few open front doors, never inside a stair's footprint.
  const homes = []
  for (const b of buildings.filter(b => b.shop == null && !b.roof && b.z < -10 && b.z > -LENGTH + 8)) {
    if (homes.length >= 6 || r() > .3) continue
    if (stairs.some(s => s.side === b.side && overlaps(...range(b), s.top - 2, s.bottom + 1))) continue
    if (homes.some(h => h.side === b.side && Math.abs(h.z - b.z) < 20)) continue
    b.home = true; b.doorZ = b.z + (b.roll - .5) * (b.w - 2.4)
    homes.push({ side: b.side, z: b.z, w: b.w, building: b.id, doorZ: b.doorZ })
  }

  // Things to interact with, in world coordinates.
  const interact = []
  for (const s of shops) {
    s.goods.forEach((good, i) => interact.push({ kind: 'good', shop: s.index, good, pos: [wx(s.side, 4.0), s.z + (i - (s.goods.length - 1) / 2) * 1.1], radius: 1.35 }))
    interact.push({ kind: 'keeper', shop: s.index, pos: [wx(s.side, 5.2), s.z], radius: 2.7 })
  }
  const foundHome = homes.length ? homes[Math.floor(r() * homes.length)] : null
  if (foundHome) {
    const f = FOUND[Math.floor(r() * FOUND.length)]
    interact.push({ kind: 'found', good: { ...f, id: `found-${world.seed}`, price: 0 }, pos: [wx(foundHome.side, 3.25), foundHome.z], radius: 1.6, building: foundHome.building })
  }

  const coins = Array.from({ length: 40 }, () => [(r() - .5) * 8, 1.15, -8 - r() * (LENGTH - 12)])
  for (const h of homes) for (let i = 0; i < 2; i++) coins.push([wx(h.side, .9 + r() * 1.4), 1.15, h.z + (r() - .5) * (h.w - 1.6)])
  for (const s of stairs) for (let i = 0; i < 4; i++) coins.push([wx(s.side, 1.2 + r() * 4.6), s.height + 1.15, s.z0 + .8 + r() * (s.z1 - s.z0 - 1.6)])
  return { buildings, shops, homes, stairs, interact, coins }
}

// ---------- walk physics ----------
const box = (side, u0, u1, z0, z1) => { const a = wx(side, u0), b = wx(side, u1); return { x0: Math.min(a, b), x1: Math.max(a, b), z0, z1 } }
const inside = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
const xBand = (side, a, b) => ({ x0: Math.min(side * a, side * b), x1: Math.max(side * a, side * b) })

export function makePhysics(layout) {
  const rooms = []
  for (const b of layout.buildings) {
    if (b.shop == null && !b.home) continue
    const z0 = b.z - b.w / 2 + .45, z1 = b.z + b.w / 2 - .45
    const room = { ...box(b.side, .45, b.shop != null ? SHOP_DEPTH : DEPTH - .45, z0, z1), blockers: [] }
    if (b.home) room.blockers.push(box(b.side, DEPTH - 2.5, DEPTH, z1 - 2.1, z1 + 1), box(b.side, 2.55, 3.95, b.z - .8, b.z + .8)) // bed, table
    rooms.push(room)
    rooms.push({ ...xBand(b.side, WALK - .3, FRONT + .6), z0: b.doorZ - .5, z1: b.doorZ + .5, blockers: [] }) // doorway
  }
  const decks = layout.stairs.flatMap(s => [
    { ...box(s.side, .4, DEPTH - .4, s.z0 + .4, s.z1 - .4), h: s.height }, // roof
    { ...xBand(s.side, STAIR.inner, FRONT + .6), z0: s.top - 1.6, z1: s.top, h: s.height }, // landing
  ])
  const ramps = layout.stairs.map(s => ({ ...xBand(s.side, STAIR.inner, STAIR.outer), z0: s.top, z1: s.bottom, s }))
  // Under the stair the street narrows so you can only get on at its foot.
  const carves = layout.stairs.map(s => ({ side: s.side, z0: s.top - 1.6, z1: s.bottom - .6 }))
  const onStreet = (x, z) => Math.abs(x) < WALK && z < 8.6 && z > -LENGTH - 4.2 && !carves.some(c => z > c.z0 && z < c.z1 && c.side * x > STAIR.inner - .15)
  return {
    walkable: (x, z) => onStreet(x, z) || ramps.some(r => inside(x, z, r)) || decks.some(d => inside(x, z, d))
      || rooms.some(r => inside(x, z, r) && !r.blockers.some(b => inside(x, z, b))),
    ground(x, z) {
      const deck = decks.find(d => inside(x, z, d)); if (deck) return deck.h
      const ramp = ramps.find(r => inside(x, z, r)); if (ramp) return ramp.s.height * Math.min(1, Math.max(0, (ramp.s.bottom - z) / STAIR.length))
      return 0
    },
  }
}
