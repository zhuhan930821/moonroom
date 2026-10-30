import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// The architecture model's west loft only spans the back half of the left wall (z 0.67–7.83).
// This doubles it toward the windows by cloning its deck, soffit, joists, front rail, balusters
// and end posts one loft-length forward. Clones share the original geometry and materials, so
// the extension matches exactly. It stops at z ≈ -6.5, clear of the left window arch.
export const LOFT_SHIFT = -7.16
export const LOFT_PART = /^ARCH_(West_Loft_|Loft_)/
// The far end post's clone would land right beside the original near post at the join.
const SKIP = /^ARCH_Loft_End_Post_753$/
// The soffit is 16 cm shorter than the deck, so a straight copy leaves a gap under the join;
// shift it a little less so it butts up against the original.
const SHIFT_FOR = name => name === 'ARCH_West_Loft_Soffit' ? LOFT_SHIFT + .16 : LOFT_SHIFT

export default function LoftExtension() {
  const scene = useThree(state => state.scene)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    const parts = []
    scene.traverse(o => { if (o.isMesh && LOFT_PART.test(o.name) && !o.userData.loftClone) parts.push(o) })
    if (!parts.some(p => p.name === 'ARCH_West_Loft_Deck')) return // architecture still loading
    done.current = true
    const group = new THREE.Group(); group.name = 'LoftExtension'
    for (const part of parts) {
      if (SKIP.test(part.name)) continue
      part.updateWorldMatrix(true, false)
      const copy = new THREE.Mesh(part.geometry, part.material)
      copy.name = `${part.name}_ext`; copy.userData.loftClone = true
      copy.castShadow = part.castShadow; copy.receiveShadow = part.receiveShadow
      copy.matrixAutoUpdate = false
      copy.matrix.multiplyMatrices(new THREE.Matrix4().makeTranslation(0, 0, SHIFT_FOR(part.name)), part.matrixWorld)
      group.add(copy)
    }
    scene.add(group)
  })
  return null
}
