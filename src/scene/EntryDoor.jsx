import * as THREE from 'three'

// The architecture leaves the entrance doorway (centre of the entry wall, x ±1.06, up to the
// lintel at 2.95 m) open to the sky. Close it with the room's own front door: panelled wood,
// brass knob, and a backing slab so nothing outside ever shows through.
const WOOD = '#6e4a3c', PANEL = '#7d5646', W = 2.14, H = 2.92, Z = 8.03
export default function EntryDoor() {
  return <group position={[0, 0, Z]}>
    <mesh position={[0, H / 2, .12]}><boxGeometry args={[W + .1, H + .06, .06]}/><meshStandardMaterial color="#3a2a28" roughness={.9}/></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * W / 4, 0, 0]}>
      <mesh position-y={H / 2} castShadow receiveShadow><boxGeometry args={[W / 2 - .02, H, .1]}/><meshStandardMaterial color={WOOD} roughness={.7}/></mesh>
      {[[2.05, 1.1], [.75, .95]].map(([y, h], i) => <mesh key={i} position={[0, y, -.055]}>
        <boxGeometry args={[W / 2 - .32, h, .02]}/><meshStandardMaterial color={PANEL} roughness={.65}/></mesh>)}
      <mesh position={[-s * (W / 4 - .14), 1.05, -.09]}><sphereGeometry args={[.05, 14, 10]}/><meshStandardMaterial color="#e2b866" metalness={.9} roughness={.25}/></mesh>
    </group>)}
    <mesh position={[0, .02, -.25]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.6, .6]}/><meshStandardMaterial color={new THREE.Color('#8a5a6a')} roughness={1}/></mesh>
  </group>
}
