import test from 'node:test'
import assert from 'node:assert/strict'
import { all, define, get, ids } from '../src/stroll/registry.js'
import { PRESETS, STROLL_SCHEMA, normalizeStroll } from '../src/stroll/spec.js'
import { layoutStreet, makePhysics, wx } from '../src/stroll/layout.js'

test('built-in content is registered', () => {
  for (const kind of ['theme', 'style', 'room', 'prop', 'interaction', 'species']) assert.ok(all(kind).length, kind)
  assert.deepEqual(STROLL_SCHEMA.properties.street.properties.style.enum, ids('style'))
  for (const room of all('room')) for (const it of room.interactions?.({ z: 0, w: 8, side: 1, shop: 0, found: { name: 'x' }, id: 1 }, normalizeStroll({ ...PRESETS[0], seed: 3 })) ?? []) assert.ok(get('interaction', it.kind), `${room.id} → ${it.kind}`)
})

test('a new room, prop, interaction and style plug in without touching the engine', () => {
  define('style', { id: 'treehouse', label: '树屋' })
  define('interaction', { id: 'read', label: () => '翻开留言簿', use: () => {} })
  define('room', {
    id: 'library', order: 20,
    place: ({ candidates }) => candidates({ maxZ: -20 }).slice(0, 2).map(b => ({ b })),
    blockers: b => [[3, 4, b.z - .5, b.z + .5]],
    interactions: b => [{ kind: 'read', u: 2.5, z: b.z, radius: 1.5 }],
  })
  define('prop', { id: 'bench', place: () => [{ x: 3.8, z: -40 }], obstacle: p => ({ x: p.x, z: p.z, radius: .6 }) })

  const world = normalizeStroll({ ...PRESETS[0], street: { ...PRESETS[0].street, style: 'treehouse' }, seed: 42 })
  assert.equal(world.street.style, 'treehouse', 'Claude/normalize accept the new style')
  const layout = layoutStreet(world), { walkable } = makePhysics(layout)
  const libraries = layout.buildings.filter(b => b.room === 'library')
  assert.equal(libraries.length, 2)
  for (const b of libraries) {
    assert.ok(walkable(wx(b.side, 1.5), b.doorZ), 'walk into the library')
    assert.equal(walkable(wx(b.side, 3.5), b.z), false, 'its desk blocks')
    assert.ok(layout.interact.some(it => it.kind === 'read' && it.pos[1] === b.z))
  }
  assert.ok(layout.props.some(p => p.prop === 'bench')); assert.equal(walkable(3.8, -40), false)
})

test('café, library, musician and cat appear on every street and stay reachable', async () => {
  const { pageFor, writeBook, readBook } = await import('../src/stroll/content/guestbook.js')
  for (const preset of PRESETS) for (const seed of [11, 222, 3333]) {
    const world = normalizeStroll({ ...preset, seed }), layout = layoutStreet(world), { walkable } = makePhysics(layout)
    for (const room of ['cafe', 'library']) {
      const b = layout.buildings.find(b => b.room === room)
      assert.ok(b, `${world.name}/${seed} has a ${room}`)
      assert.ok(walkable(wx(b.side, 1.2), b.doorZ), `${room} door`)
    }
    for (const it of layout.interact.filter(it => ['order', 'guestbook', 'tip', 'pet', 'sit'].includes(it.kind)))
      assert.ok([[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6], [.9, .9], [-.9, -.9], [.9, -.9], [-.9, .9], [1.2, 0], [-1.2, 0]].some(([dx, dz]) => walkable(it.pos[0] + dx, it.pos[1] + dz)), `${it.kind} reachable`)
    assert.ok(layout.props.some(p => p.prop === 'musician') && layout.props.some(p => p.prop === 'cat'))
  }
  assert.equal(pageFor(5, []).strangers.length, 3)
  assert.equal(writeBook({ text: '  ' }), null)
  assert.ok(Array.isArray(readBook()))
})
