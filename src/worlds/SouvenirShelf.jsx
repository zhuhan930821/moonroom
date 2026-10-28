import { useSyncExternalStore } from 'react'
import SouvenirMesh from './SouvenirMesh'
import { worldState } from './worldState'
import { journey } from '../game/journey'

// Wall shelf beside the door: souvenirs from your trips, newest at the left of the top shelf.
export const SHELF = { position: [-6.6, 0, 7.82] }
export default function SouvenirShelf() {
  const { souvenirs } = useSyncExternalStore(worldState.subscribe, worldState.get)
  const { keepsake } = useSyncExternalStore(journey.subscribe, journey.get)
  return <group position={SHELF.position} rotation-y={Math.PI}>
    {[1.15, 1.85].map(y => <mesh key={y} position={[0, y, .17]} castShadow receiveShadow><boxGeometry args={[1.9, .06, .34]}/><meshStandardMaterial color="#9a6c55" roughness={.8}/></mesh>)}
    {keepsake && <group position={[-.72,2.08,.17]} rotation-z={-.15}>
      <mesh castShadow><boxGeometry args={[.25,.15,.025]}/><meshStandardMaterial color="#ead5b8" roughness={.83}/></mesh>
      <mesh position={[0,0,.014]}><boxGeometry args={[.19,.08,.005]}/><meshBasicMaterial color="#a47aa9"/></mesh>
      <mesh position={[.07,.035,.02]}><octahedronGeometry args={[.025,0]}/><meshStandardMaterial color="#fbd79c" emissive="#f4af67" emissiveIntensity={.8}/></mesh>
    </group>}
    {souvenirs.slice(0, keepsake ? 9 : 10).map((item, i) => { const slot = i + Number(keepsake); return <SouvenirMesh key={item.id} shape={item.shape} color={item.color} glow={item.glow * .7} spin={false}
      position={[-.72 + (slot % 5) * .36, (slot < 5 ? 1.85 : 1.15) + .17, .17]} scale={.95}/> })}
  </group>
}
