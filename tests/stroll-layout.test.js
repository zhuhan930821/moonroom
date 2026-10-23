import test from 'node:test'
import assert from 'node:assert/strict'
import { PRESETS, normalizeStroll } from '../src/stroll/spec.js'
import { DEPTH, FRONT, layoutStreet, makePhysics, wx } from '../src/stroll/layout.js'

const worlds = [1, 2, 3, 4, 5].flatMap(seed => PRESETS.map(p => normalizeStroll({ ...p, seed: seed * 7919 })))

test('every shop can be walked into through its door, up to the counter but not behind it', () => {
  for (const world of worlds) {
    const layout = layoutStreet(world), { walkable } = makePhysics(layout)
    for (const s of layout.shops) {
      for (let u = -1.5; u <= 3; u += .25) assert.ok(walkable(wx(s.side, u), s.z), `${world.name} ${s.name}: blocked at depth ${u}`)
      assert.equal(walkable(wx(s.side, 4.2), s.z), false, 'counter')
      assert.equal(walkable(wx(s.side, .1), s.z + s.w / 2 - .2), false, 'front wall beside the door')
    }
  }
})

test('homes open onto the street and their furniture blocks', () => {
  let homes = 0
  for (const world of worlds) {
    const layout = layoutStreet(world), { walkable } = makePhysics(layout)
    for (const h of layout.homes) {
      homes++
      for (let u = -1.5; u <= 1.5; u += .25) assert.ok(walkable(wx(h.side, u), h.doorZ), `${world.name} home door at ${u}`)
      assert.equal(walkable(wx(h.side, 3.2), h.z), false, 'table')
      assert.equal(walkable(wx(h.side, -.05), h.doorZ + 1.4), false, 'wall next to the door')
    }
  }
  assert.ok(homes > worlds.length, `expected a few homes per street, got ${homes}`)
})

test('roof stairs climb smoothly from the street to a walkable roof', () => {
  let roofs = 0
  for (const world of worlds) {
    const layout = layoutStreet(world), { walkable, ground } = makePhysics(layout)
    for (const s of layout.stairs) {
      roofs++
      const x = s.side * 5.1
      let last = 0
      for (let z = s.bottom + .3; z > s.top - 1.4; z -= .2) {
        assert.ok(walkable(x, z), `${world.name} stair at ${z}`)
        const h = ground(x, z); assert.ok(h - last < .3, 'no sudden steps'); last = h
      }
      assert.ok(Math.abs(last - s.height) < 1e-9)
      assert.ok(walkable(wx(s.side, DEPTH / 2), (s.z0 + s.z1) / 2)); assert.equal(ground(wx(s.side, DEPTH / 2), (s.z0 + s.z1) / 2), s.height)
      assert.equal(walkable(x, (s.top + s.bottom) / 2 + 0) && walkable(s.side * 4.5, (s.top + s.bottom) / 2), false, 'cannot climb on from the side')
    }
  }
  assert.ok(roofs >= worlds.length, `roofs: ${roofs}`)
})

test('the street stays walkable end to end and the found item sits in a home', () => {
  for (const world of worlds) {
    const layout = layoutStreet(world), { walkable } = makePhysics(layout)
    for (let z = 6; z > -200; z -= .5) assert.ok([0, -3, 3].some(x => walkable(x, z)), `${world.name} no way through at ${z}`)
    for (const o of layout.obstacles) assert.equal(walkable(o.x, o.z), false, 'props block')
    const found = layout.interact.find(i => i.kind === 'found')
    if (layout.homes.length) assert.ok(found && found.good.price === 0)
  }
  assert.ok(FRONT > 5)
})
