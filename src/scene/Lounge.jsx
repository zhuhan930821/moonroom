import { useMemo } from 'react'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import { FLAGS } from '../config/flags'
import GLBAsset from './AssetModel'

// F01: low cloud sofa, seat facing the window so the `beanbag` camera pose looks out over the arches.
// Sofa is drawn at SOFA_SCALE; collider/anchor sizes below are in the unscaled model space.
const SOFA_SCALE = .85
const SOFA_COLLIDERS = [{name:'Lounge_Collider',position:[0,.55,0],size:[3.6,1.1,2.35]}]
const LEGACY_COLLIDERS = [{name:'Lounge_Collider',position:[0,.7,0],size:[3.35,1.4,3.45]}]
const LOUNGE_ANCHORS = [{name:'Lounge_Interaction',position:[0,1,1.4]}]

export default function Lounge(){
  // The sofa back faces the room entrance; lift it to cream boucle so it reads soft rather than a dark slab.
  const backMaterials = useMemo(() => ({ CS_Back_Frame: new THREE.MeshStandardMaterial({ color:'#d8b2b9', roughness:.96 }) }), [])
  if (FLAGS.loungeLegacy) return <GLBAsset url="/assets/models/reclining-lounge.glb" position={FURNITURE.beanbag.position} rotation={[0,-.18,0]} collisionMeshes={LEGACY_COLLIDERS} interactionAnchors={LOUNGE_ANCHORS} fallbackScale={1.4}/>
  return <GLBAsset url="/assets/models/lounge/cloud-sofa.glb" position={FURNITURE.beanbag.position} rotation={[0,Math.PI-.12,0]} scale={SOFA_SCALE} nodeMaterials={backMaterials} collisionMeshes={SOFA_COLLIDERS} interactionAnchors={LOUNGE_ANCHORS} fallbackScale={1.4}/>
}
