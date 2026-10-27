import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutPhotoWall } from '../src/scene/photoWallLayout.js'
import { BUILTIN_IDS, MAX_HUNG, addUpload, builtinAspect, hungItems, normalize, removeUpload, shuffle, toggle } from '../src/game/photoWall.js'

const corners = p => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
  const x = sx * p.w / 2, y = sy * p.h / 2
  return [p.x + x * Math.cos(p.rot) - y * Math.sin(p.rot), p.y + x * Math.sin(p.rot) + y * Math.cos(p.rot)]
})

test('photo wall layout stays on the wall without overlaps', () => {
  for (const [W, H] of [[5, 1.9], [2.3, .88]]) for (const n of [1, 3, 8, 13, 16, 24]) for (const seed of [1, 2, 7]) {
    const items = BUILTIN_IDS.concat(['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8']).slice(0, n).map((id, i) => ({ id, aspect: i % 3 ? builtinAspect(BUILTIN_IDS[i % 16]) : 1.7 }))
    const out = layoutPhotoWall(items, { seed, width: W, height: H })
    assert.equal(out.length, n)
    for (const p of out) for (const [x, y] of corners(p)) {
      assert.ok(Math.abs(x) <= W / 2 + .02 && Math.abs(y) <= H / 2 + .02, `n=${n} seed=${seed} ${p.id} off the wall at ${x.toFixed(2)},${y.toFixed(2)}`)
    }
    for (let a = 0; a < out.length; a++) for (let b = a + 1; b < out.length; b++) {
      const A = out[a], B = out[b]
      const apart = Math.abs(A.x - B.x) >= (A.w + B.w) / 2 - .01 || Math.abs(A.y - B.y) >= (A.h + B.h) / 2 - .01
      assert.ok(apart, `n=${n} seed=${seed}: ${A.id} overlaps ${B.id}`)
    }
  }
})

test('photo wall layout is staggered, with mixed sizes', () => {
  const out = layoutPhotoWall(BUILTIN_IDS.slice(0, 13).map(id => ({ id, aspect: builtinAspect(id) })), { seed: 1 })
  assert.ok(new Set(out.map(p => p.h.toFixed(2))).size >= 4)
  assert.ok(new Set(out.map(p => (p.y + p.h / 2).toFixed(2))).size >= 4, 'top edges should not all line up')
  assert.deepEqual(layoutPhotoWall([], {}), [])
})

test('choosing which photos hang', () => {
  let s = normalize(null)
  assert.ok(s.hung.length > 0)
  s = toggle(s, s.hung[0]); assert.ok(!s.hung.includes('b0'))
  s = toggle(s, 'b0'); assert.equal(s.hung.at(-1), 'b0')
  s = addUpload(s, { id: 'u1', src: 'data:x', aspect: 1.5 })
  assert.deepEqual(hungItems(s).at(-1), { id: 'u1', aspect: 1.5, src: 'data:x' })
  s = removeUpload(s, 'u1'); assert.ok(!s.hung.includes('u1') && !s.uploads.length)
  assert.equal(shuffle(s).seed, s.seed + 1)
  let full = { ...s, hung: [] }
  for (const id of BUILTIN_IDS) full = toggle(full, id)
  for (let i = 0; i < 20; i++) full = addUpload(full, { id: `u${i}`, src: 'x' })
  assert.equal(full.hung.length, MAX_HUNG)
  assert.deepEqual(normalize({ hung: ['b1', 'nope', 'b1'], uploads: [{ id: 'u9', src: 'x' }], seed: 3 }).hung, ['b1'])
})
