import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// The Anywhere Door: a dusty-blue door left slightly ajar, with light spilling from the gap.
// Faces +Z (into the room when placed on the back wall with rotation π).
export function DoorModel({ glow = '#cfe8ff', open = .18 }) {
  const slab = useRef(), light = useRef(), spill = useRef()
  useFrame(({ clock }) => {
    const pulse = .85 + Math.sin(clock.elapsedTime * 1.3) * .15
    if (light.current) light.current.intensity = 6 * pulse
    if (spill.current) spill.current.material.opacity = .55 * pulse
  })
  const W = 1.5, H = 3.1
  return <group>
    {/* frame */}
    {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 + .09), H / 2, 0]} castShadow><boxGeometry args={[.18, H + .1, .3]}/><meshStandardMaterial color="#e8dcc8" roughness={.6}/></mesh>)}
    <mesh position={[0, H + .09, 0]} castShadow><boxGeometry args={[W + .36, .18, .3]}/><meshStandardMaterial color="#e8dcc8" roughness={.6}/></mesh>
    {/* light behind the door */}
    <mesh ref={spill} position={[0, H / 2, -.05]}><planeGeometry args={[W, H]}/><meshBasicMaterial color={new THREE.Color(glow).multiplyScalar(2.2)} transparent opacity={.55} toneMapped={false}/></mesh>
    <pointLight ref={light} position={[.2, H * .55, .7]} color={glow} intensity={6} distance={5} decay={2}/>
    {/* the door, hinged on the left edge and swung slightly open */}
    <group position={[-W / 2, 0, .02]} rotation-y={-open} ref={slab}>
      <mesh position={[W / 2, H / 2, 0]} castShadow><boxGeometry args={[W, H, .08]}/><meshStandardMaterial color="#6f8fc6" roughness={.55}/></mesh>
      {[[.75, 2.15], [.75, .95]].map(([x, y], i) => <mesh key={i} position={[x, y, .045]}><boxGeometry args={[1.1, 1.0, .02]}/><meshStandardMaterial color="#7f9ed2" roughness={.5}/></mesh>)}
      <mesh position={[W - .15, 1.45, .08]}><sphereGeometry args={[.065, 16, 12]}/><meshStandardMaterial color="#e9c46a" metalness={.9} roughness={.25}/></mesh>
    </group>
  </group>
}

// In the room: on the back (entrance) wall, facing the window.
export const ROOM_DOOR = { position: [-4.5, 0, 7.9], rotationY: Math.PI }
export default function AnywhereDoor() {
  return <group position={ROOM_DOOR.position} rotation-y={ROOM_DOOR.rotationY}><DoorModel/></group>
}
