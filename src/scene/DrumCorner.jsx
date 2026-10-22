import { ContactShadows } from '@react-three/drei'
import { FURNITURE } from '../config/scene'
import GLBAsset from './AssetModel'
import { useLighting } from '../lighting/LightingContext'

const HIDDEN_VELVET = ['Batched_Plum_Curtain_Velvet']

export default function DrumCorner() {
  const { cinematic } = useLighting()
  const voileSample = new URLSearchParams(window.location.search).get('voileSample') !== '0'
  return <GLBAsset url="/assets/models/drum-corner.glb" position={FURNITURE.drums.position} hiddenNodes={voileSample ? HIDDEN_VELVET : []}>
    {!cinematic && <><pointLight position={[-2.48, 2.32, -.20]} color="#ffaf62" intensity={24} distance={5.4} decay={2} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight position={[1.5, 3.3, -3.8]} color="#80a8ff" intensity={9} distance={7.5} decay={2}/>
    <pointLight position={[-1.65, 4.15, -3.7]} color="#ffc06b" intensity={3.5} distance={2.2} decay={2}/>
    <pointLight position={[1.7, 4.0, -3.72]} color="#ffc06b" intensity={3.5} distance={2.2} decay={2}/></>}
    <ContactShadows position={[0, .08, .05]} scale={5.7} opacity={.38} blur={2.1} far={2.4} resolution={512} frames={1}/>
  </GLBAsset>
}
