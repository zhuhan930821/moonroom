import { useSyncExternalStore } from 'react'
import SouvenirMesh from './SouvenirMesh'
import { worldState } from './worldState'

// Wall shelf beside the door: souvenirs from your trips, newest at the left of the top shelf.
export const SHELF = { position: [-6.6, 0, 7.82] }
export default function SouvenirShelf() {
  const { souvenirs } = useSyncExternalStore(worldState.subscribe, worldState.get)
  return <group position={SHELF.position} rotation-y={Math.PI}>
    {[1.15, 1.85].map(y => <mesh key={y} position={[0, y, .17]} castShadow receiveShadow><boxGeometry args={[1.9, .06, .34]}/><meshStandardMaterial color="#9a6c55" roughness={.8}/></mesh>)}
    {souvenirs.slice(0, 10).map((item, i) => <SouvenirMesh key={item.id} shape={item.shape} color={item.color} glow={item.glow * .7} spin={false}
      position={[-.72 + (i % 5) * .36, (i < 5 ? 1.85 : 1.15) + .17, .17]} scale={.95}/>)}
  </group>
}
