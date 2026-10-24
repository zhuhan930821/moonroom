import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'

const URL = '/assets/models/bookshelf/wooden-bookcases-with-diary.glb'
const BOOK_LAYERS = {
  left: ['Victorian Bookcase Small Books 5'],
  right: ['Victorian Bookcase Tall Books 4'],
}
const normalizeName = name => name.replace(/[_\s]+/g, ' ').trim().toLowerCase()
function findGroup(root, name) {
  let found = null
  root.traverse(node => {
    if (!found && !node.isMesh && normalizeName(node.name) === normalizeName(name)) found = node
  })
  return found
}

function Case({ side, pulledBook, activeShelf }) {
  const { scene } = useGLTF(URL)
  const { model, layers } = useMemo(() => {
    const model = scene.clone(true)
    const tall = findGroup(model, 'Victorian Bookcase Tall')
    const short = findGroup(model, 'Victorian Bookcase Small')
    if (side === 'left') {
      if (tall) tall.visible = false
      // The source places the short case beside the tall one. Center its own
      // footprint and put its base on the floor before placing it in Moonroom.
      model.updateMatrixWorld(true)
      if (short) {
        const bounds = new THREE.Box3().setFromObject(short)
        const center = bounds.getCenter(new THREE.Vector3())
        model.position.set(-center.x, -bounds.min.y, -center.z)
      }
    } else if (short) short.visible = false
    const layers = BOOK_LAYERS[side].map(name => {
      const node = findGroup(model, name)
      return node ? { node, restX: node.position.x, restZ: node.position.z } : null
    })
    model.traverse(node => {
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true }
    })
    return { model, layers }
  }, [scene, side])
  const selected = activeShelf === side && pulledBook != null ? pulledBook % layers.length : -1
  useFrame((_, delta) => {
    layers.forEach((layer, i) => {
      if (!layer) return
      const pull = i === selected ? .12 : 0
      // The short case is angled in the supplied GLB, so its outward direction
      // has both local X and Z components.
      const targetX = layer.restX + pull * (side === 'left' ? .638 : 1)
      const targetZ = layer.restZ - pull * (side === 'left' ? .77 : 0)
      const blend = 1 - Math.exp(-delta * 6)
      layer.node.position.x += (targetX - layer.node.position.x) * blend
      layer.node.position.z += (targetZ - layer.node.position.z) * blend
    })
  })
  const position = FURNITURE[side === 'left' ? 'bookshelfLeft' : 'bookshelf'].position
  return <group position={position} rotation-y={side === 'left' ? Math.PI / 2 : -Math.PI / 2} scale={side === 'left' ? 1.8 : 2.5}>
    <primitive object={model}/>
  </group>
}

export default function Bookshelves(props) {
  return <>
    <pointLight position={[-6.8, 1.75, -5.8]} color="#ffe1c0" intensity={3.5} distance={4} decay={2}/>
    <Case side="left" {...props}/>
    <Case side="right" {...props}/>
  </>
}

useGLTF.preload(URL)
