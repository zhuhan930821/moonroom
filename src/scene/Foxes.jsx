import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function Fox({ position, scale = 1, rotation = 0, sleeping = false, phase = 0 }) {
  const body = useRef()
  const eyes = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 1.7) * .022
    if (eyes.current && !sleeping) eyes.current.visible = Math.sin(t * 1.35) < .99
  })
  return <group position={position} rotation-y={rotation} scale={scale}>
    <group ref={body}>
      <mesh castShadow position={[0,.32,0]} scale={[.62,.38,.92]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#c77654" roughness={.95} /></mesh>
      <mesh castShadow position={[0,.45,-.74]} rotation-x={-.45} scale={[.34,.34,.72]}><sphereGeometry args={[1,20,14]} /><meshStandardMaterial color="#d79165" roughness={.95} /></mesh>
      <mesh castShadow position={[0,.54,.66]} scale={[.49,.44,.42]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#d88b60" roughness={.96} /></mesh>
      {[-.28,.28].map(x => <mesh key={x} castShadow position={[x,.99,.58]} rotation-z={x<0?.22:-.22}><coneGeometry args={[.21,.42,3]} /><meshStandardMaterial color="#af5e4c" roughness={.9} /></mesh>)}
      <mesh position={[0,.43,1.01]} scale={[.27,.19,.13]}><sphereGeometry args={[1,16,10]} /><meshStandardMaterial color="#f1ddc6" /></mesh>
      <mesh position={[0,.43,1.14]} scale={[.07,.055,.045]}><sphereGeometry args={[1,12,8]} /><meshStandardMaterial color="#382a32" /></mesh>
      <group ref={eyes} visible={!sleeping}>{[-.21,.21].map(x => <mesh key={x} position={[x,.64,1.01]} scale={[.04,.06,.035]}><sphereGeometry args={[1,10,8]} /><meshStandardMaterial color="#332432" /></mesh>)}</group>
    </group>
  </group>
}

export default function Foxes() { return <>
  <Fox position={[6.0,0,6.7]} scale={.54} rotation={-1.4} sleeping phase={0} />
  <Fox position={[3.25,0,4.45]} scale={.54} rotation={-1.15} phase={1.8} />
</> }
