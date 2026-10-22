import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { FURNITURE } from '../config/scene'
import GLBAsset from './AssetModel'

const HIT_NODES = { kick:'Kick', snare:'Snare', hihat:'HiHat_Top', tom1:'Tom_One', tom2:'Tom_Two', floor:'Floor_Tom', crash:'Crash', ride:'Ride' }
const DRUM_COLLIDERS = [{name:'DrumKit_Collider',position:[0,1.05,0],size:[4.2,2.1,3.8]}]
const DRUM_ANCHORS = [{name:'DrumThrone_Interaction',position:[-.22,1.1,1.4]}]

export default function DrumKit({ hit }) {
  const model = useRef()
  const lastId = useRef(0)
  const active = useRef({ name:'', strength:0 })
  useFrame((_, dt) => {
    if (hit.id !== lastId.current) {
      lastId.current = hit.id
      active.current = { name:hit.name, strength:1 }
    }
    active.current.strength = Math.max(0, active.current.strength - dt * 6)
    const root = model.current
    if (!root) return
    Object.entries(HIT_NODES).forEach(([kind, nodeName]) => {
      const node = root.getObjectByName(nodeName)
      if (!node) return
      const amount = kind === active.current.name ? active.current.strength : 0
      const cymbal = kind === 'hihat' || kind === 'crash' || kind === 'ride'
      node.rotation.z = cymbal ? Math.sin(performance.now() * .045) * amount * .12 : 0
      node.scale.y = 1 - amount * (cymbal ? .02 : .08)
    })
  })
  return <GLBAsset ref={model} url="/assets/models/acoustic-drum-kit.glb" position={FURNITURE.drums.position} collisionMeshes={DRUM_COLLIDERS} interactionAnchors={DRUM_ANCHORS} fallbackScale={1.5}/>
}
