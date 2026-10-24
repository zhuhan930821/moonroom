import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { forwardRef, useMemo, useRef } from 'react'
import { energy } from '../audio/musicBus'
import { roomState } from '../game/roomState'

export const RoundedBox = forwardRef(function RoundedBox({ args, color, ...props }, ref) {
  return <mesh ref={ref} castShadow receiveShadow {...props}><boxGeometry args={args} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
})

export function StarField({ hit }) {
  const material=useRef(),lastId=useRef(0),flash=useRef(0)
  const geometry=useMemo(()=>new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, i) => {
    const a = (i * 2.399) % (Math.PI * 2); const r = 16 + (i % 17) * .9
    return new THREE.Vector3(Math.sin(a)*r, 3 + (i%23)*.7, -12-Math.cos(a)*r)
  })),[])
  useFrame(({clock})=>{
    // Cymbals light up the sky; any note gives a faint shimmer.
    flash.current=energy('cymbal',1.2)*.45+energy('any',2)*.12
    if(material.current){material.current.opacity=Math.min(1,.55+Math.sin(clock.elapsedTime*.7)*.08+flash.current)*(1-roomState.get().dawn*.9)*(1-roomState.get().day);material.current.size=.09+energy('cymbal',1.2)*.05}
  })
  return <points geometry={geometry}><pointsMaterial ref={material} size={.09} color="#fff1ce" sizeAttenuation transparent opacity={.6}/></points>
}
