import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// The room-dressing model merges many props into a few batched meshes, so a single prop can't be
// hidden by name. Each cut removes the triangles of the named meshes that sit inside a world box.
export const CUTS = [
  // The flat-leaved potted plant crowding the front of the drum rug.
  { name: 'drum-rug plant', meshes: /^Batched_(Warm_Ceramic|Plant_Stems|Plant_Leaves)$/, box: [[-5.55, -.05, -2.8], [-4.0, 1.5, -1.25]] },
]

// Pure: which triangles of a position/index pair have their centre inside `box` (world space).
export function trianglesOutside(positions, index, matrix, box) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), keep = []
  const count = index ? index.length : positions.length / 3
  for (let t = 0; t < count; t += 3) {
    const i0 = index ? index[t] : t, i1 = index ? index[t + 1] : t + 1, i2 = index ? index[t + 2] : t + 2
    a.fromArray(positions, i0 * 3).applyMatrix4(matrix); b.fromArray(positions, i1 * 3).applyMatrix4(matrix); c.fromArray(positions, i2 * 3).applyMatrix4(matrix)
    const x = (a.x + b.x + c.x) / 3, y = (a.y + b.y + c.y) / 3, z = (a.z + b.z + c.z) / 3
    const inside = x > box[0][0] && x < box[1][0] && y > box[0][1] && y < box[1][1] && z > box[0][2] && z < box[1][2]
    if (!inside) keep.push(i0, i1, i2)
  }
  return keep
}

export default function DecorCuts() {
  const scene = useThree(state => state.scene)
  const done = useRef(new Set())
  useFrame(() => {
    if (done.current.size === CUTS.length) return
    for (const cut of CUTS) {
      if (done.current.has(cut.name)) continue
      const meshes = []
      scene.traverse(o => { if (o.isMesh && cut.meshes.test(o.name)) meshes.push(o) })
      if (!meshes.length) continue // model still loading
      done.current.add(cut.name)
      for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, false)
        const g = mesh.geometry, index = g.index ? g.index.array : null
        const keep = trianglesOutside(g.attributes.position.array, index, mesh.matrixWorld, cut.box)
        if (keep.length === (index ? index.length : g.attributes.position.count)) continue
        const copy = g.clone() // the geometry may be shared with other clones of the model
        copy.setIndex(keep)
        mesh.geometry = copy
      }
    }
  })
  return null
}
