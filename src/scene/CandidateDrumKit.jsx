import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { FURNITURE } from '../config/scene'
import GLBAsset from './AssetModel'
import { animateKit, padFromEvent } from './drumKitHits'

const DRUM_COLLIDERS = [{name:'DrumKit_Collider',position:[0,1.05,0],size:[4.2,2.1,3.8]}]
const DRUM_ANCHORS = [{name:'DrumThrone_Interaction',position:[-.22,1.1,1.4]}]

export default function CandidateDrumKit({ hit, onStrike }) {
  const model = useRef(); const lastId = useRef(0); const active = useRef({})
  useFrame((_, dt) => {
    for (const event of hit.events || []) if (event.id > lastId.current) active.current[event.name] = 1
    lastId.current = hit.id
    for (const pad of Object.keys(active.current)) active.current[pad] = Math.max(0, active.current[pad] - dt * 6)
    const root = model.current; if (!root) return
    animateKit(root, active.current)
  })
  const strike = onStrike && (event => { const pad = padFromEvent(event); if (pad) { event.stopPropagation(); onStrike(pad) } })
  return <group onPointerDown={strike || undefined}><GLBAsset ref={model} url="/assets/models/candidates/art-katja-drum-kit-moonroom.glb" position={FURNITURE.drums.position} axisCorrection={false} collisionMeshes={DRUM_COLLIDERS} interactionAnchors={DRUM_ANCHORS} fallbackScale={1.5}/></group>
}
