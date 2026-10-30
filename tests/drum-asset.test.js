import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('default licensed drum GLB retains all independently animated roots', () => {
  const bytes = readFileSync(new URL('../public/assets/models/candidates/art-katja-drum-kit-moonroom.glb', import.meta.url))
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF')
  const jsonLength = bytes.readUInt32LE(12)
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
  const nodes = new Map(gltf.nodes.map(node => [node.name, node]))
  for (const name of ['Kick', 'Snare', 'Tom_One', 'Tom_Two', 'Floor_Tom', 'HiHat_Top', 'Crash', 'Ride']) {
    assert.ok(nodes.has(name), `${name} interaction root is missing`)
    assert.ok(nodes.get(name).children?.length, `${name} has no visual children`)
  }
})
