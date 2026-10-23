import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
import Piano from './Piano'
import RecordPlayer from './RecordPlayer'
import { FLAGS } from '../config/flags'

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
  const baseline=FLAGS.visualBaseline
  if(FLAGS.rugPileTest) return <GLBAsset
    url="/assets/models/candidates/rug-star-moon-pile-test.glb"
    axisCorrection={false}
    castShadow={false}
    fallbackScale={.25}
  />
  if(FLAGS.rugMaterialTest) return <GLBAsset
    url="/assets/models/candidates/rug-star-moon-material-test.glb"
    axisCorrection={false}
    castShadow={false}
    fallbackScale={.25}
  />
  return <mesh rotation-x={-Math.PI/2} position={baseline?[-.8,.025,1.5]:[-.7,.028,2.3]} receiveShadow><planeGeometry args={baseline?[7.2,5.1]:[8.5,6.7]} /><meshStandardMaterial map={texture} roughness={1} side={THREE.DoubleSide}/></mesh>
}

// E01: "Messy bed 2.0" by thethieme (Sketchfab, CC BY 4.0, credit in ASSETS.md), recoloured to the
// Moonroom palette. Base maps are dropped (they bake the original grey/black look); normal and
// roughness maps keep the fabric folds and wood grain. Scaled 2.1x: the room's furniture is ~1.7x real scale, and the bed is deliberately oversized beyond that as the dream bed.
const BED_TINTS = {
  Nordli_Cover: { color: new THREE.Color('#d98fae'), map: null },     // draped throw: rose knit
  Nordli_Comforter: { color: new THREE.Color('#f3e4dc'), map: null }, // folded duvet: cream
  Nordli_Sheet: { color: new THREE.Color('#efe2e6'), map: null },
  Nordli_Pillows: { color: new THREE.Color('#c8b4e2'), map: null },   // lilac pillows
  Nordli_Frame: { color: new THREE.Color('#b98a6c'), map: null },     // warm honey wood
  Nordli_Shelves: { color: new THREE.Color('#b98a6c'), map: null },
}

function Bed() {
  if (FLAGS.bedLegacy) return <LegacyBed/>
  return <GLBAsset
    url="/assets/models/bed/messy-bed-2.glb"
    position={FURNITURE.bed.position}
    rotation={[0, -Math.PI / 2, 0]}
    scale={2.1}
    axisCorrection={false}
    nodeOverrides={BED_TINTS}
    fallbackScale={1.5}
  />
}

function LegacyBed() {
  return <GLBAsset
    url="/assets/models/lounge/moon-nest-refinement-v2.glb"
    position={[7.0, 0, 3.0]}
    rotation={[0, -Math.PI / 2, 0]}
    scale={[2.0, 1.35, 2.5]}
    axisCorrection={false}
    fallbackScale={1.5}
  />
}

// G02 right-wall bookcase. In the `books` mode one book slides out toward you (`pulled`).
function Book({ i, pulled }) {
  const ref = useRef()
  const shelf = Math.floor(i / 9), slot = i % 9
  useFrame((_, dt) => { if (ref.current) ref.current.position.x += ((pulled ? -.62 : -.15) - ref.current.position.x) * (1 - Math.exp(-dt * 6)) })
  return <RoundedBox ref={ref} args={[.47, .58 + .11 * (i % 3), .13 + .08 * (i % 2)]} color={BOOK_COLORS[i % 4]} position={[-.15, .65 + shelf * 1.1, -2.08 + slot * .52]} rotation-x={(i % 3 - 1) * .04}/>
}
export const BOOK_COLORS = ['#c88b88', '#7778a7', '#e2aa79', '#a075a7']

function Bookcase({ pulledBook }){const p=FURNITURE.bookshelf.position;return <group position={p}>
  {[-2.4,2.4].map(z=><RoundedBox key={z} args={[.22,4.7,.18]} color="#6e4d5d" position={[0,2.35,z]}/>)}
  {[.25,1.35,2.45,3.55,4.65].map(y=><RoundedBox key={y} args={[1.05,.16,5]} color="#966677" position={[0,y,0]}/>)}
  {Array.from({length:36},(_,i)=><Book key={i} i={i} pulled={pulledBook === i}/>)}
</group>}



function Details(){return <>
  <Rug/>
  {[-9,-7.8,8.2,9.1].map((x,i)=><Plant key={i} position={[x,0,-6.1+i*.15]} scale={.7+i%2*.15}/>)}
  <Plant position={[-9.25,0,1.8]} scale={1.05}/><Plant position={[4.3,0,-5.45]} scale={.8}/>
  {[-6.4,-3.6,3.4,7.2].map((x,i)=><GlowOrb key={i} position={[x,1.2,4.9-i*.8]} color="#ffc08a" size={.1} intensity={2.4}/>)}
  {[-7,-4,3.5,7].map((x,i)=><group key={i} position={[x,7.2,-6.6]}>{Array.from({length:5},(_,j)=><mesh key={j} position={[Math.sin(j*2.4+i)*.18,-j*.28,0]} rotation-z={j*.7}><sphereGeometry args={[.19,.1,.08,8,6]}/><meshStandardMaterial color={j%2?'#63875e':'#536b55'}/></mesh>)}</group>)}
  <GlowOrb position={[9.4,2.14,.7]} color="#ffc47b" size={.15} intensity={4}/>
</>}

export default function Furniture({hit, onStrike, pianoNotes, onNoteOn, onNoteOff, records, vinylId, pulledBook}) {
  const candidateDrums = FLAGS.drumCandidate
  return <><Details/><Bed/><Bookcase pulledBook={pulledBook}/><Workstation/><DrumCorner/>{candidateDrums ? <CandidateDrumKit hit={hit} onStrike={onStrike}/> : <DrumKit hit={hit} onStrike={onStrike}/>}<Lounge/><DreamLoungeProps/><Piano notes={pianoNotes} onNoteOn={onNoteOn} onNoteOff={onNoteOff}/><RecordPlayer records={records} playingId={vinylId}/><Foxes/></>
}
