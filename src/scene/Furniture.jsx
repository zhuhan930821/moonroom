import { useMemo } from 'react'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import { GlowOrb, Plant, RoundedBox } from './Primitives'
import DrumKit from './DrumKit'
import CandidateDrumKit from './CandidateDrumKit'
import DrumCorner from './DrumCorner'
import Foxes from './Foxes'
import Lounge from './Lounge'
import Workstation from './Workstation'
import DreamLoungeProps from './DreamLoungeProps'
import GLBAsset from './AssetModel'

function rugTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#4d315f'; ctx.fillRect(0,0,512,512)
  ctx.strokeStyle = '#ba8eaf'; ctx.lineWidth = 10; ctx.strokeRect(18,18,476,476)
  ctx.strokeStyle = '#aa7e9d'; ctx.lineWidth = 2; ctx.strokeRect(37,37,438,438)
  for (let i=0;i<70;i++) {
    const x=(i*173)%485+13, y=(i*281)%485+13
    ctx.fillStyle=i%3?'#d4b8bd':'#f7d68c'
    ctx.font=`${i%4===0?22:13}px Georgia`
    ctx.fillText(i%5===0?'☾':'✦',x,y)
  }
  const texture=new THREE.CanvasTexture(canvas)
  texture.colorSpace=THREE.SRGBColorSpace
  return texture
}

function Rug(){
  const texture=useMemo(rugTexture,[])
  const params=new URLSearchParams(window.location.search)
  const baseline=params.get('visualBaseline')==='1'
  if(params.get('rugPileTest')==='1') return <GLBAsset
    url="/assets/models/candidates/rug-star-moon-pile-test.glb"
    axisCorrection={false}
    castShadow={false}
    fallbackScale={.25}
  />
  if(params.get('rugMaterialTest')==='1') return <GLBAsset
    url="/assets/models/candidates/rug-star-moon-material-test.glb"
    axisCorrection={false}
    castShadow={false}
    fallbackScale={.25}
  />
  return <mesh rotation-x={-Math.PI/2} position={baseline?[-.8,.025,1.5]:[-.7,.028,2.3]} receiveShadow><planeGeometry args={baseline?[7.2,5.1]:[8.5,6.7]} /><meshStandardMaterial map={texture} roughness={1} side={THREE.DoubleSide}/></mesh>
}

function Bed() {
  return <GLBAsset
    url="/assets/models/lounge/moon-nest-refinement-v2.glb"
    position={FURNITURE.bed.position}
    rotation={[0, -Math.PI / 2, 0]}
    scale={[2.0, 1.35, 2.5]}
    axisCorrection={false}
    fallbackScale={1.5}
  />
}

function Bookcase(){const p=FURNITURE.bookshelf.position;return <group position={p}>
  {[-2.4,2.4].map(z=><RoundedBox key={z} args={[.22,4.7,.18]} color="#6e4d5d" position={[0,2.35,z]}/>)}
  {[.25,1.35,2.45,3.55,4.65].map(y=><RoundedBox key={y} args={[1.05,.16,5]} color="#966677" position={[0,y,0]}/>)}
  {Array.from({length:36},(_,i)=>{
    const shelf=Math.floor(i/9), slot=i%9
    return <RoundedBox key={i} args={[.47,.58+.11*(i%3),.13+.08*(i%2)]} color={['#c88b88','#7778a7','#e2aa79','#a075a7'][i%4]} position={[-.15, .65+shelf*1.1, -2.08+slot*.52]} rotation-x={(i%3-1)*.04}/>
  })}
</group>}

function Keyboard(){const p=FURNITURE.keyboard.position;return <group position={p} rotation-y={Math.PI/2}>
  <RoundedBox args={[3.1,.25,.95]} color="#393345" position-y={1.05}/>
  {Array.from({length:20},(_,i)=><RoundedBox key={i} args={[.142,.055,.58]} color="#e6dace" position={[-1.42+i*.149,1.21,.09]}/>)}
  {Array.from({length:14},(_,i)=><RoundedBox key={i} args={[.077,.085,.34]} color="#302c39" position={[-1.31+i*.204,1.26,-.05]}/>)}
  {[-1.2,1.2].map(x=><mesh key={x} position={[x,.52,0]} rotation-z={x<0?-.13:.13}><cylinderGeometry args={[.035,.035,1.1,8]}/><meshStandardMaterial color="#cbb3aa" metalness={.6}/></mesh>)}
</group>}

function RecordPlayer(){const p=FURNITURE.record.position;return <group position={p}>
  <RoundedBox args={[1.5,.6,1.45]} color="#9f6b68" position-y={.38}/>
  <mesh position={[0,.71,0]}><cylinderGeometry args={[.55,.55,.06,32]}/><meshStandardMaterial color="#282530" roughness={.32}/></mesh>
  <mesh position={[0,.76,0]}><cylinderGeometry args={[.12,.12,.05,24]}/><meshStandardMaterial color="#e1a9bf"/></mesh>
  <RoundedBox args={[.46,.05,.035]} color="#d9b789" position={[.42,.79,-.28]} rotation-y={.55}/>
</group>}

function Details(){return <>
  <Rug/>
  {[-9,-7.8,8.2,9.1].map((x,i)=><Plant key={i} position={[x,0,-6.1+i*.15]} scale={.7+i%2*.15}/>)}
  <Plant position={[-9.25,0,1.8]} scale={1.05}/><Plant position={[4.3,0,-5.45]} scale={.8}/>
  {[-6.4,-3.6,3.4,7.2].map((x,i)=><GlowOrb key={i} position={[x,1.2,4.9-i*.8]} color="#ffc08a" size={.1} intensity={2.4}/>)}
  {[-7,-4,3.5,7].map((x,i)=><group key={i} position={[x,7.2,-6.6]}>{Array.from({length:5},(_,j)=><mesh key={j} position={[Math.sin(j*2.4+i)*.18,-j*.28,0]} rotation-z={j*.7}><sphereGeometry args={[.19,.1,.08,8,6]}/><meshStandardMaterial color={j%2?'#63875e':'#536b55'}/></mesh>)}</group>)}
  <GlowOrb position={[8.9,2.2,1.5]} color="#ffc47b" size={.2} intensity={4}/>
</>}

export default function Furniture({hit}) {
  const candidateDrums = new URLSearchParams(window.location.search).get('drumCandidate') === '1'
  return <><Details/><Bed/><Bookcase/><Workstation/><DrumCorner/>{candidateDrums ? <CandidateDrumKit hit={hit}/> : <DrumKit hit={hit}/>}<Lounge/><DreamLoungeProps/><Keyboard/><RecordPlayer/><Foxes/></>
}
