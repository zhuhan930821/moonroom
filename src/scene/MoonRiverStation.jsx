import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { journey } from '../game/journey'

// An authored, low-cost 3D destination silhouette, separate from the painted sky.
// Its approach supplies real perspective while the room itself stays in place.
function stationArch() {
  const shape = new THREE.Shape()
  shape.moveTo(-1.7, 0); shape.lineTo(-1.7, 2.55)
  shape.quadraticCurveTo(-1.7, 3.45, 0, 4.3)
  shape.quadraticCurveTo(1.7, 3.45, 1.7, 2.55)
  shape.lineTo(1.7, 0); shape.closePath()
  const opening = new THREE.Path()
  opening.moveTo(-.88, -.04); opening.lineTo(.88, -.04)
  opening.lineTo(.88, 2.35); opening.quadraticCurveTo(.88, 2.95, 0, 3.48)
  opening.quadraticCurveTo(-.88, 2.95, -.88, 2.35); opening.closePath()
  shape.holes.push(opening)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .42, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .07, bevelThickness: .06, curveSegments: 12 })
  geometry.computeVertexNormals()
  return geometry
}

export default function MoonRiverStation() {
  const root = useRef()
  const arch = useMemo(stationArch, [])
  const track = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10, 2.15, 9), new THREE.Vector3(-5, 2.38, 5),
    new THREE.Vector3(-2, 2.35, 2), new THREE.Vector3(0, 2.3, .5),
  ]), [])
  useFrame(() => {
    journey.tick()
    if (!root.current) return
    const { phase } = journey.get()
    root.current.visible = phase === 'travel' || phase === 'arrived'
    const t = journey.progress()
    const eased = t * t * (3 - 2 * t)
    root.current.position.z = -54 + eased * 35
    root.current.position.x = 10.5 - eased * 3.2
    root.current.position.y = 2.7
    root.current.rotation.y = -.2 + eased * .18
  })
  return <group ref={root} visible={false} position={[10.5, 2.7, -54]} scale={.88}>
    <mesh position={[0,-.58,0]} castShadow><cylinderGeometry args={[4.5, 2.7, 1.2, 9]}/><meshBasicMaterial color="#463657" transparent opacity={.76} depthWrite={false}/></mesh>
    <mesh position={[0,-2.25,0]} rotation-z={Math.PI} castShadow><coneGeometry args={[2.6, 2.4, 8]}/><meshBasicMaterial color="#332a4b" transparent opacity={.8} depthWrite={false}/></mesh>
    <mesh position={[0,.12,0]}><cylinderGeometry args={[3.95,4.15,.22,10]}/><meshBasicMaterial color="#59436b" transparent opacity={.72} depthWrite={false}/></mesh>
    {[-2.55,0,2.55].map((x,i) => <group key={x} position={[x,.25,0]}>
      <mesh geometry={arch} scale={i===1?[1,1.08,1]:[.62,.76,1]} position={[0,0,-.35]} castShadow receiveShadow><meshBasicMaterial color="#493655" transparent opacity={.82} depthWrite={false}/></mesh>
      <mesh position={[0,3.1,-.12]}><coneGeometry args={[.32,.82,6]}/><meshStandardMaterial color="#d7b080" metalness={.55} roughness={.38}/></mesh>
      <mesh position={[0,1.2,.1]}><sphereGeometry args={[.16,12,8]}/><meshStandardMaterial color="#ffda94" emissive="#ffb86e" emissiveIntensity={1.4}/></mesh>
    </group>)}
    <mesh position={[0,.36,1.35]}><boxGeometry args={[6.7,.12,1.8]}/><meshBasicMaterial color="#573f63" transparent opacity={.76} depthWrite={false}/></mesh>
    <mesh position={[0,.5,0]}><sphereGeometry args={[.28,16,10]}/><meshStandardMaterial color="#b7f7ef" emissive="#75d7d4" emissiveIntensity={2} transparent opacity={.75}/></mesh>
    <mesh position={[0,.23,0]}><tubeGeometry args={[track,32,.06,6,false]}/><meshStandardMaterial color="#ffe2af" emissive="#ffc679" emissiveIntensity={1.3}/></mesh>
    <pointLight position={[0,2.3,.5]} color="#ffcf9b" intensity={1.5} distance={9}/>
  </group>
}
