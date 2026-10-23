import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { forwardRef, useMemo, useRef } from 'react'
import { useLighting } from '../lighting/LightingContext'
import { energy } from '../audio/musicBus'

export const RoundedBox = forwardRef(function RoundedBox({ args, color, ...props }, ref) {
  return <mesh ref={ref} castShadow receiveShadow {...props}><boxGeometry args={args} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
})

export function GlowOrb({ position, color = '#ffd68a', size = 0.12, intensity = 2, light = true }) {
  const { decorationLights } = useLighting()
  const emissiveColor = useMemo(() => new THREE.Color(color).multiplyScalar(2.2), [color])
  return <group position={position}><mesh><sphereGeometry args={[size, 18, 18]} /><meshBasicMaterial color={emissiveColor} toneMapped={false} /></mesh>{light && decorationLights && <pointLight color={color} intensity={intensity} distance={4} />}</group>
}

export function Plant({ position, scale = 1 }) {
  const leaves=useRef()
  useFrame(({clock})=>{if(leaves.current)leaves.current.rotation.z=Math.sin(clock.elapsedTime*.8+position[0])*.045})
  return <group position={position} scale={scale}>
    <mesh castShadow position-y={0.35}><cylinderGeometry args={[0.34, 0.27, 0.7, 12]} /><meshStandardMaterial color="#b9785d" /></mesh>
    <group ref={leaves}>{[[-.2,.9,0],[.22,1.15,.05],[-.1,1.4,-.12],[.3,1.65,0]].map((p,i)=><mesh key={i} position={p} rotation={[0,0,i%2?.5:-.45]} castShadow><sphereGeometry args={[.16,.42,.08,12,8]} /><meshStandardMaterial color={i%2?'#668868':'#496e5a'} /></mesh>)}</group>
  </group>
}

export function StarField({ hit }) {
  const material=useRef(),lastId=useRef(0),flash=useRef(0)
  const geometry=useMemo(()=>new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, i) => {
    const a = (i * 2.399) % (Math.PI * 2); const r = 16 + (i % 17) * .9
    return new THREE.Vector3(Math.sin(a)*r, 3 + (i%23)*.7, -12-Math.cos(a)*r)
  })),[])
  useFrame(({clock})=>{
    // Cymbals light up the sky; any note gives a faint shimmer.
    flash.current=energy('cymbal',1.2)*.45+energy('any',2)*.12
    if(material.current){material.current.opacity=Math.min(1,.55+Math.sin(clock.elapsedTime*.7)*.08+flash.current);material.current.size=.09+energy('cymbal',1.2)*.05}
  })
  return <points geometry={geometry}><pointsMaterial ref={material} size={.09} color="#fff1ce" sizeAttenuation transparent opacity={.6}/></points>
}
