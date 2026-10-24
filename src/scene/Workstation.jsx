import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import { RoundedBox } from './Primitives'
import { useLighting } from '../lighting/LightingContext'
import GLBAsset from './AssetModel'
import { FLAGS } from '../config/flags'

const CRT_COLLIDERS = [{name:'CRT_Collider',position:[0,.72,0],size:[2.8,1.45,1.35]}]
const CRT_ANCHORS = [{name:'CRT_Interaction',position:[0,.9,-.7]}]

function dreamScreenTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 220
  const ctx = canvas.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, 220)
  sky.addColorStop(0, '#345a9c'); sky.addColorStop(.55, '#dc89ae'); sky.addColorStop(1, '#f4b482')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 320, 220)
  ctx.fillStyle = '#c3f5df'; ctx.beginPath(); ctx.arc(165, 78, 41, 0, Math.PI*2); ctx.fill()
  for (let i=0;i<14;i++) { ctx.fillStyle = i%2?'#9e76b2':'#e8a6c6'; ctx.beginPath(); ctx.ellipse(i*30-20,180+i%3*9,58,15,0,0,Math.PI*2); ctx.fill() }
  ctx.fillStyle='#fff4d9'; ctx.font='18px Georgia'; ctx.fillText('MOONROOM',15,30)
  return new THREE.CanvasTexture(canvas)
}

function CRT() {
  const skyTexture = useTexture('/assets/textures/moon-river-sky.png')
  const displayTexture = skyTexture
  const screen = useMemo(() => new THREE.MeshBasicMaterial({ map:displayTexture, toneMapped:false }), [displayTexture])
  const nodeMaterials = useMemo(() => ({ CRT_Screen:screen }), [screen])
  return <GLBAsset url="/assets/models/candidates/C02-dream-crt-review.glb" position={[-2.65,1.22,-4.25]} rotation={[0,Math.PI,0]} scale={.72} nodeMaterials={nodeMaterials} collisionMeshes={CRT_COLLIDERS} interactionAnchors={CRT_ANCHORS} fallbackScale={.65}>
    <mesh position={[0,1.25,-.704]} rotation-y={Math.PI}><planeGeometry args={[1.28,.94]} /><meshBasicMaterial map={displayTexture} toneMapped={false} /></mesh>
  </GLBAsset>
}

function Laptop({ candidate = false }) {
  const texture=useMemo(dreamScreenTexture,[])
  const screen=useMemo(()=>new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),[texture])
  const nodeMaterials=useMemo(()=>({C03_Screen:screen}),[screen])
  if (candidate) return <GLBAsset url="/assets/models/candidates/C03-modern-laptop-review.glb" position={[.65,1.27,-4.1]} rotation={[0,Math.PI,0]} nodeMaterials={nodeMaterials}>
    <mesh position={[0,.65,.408]} rotation-y={Math.PI}><planeGeometry args={[1.405,.81]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
  </GLBAsset>
  return <group position={[.65,1.27,-4.1]} rotation-y={Math.PI}>
    <RoundedBox args={[1.6,.07,1.02]} color="#8b889f" />
    <group position={[0,.56,-.5]} rotation-x={-.16}><RoundedBox args={[1.6,1.1,.06]} color="#aca9b9" /><mesh position={[0,0,-.04]} rotation-y={Math.PI}><planeGeometry args={[1.43,.94]} /><meshBasicMaterial map={texture} /></mesh></group>
    {Array.from({length:12},(_,i)=><RoundedBox key={i} args={[.09,.008,.075]} color="#555064" position={[-.56+i*.1,.047,-.13]} />)}
  </group>
}

function ExternalMonitor() {
  const texture = useTexture('/assets/textures/moon-river-sky.png')
  const screen = useMemo(() => new THREE.MeshBasicMaterial({ map:texture, toneMapped:false }), [texture])
  const nodeMaterials = useMemo(() => ({ C03M_Screen:screen }), [screen])
  return <GLBAsset url="/assets/models/candidates/C03-companion-monitor-review.glb" position={[2.05,1.29,-4.48]} rotation={[0,Math.PI,0]} nodeMaterials={nodeMaterials}>
    <mesh position={[0,.735,-.027]} rotation-y={Math.PI}><planeGeometry args={[1.14,.705]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
  </GLBAsset>
}

export default function Workstation(){const p=FURNITURE.desk.position;const {desk:deskCandidate,laptop:laptopCandidate,midi:midiCandidate}=FLAGS;const { decorationLights }=useLighting();return <group>
  {deskCandidate ? <GLBAsset url="/assets/models/candidates/C01-workstation-desk-review.glb" position={p} axisCorrection={false} /> : <>
    <RoundedBox args={[8.25,.18,1.8]} color="#a36c6c" position={[p[0],1.22,p[2]]} />
    {[-3.8,3.8].map(x=>[-.65,.65].map(z=><RoundedBox key={`${x}/${z}`} args={[.13,1.22,.13]} color="#735260" position={[p[0]+x,.61,p[2]+z]}/>))}
    <RoundedBox args={[8.25,.12,.14]} color="#563d59" position={[p[0],.77,p[2]-.73]} />
  </>}
  <CRT/><Laptop candidate={laptopCandidate}/>{laptopCandidate && <ExternalMonitor/>}
  {midiCandidate ? <GLBAsset url="/assets/models/candidates/C05-midi-keyboard-review.glb" position={[2.85,1.29,-4.22]} rotation={[0,Math.PI,0]} /> : <>
    <RoundedBox args={[1.55,.15,.47]} color="#4e455e" position={[2.85,1.36,-4.22]} />
    {Array.from({length:14},(_,i)=><RoundedBox key={i} args={[.08,.015,.28]} color={i%2?'#f4e8d6':'#bfa5b7'} position={[2.18+i*.105,1.45,-4.18]}/>)}
  </>}
  {[-.95,laptopCandidate?3.5:1.95].map(x=><GLBAsset key={x} url="/assets/models/candidates/C04-studio-speaker-review.glb" position={[x,1.31,-4.44]} axisCorrection={false} castShadow/>) }
  {decorationLights && <pointLight position={[3.65,2.05,-4.55]} intensity={1.7} distance={3.2} color="#ffc184" />}
</group>}
