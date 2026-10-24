import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import EntryDoor from '../scene/EntryDoor'

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
// Light spilling from the door's gap across the floor, so you notice it from the room: a soft
// fan that widens and fades away from the door, breathing with the glow, with a few motes in it.
function FloorSpill({ color = '#cfe8ff', length = 7 }) {
  const fan = useRef(), motes = useRef()
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512
    const g = c.getContext('2d')
    const fade = g.createLinearGradient(0, 0, 0, 512); fade.addColorStop(0, 'rgba(255,255,255,.9)'); fade.addColorStop(.35, 'rgba(255,255,255,.35)'); fade.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = fade; g.beginPath(); g.moveTo(98, 0); g.lineTo(158, 0); g.lineTo(256, 512); g.lineTo(0, 512); g.closePath(); g.fill()
    g.globalCompositeOperation = 'destination-in' // soften the fan's long edges
    const side = g.createLinearGradient(0, 0, 256, 0); side.addColorStop(0, 'rgba(0,0,0,0)'); side.addColorStop(.3, 'rgba(0,0,0,1)'); side.addColorStop(.7, 'rgba(0,0,0,1)'); side.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = side; g.fillRect(0, 0, 256, 512)
    return new THREE.CanvasTexture(c)
  }, [])
  const dots = useMemo(() => Array.from({ length: 24 }, (_, i) => [(Math.sin(i * 12.9) * .5) * (.6 + (i % 5) * .25), .2 + (i % 7) * .28, .4 + (i * .37) % (length * .7)]), [length])
  const positions = useMemo(() => new Float32Array(dots.length * 3), [dots])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (fan.current) fan.current.material.opacity = .4 + Math.sin(t * 1.3) * .1
    dots.forEach(([x, y, z], i) => { positions[i * 3] = x + Math.sin(t * .3 + i) * .15; positions[i * 3 + 1] = y + Math.sin(t * .5 + i * 2) * .2; positions[i * 3 + 2] = z })
    if (motes.current) motes.current.geometry.attributes.position.needsUpdate = true
  })
  return <group>
    <mesh ref={fan} position={[0, .025, length / 2 + .05]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[4.2, length]}/>
      <meshBasicMaterial map={texture} color={new THREE.Color(color).multiplyScalar(.55)} transparent opacity={.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
    </mesh>
    <points ref={motes}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
      <pointsMaterial color={color} size={.05} transparent opacity={.7} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
  </group>
}

export default function AnywhereDoor() {
  return <>
    <group position={ROOM_DOOR.position} rotation-y={ROOM_DOOR.rotationY}><DoorModel/><FloorSpill/></group>
    <EntryDoor/>{/* the room's real front door, closing the open doorway in the entry wall */}
  </>
}
