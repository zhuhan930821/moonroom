// Street layout + walk physics (pure, tested). Generic: rooms, props and interactions come from
// the content registry (src/stroll/content), so adding content never changes this file.
import { rng } from '../worlds/spec.js'
import './content/index.js'
import { all, get } from './registry.js'
import { DEPTH, END_DOOR, FLOOR_H, FRONT, LENGTH, START_DOOR, WALK, wx } from './constants.js'

export { DEPTH, END_DOOR, FLOOR_H, FRONT, LENGTH, START_DOOR, WALK, wx }
export const SHOP_DEPTH = 3.5
const STAIR = { inner: 4.6, outer: 5.6, length: 10.5 }
const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1
const span = b => [b.z - b.w / 2, b.z + b.w / 2]

export function layoutStreet(world) {
  const r = rng(world.seed), style = world.street.style, tall = world.street.height
  const walls = [world.palette.wallA, world.palette.wallB, world.palette.wallC]
  const buildings = []
  for (const side of [-1, 1]) {
    let z = -2
    while (z > -LENGTH + 4) {
      const w = 6 + r() * 4
      const floors = 1 + Math.floor(r() * (1.5 + tall * (style === 'gothic' ? 4 : 3)))
      buildings.push({ id: buildings.length, side, z: z - w / 2, w, floors, wall: walls[Math.floor(r() * 3)], roll: r(), room: null, roof: false })
      z -= w + .3 + r() * .8
    }
  }

  const stairs = []
  const clearOfStairs = b => !stairs.some(s => s.side === b.side && overlaps(...span(b), s.top - 2, s.bottom + 1))
  const candidates = ({ side, minZ = -LENGTH, maxZ = 10 } = {}) =>
    buildings.filter(b => !b.room && !b.roof && (side == null || b.side === side) && b.z > minZ && b.z < maxZ && clearOfStairs(b))
  const placeRooms = rooms => {
    for (const room of rooms) for (const { b, ...extra } of room.place({ world, r, candidates, overlaps })) {
      Object.assign(b, extra); b.room = room.id; b.doorZ = room.door ? room.door(b) : b.z
    }
  }
  const rooms = all('room').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  placeRooms(rooms.filter(room => (room.order ?? 0) <= 0))

  // Rooftops: two wide buildings with an outside stair along the kerb, rising toward -Z.
  for (const b of buildings.filter(b => !b.room && b.w >= 7 && b.z < -30 && b.z > -LENGTH + 20).sort(() => r() - .5)) {
    if (stairs.length >= 2) break
    const top = b.z + b.w / 2 - .3, bottom = top + STAIR.length
    if (buildings.some(o => o.side === b.side && o !== b && o.room && overlaps(...span(o), top - 2, bottom + 1)) || stairs.some(s => Math.abs(s.top - top) < 30)) continue
    b.roof = true; b.floors = 2
    stairs.push({ side: b.side, building: b.id, top, bottom, height: 2 * FLOOR_H + .2, z0: b.z - b.w / 2, z1: b.z + b.w / 2 })
  }
  placeRooms(rooms.filter(room => (room.order ?? 0) > 0))

  // Interactions + coins from every room, then props.
  const interact = [], obstacles = [], props = []
  let coins = Array.from({ length: 40 }, () => [(r() - .5) * 8, 1.15, -8 - r() * (LENGTH - 12)])
  for (const b of buildings.filter(b => b.room)) {
    const room = get('room', b.room)
    for (const it of room.interactions?.(b, world) ?? []) interact.push({ ...it, pos: [wx(b.side, it.u), it.z] })
    for (const [u, z] of room.coins?.(b, r) ?? []) coins.push([wx(b.side, u), 1.15, z])
  }
  for (const s of stairs) for (let i = 0; i < 4; i++) coins.push([wx(s.side, 1.2 + r() * 4.6), s.height + 1.15, s.z0 + .8 + r() * (s.z1 - s.z0 - 1.6)])
  for (const prop of all('prop')) for (const inst of prop.place({ world, r, buildings, stairs }) ?? []) {
    props.push({ ...inst, prop: prop.id })
    const ob = prop.obstacle?.(inst); if (ob) obstacles.push(ob)
    for (const it of prop.interactions?.(inst) ?? []) interact.push(it)
  }
  coins = coins.filter(([x, , z]) => !obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.radius + .3))

  const shops = buildings.filter(b => b.room === 'shop').sort((a, b) => a.shop - b.shop)
    .map(b => ({ ...world.shops[b.shop], index: b.shop, side: b.side, z: b.z, w: b.w, building: b.id }))
  const homes = buildings.filter(b => b.room === 'home').map(b => ({ side: b.side, z: b.z, w: b.w, building: b.id, doorZ: b.doorZ }))
  return { buildings, shops, homes, stairs, props, obstacles, interact, coins }
}

// ---------- walk physics ----------
const box = (side, u0, u1, z0, z1) => { const a = wx(side, u0), b = wx(side, u1); return { x0: Math.min(a, b), x1: Math.max(a, b), z0, z1 } }
const inside = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
const xBand = (side, a, b) => ({ x0: Math.min(side * a, side * b), x1: Math.max(side * a, side * b) })

export function makePhysics(layout) {
  const rooms = []
  for (const b of layout.buildings.filter(b => b.room)) {
    const def = get('room', b.room)
    const room = { ...box(b.side, .45, def.depth ? def.depth(b) : DEPTH - .45, b.z - b.w / 2 + .45, b.z + b.w / 2 - .45),
      blockers: (def.blockers?.(b) ?? []).map(([u0, u1, z0, z1]) => box(b.side, u0, u1, z0, z1)) }
    rooms.push(room, { ...xBand(b.side, WALK - .3, FRONT + .6), z0: b.doorZ - .5, z1: b.doorZ + .5, blockers: [] }) // + doorway
  }
  const decks = layout.stairs.flatMap(s => [
    { ...box(s.side, .4, DEPTH - .4, s.z0 + .4, s.z1 - .4), h: s.height }, // roof
    { ...xBand(s.side, STAIR.inner, FRONT + .6), z0: s.top - 1.6, z1: s.top, h: s.height }, // landing
  ])
  const ramps = layout.stairs.map(s => ({ ...xBand(s.side, STAIR.inner, STAIR.outer), z0: s.top, z1: s.bottom, s }))
  const carves = layout.stairs.map(s => ({ side: s.side, z0: s.top - 1.6, z1: s.bottom - .6 })) // only get on at the stair's foot
  const onStreet = (x, z) => Math.abs(x) < WALK && z < 8.6 && z > -LENGTH - 4.2
    && !carves.some(c => z > c.z0 && z < c.z1 && c.side * x > STAIR.inner - .15)
    && !layout.obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.radius)
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
