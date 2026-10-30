import { ContactShadows } from '@react-three/drei'
import { FURNITURE } from '../config/scene'
import GLBAsset from './AssetModel'
import { useLighting } from '../lighting/LightingContext'
import { FLAGS } from '../config/flags'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { roomState } from '../game/roomState'

const HIDDEN_VELVET = ['Batched_Plum_Curtain_Velvet']
// The baked walnut music shelf; ReferenceDecor draws a lighter score shelf in its place.
const MUSIC_SHELF = ['Music_Shelf_Back', 'Batched_Walnut_Wood', 'Batched_Book_Burgundy', 'Batched_Book_Indigo', 'Batched_Book_Ochre', 'Batched_Vinyl_Black', 'Batched_Aged_Paper']
const HIDDEN_WITH_VELVET = [...MUSIC_SHELF, ...HIDDEN_VELVET]

export default function DrumCorner() {
  const { cinematic } = useLighting()
  const voileSample = FLAGS.voile
  const corner = useRef(), level = useRef(1)
  // Floor lamp shade glow follows the lamp switch.
  useFrame((_, dt) => {
    level.current += ((roomState.get().lamps.floor ? 1 : .03) - level.current) * (1 - Math.exp(-dt * 4))
    const shade = corner.current?.getObjectByName('Lamp_Shade')
    shade?.traverse?.(node => { if (node.material?.name === 'Lamp_Cream_Fabric') { node.material.userData.base ??= node.material.emissiveIntensity; node.material.emissiveIntensity = node.material.userData.base * level.current } })
  })
  return <GLBAsset ref={corner} url="/assets/models/drum-corner.glb" position={FURNITURE.drums.position} hiddenNodes={voileSample ? HIDDEN_WITH_VELVET : MUSIC_SHELF}>
    <GLBAsset url="/assets/models/botanical/monstera-plant.glb" position={[-2.05, 0, -3.62]} rotation={[0, .55, 0]} scale={1.05} axisCorrection={false} castShadow={false}/>
    <GLBAsset url="/assets/models/botanical/monstera-plant.glb" position={[2.25, 0, -3.55]} rotation={[0, 2.1, 0]} scale={1.16} axisCorrection={false} castShadow={false}/>
    {!cinematic && <><pointLight position={[-2.48, 2.32, -.20]} color="#ffaf62" intensity={24} distance={5.4} decay={2} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight position={[1.5, 3.3, -3.8]} color="#80a8ff" intensity={9} distance={7.5} decay={2}/>
    <pointLight position={[-1.65, 4.15, -3.7]} color="#ffc06b" intensity={3.5} distance={2.2} decay={2}/>
    <pointLight position={[1.7, 4.0, -3.72]} color="#ffc06b" intensity={3.5} distance={2.2} decay={2}/></>}
    <ContactShadows position={[0, .08, .05]} scale={5.7} opacity={.38} blur={2.1} far={2.4} resolution={512} frames={1}/>
  </GLBAsset>
}
