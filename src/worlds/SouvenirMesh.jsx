import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// One small object per souvenir shape (~0.3 m), shared by worlds and the room's shelf.
// `glow` drives an emissive core; `spin` turns it slowly like an object on display.
export default function SouvenirMesh({ shape, color, glow = .6, spin = true, scale = 1, ...props }) {
  const group = useRef()
  const c = useMemo(() => new THREE.Color(color), [color])
  const emissive = useMemo(() => c.clone().multiplyScalar(.4 + glow * 1.6), [c, glow])
  useFrame(({ clock }, dt) => {
    if (!group.current) return
    if (spin) group.current.rotation.y += dt * .5
    group.current.position.y = Math.sin(clock.elapsedTime * 1.4) * .02
  })
  const mat = <meshStandardMaterial color={c} emissive={emissive} emissiveIntensity={.6 + glow} roughness={.35} metalness={.1}/>
  const glass = <meshPhysicalMaterial color="#ffffff" transmission={.85} roughness={.08} thickness={.05} transparent opacity={.55}/>
  const metal = <meshStandardMaterial color="#d9c29a" metalness={.85} roughness={.3}/>
  return <group scale={scale} {...props}><group ref={group}>
    {shape === 'stone' && <mesh scale={[1, .7, .85]}><icosahedronGeometry args={[.13, 2]}/>{mat}</mesh>}
    {shape === 'shell' && <mesh rotation-x={-.4}><torusKnotGeometry args={[.07, .035, 80, 12, 2, 5]}/>{mat}</mesh>}
    {shape === 'bottle' && <group>
      <mesh><cylinderGeometry args={[.07, .08, .22, 20]}/>{glass}</mesh>
      <mesh position-y={-.01} scale={[.9, .8, .9]}><sphereGeometry args={[.07, 16, 12]}/>{mat}</mesh>
      <mesh position-y={.14}><cylinderGeometry args={[.03, .035, .06, 12]}/><meshStandardMaterial color="#9b6a4a" roughness={.8}/></mesh>
    </group>}
    {shape === 'feather' && <group rotation-z={.5}>
      <mesh scale={[.35, 1, .05]}><sphereGeometry args={[.15, 20, 12]}/>{mat}</mesh>
      <mesh position-y={-.17}><cylinderGeometry args={[.006, .006, .12, 6]}/>{metal}</mesh>
    </group>}
    {shape === 'key' && <group rotation-z={Math.PI / 2}>
      <mesh position-x={-.1}><torusGeometry args={[.05, .015, 10, 24]}/>{metal}</mesh>
      <mesh position-x={.04}><cylinderGeometry args={[.012, .012, .2, 8]} /><meshStandardMaterial color="#d9c29a" metalness={.85} roughness={.3}/></mesh>
      <mesh position={[.11, -.025, 0]}><boxGeometry args={[.02, .04, .015]}/>{metal}</mesh>
      <mesh position-x={-.1}><sphereGeometry args={[.03, 12, 10]}/>{mat}</mesh>
    </group>}
    {shape === 'star' && <mesh><octahedronGeometry args={[.13, 0]}/>{mat}</mesh>}
    {shape === 'lantern' && <group>
      <mesh position-y={-.1}><cylinderGeometry args={[.08, .09, .03, 16]}/>{metal}</mesh>
      <mesh><cylinderGeometry args={[.07, .07, .17, 16]}/>{glass}</mesh>
      <mesh><sphereGeometry args={[.04, 12, 10]}/>{mat}</mesh>
      <mesh position-y={.1}><coneGeometry args={[.09, .07, 16]}/>{metal}</mesh>
      <mesh position-y={.16}><torusGeometry args={[.025, .006, 6, 16]}/>{metal}</mesh>
    </group>}
    {shape === 'seed' && <group>
      <mesh scale={[.7, 1, .7]}><sphereGeometry args={[.1, 20, 14]}/>{mat}</mesh>
      <mesh position-y={.11} rotation-z={.3} scale={[.4, 1, .15]}><sphereGeometry args={[.05, 12, 8]}/><meshStandardMaterial color="#8fd18a" roughness={.6}/></mesh>
    </group>}
    {glow > .2 && <pointLight color={c} intensity={glow * 1.2} distance={2.2} decay={2}/>}
  </group></group>
}
