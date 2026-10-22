import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import GLBAsset from './AssetModel'

const MOON_LAMP_POSITION = [4.1, 0, .55]

export default function DreamLoungeProps() {
  const lamp = useRef()
  useFrame(({ clock }) => {
    const material = lamp.current?.getObjectByName('Moon_Globe')?.material
    if (material) material.emissiveIntensity = 1.15 + Math.sin(clock.elapsedTime * .72) * .18
  })
  return <GLBAsset ref={lamp} url="/assets/models/lounge/moon-breathing-lamp.glb" position={MOON_LAMP_POSITION} axisCorrection={false} fallbackScale={.45}/>
}
