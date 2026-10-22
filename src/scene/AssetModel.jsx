import { useGLTF } from '@react-three/drei'
import { forwardRef, Suspense, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'

const EMPTY_OBJECT = Object.freeze({})
const EMPTY_ARRAY = Object.freeze([])

function LoadingFallback({ scale = 1 }) {
  return <mesh scale={scale} castShadow><icosahedronGeometry args={[.38, 1]} /><meshStandardMaterial color="#c9a6d8" wireframe transparent opacity={.45} /></mesh>
}

const LoadedAsset = forwardRef(function LoadedAsset({ url, materialOverrides = EMPTY_OBJECT, nodeMaterials = EMPTY_OBJECT, hiddenNodes = EMPTY_ARRAY, castShadow = true }, forwardedRef) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse(node => {
      if (!node.isMesh) return
      if (hiddenNodes.includes(node.name)) { node.visible = false; return }
      node.castShadow = castShadow
      node.receiveShadow = true
      node.material = node.material.clone()
      const override = materialOverrides[node.material.name]
      if (override) Object.assign(node.material, override)
      if (nodeMaterials[node.name]) node.material = nodeMaterials[node.name]
    })
    return copy
  }, [scene, materialOverrides, nodeMaterials, hiddenNodes, castShadow])
  useImperativeHandle(forwardedRef, () => clone, [clone])
  return <primitive object={clone} />
})

const GLBAsset = forwardRef(function GLBAsset({
  url, position = [0,0,0], rotation = [0,0,0], scale = 1,
  materialOverrides, nodeMaterials, hiddenNodes = EMPTY_ARRAY, collisionMeshes = EMPTY_ARRAY, interactionAnchors = EMPTY_ARRAY,
  fallbackScale = 1, axisCorrection = true, castShadow = true, children,
}, forwardedRef) {
  const assetRef = useRef()
  useImperativeHandle(forwardedRef, () => ({ getObjectByName: name => assetRef.current?.getObjectByName(name) }), [])
  return <group position={position} rotation={rotation} scale={scale}>
    <group rotation-x={axisCorrection ? Math.PI / 2 : 0}>
      <Suspense fallback={<LoadingFallback scale={fallbackScale} />}>
        <LoadedAsset ref={assetRef} url={url} materialOverrides={materialOverrides} nodeMaterials={nodeMaterials} hiddenNodes={hiddenNodes} castShadow={castShadow} />
      </Suspense>
    </group>
    {collisionMeshes.map(({ name, position: p, size, rotation: r = [0,0,0] }) => <mesh key={name} name={name} position={p} rotation={r} visible={false} userData={{ collision: true }}><boxGeometry args={size} /><meshBasicMaterial /></mesh>)}
    {interactionAnchors.map(({ name, position: p }) => <group key={name} name={name} position={p} userData={{ interactionAnchor: true }} />)}
    {children}
  </group>
})

export default GLBAsset

export function preloadCoreAssets() {
  useGLTF.preload('/assets/models/candidates/C02-dream-crt-review.glb')
  useGLTF.preload('/assets/models/candidates/C04-studio-speaker-review.glb')
  useGLTF.preload('/assets/models/acoustic-drum-kit.glb')
  useGLTF.preload('/assets/models/lounge/cloud-sofa.glb')
  useGLTF.preload('/assets/models/drum-corner.glb')
  useGLTF.preload('/assets/models/candidates/art-katja-drum-kit-moonroom.glb')
  useGLTF.preload('/assets/models/lounge/moon-breathing-lamp.glb')
}
