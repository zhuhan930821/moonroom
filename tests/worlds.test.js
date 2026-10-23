import test from 'node:test'
import assert from 'node:assert/strict'
import { CHOICES, ID_SEA, WORLD_SCHEMA, generateOffline, normalize } from '../src/worlds/spec.js'

test('normalize repairs anything the generator or the model gets wrong', () => {
  const w = normalize({ name: '  ', palette: { skyTop: 'red' }, sky: { celestial: 'three-suns', stars: 9 }, landmarks: Array(9).fill({ kind: 'castle', count: 99 }), music: { root: 40, tempo: 3 } })
  assert.equal(w.name, '无名之地')
  assert.match(w.palette.skyTop, /^#[0-9a-f]{6}$/i)
  assert.ok(CHOICES.celestial.includes(w.sky.celestial)); assert.equal(w.sky.stars, 1)
  assert.equal(w.landmarks.length, 4); assert.ok(w.landmarks.every(l => CHOICES.landmark.includes(l.kind) && l.count <= 12))
  assert.equal(w.music.root, 11); assert.equal(w.music.tempo, 50)
})

test('the offline generator is deterministic per seed and always valid', () => {
  assert.deepEqual(generateOffline(42), generateOffline(42))
  for (let seed = 1; seed < 40; seed++) {
    const w = generateOffline(seed)
    assert.deepEqual(normalize(w), w, `seed ${seed} is already normal`)
    assert.ok(w.souvenir.name && CHOICES.souvenir.includes(w.souvenir.shape))
  }
})

test('the strict tool schema requires every field and allows nothing extra', () => {
  const walk = node => {
    if (node.type === 'object') { assert.equal(node.additionalProperties, false); assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort()); Object.values(node.properties).forEach(walk) }
    if (node.type === 'array') walk(node.items)
  }
  walk(WORLD_SCHEMA)
  assert.equal(ID_SEA.souvenir.shape, 'lantern')
})
