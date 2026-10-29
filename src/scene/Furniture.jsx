import { useMemo } from 'react'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import DrumKit from './DrumKit'
import CandidateDrumKit from './CandidateDrumKit'
import DrumCorner from './DrumCorner'
import Foxes from './Foxes'
import Lounge from './Lounge'
import Workstation from './Workstation'
import DreamLoungeProps from './DreamLoungeProps'
import GLBAsset from './AssetModel'
import Piano from './Piano'
import ReferenceDecor from './ReferenceDecor'
import RecordPlayer from './RecordPlayer'
import Bookshelves from './Bookshelf'
import { FLAGS } from '../config/flags'
import { useLighting } from '../lighting/LightingContext'

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

function Rug({ quality }){
  const texture=useMemo(rugTexture,[])
  const baseline=FLAGS.visualBaseline
  if (FLAGS.visualPass && !FLAGS.rugPileTest && !FLAGS.rugMaterialTest) return <GLBAsset
    url={quality === 'low' ? '/assets/models/rugs/moonroom-persian-floral-pass01-low.glb' : '/assets/models/rugs/moonroom-persian-floral-pass01.glb'}
    axisCorrection={false}
    castShadow={false}
    fallbackScale={.25}
  />
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

function Details({ quality }){const { decorationLights } = useLighting(); return <>
  <Rug quality={quality}/>
  <GLBAsset url="/assets/models/decor/room-dressing.glb" axisCorrection={false} castShadow={false} fallbackScale={.1}/>
  {decorationLights && [-6.4,-3.6,3.4,7.2].map((x,i)=><pointLight key={i} position={[x,1.2,4.9-i*.8]} color="#ffc08a" intensity={.85} distance={2.4}/>)}
  {decorationLights && <pointLight position={[9.4,2.14,.7]} color="#ffc47b" intensity={1.2} distance={2.9}/>}
</>}

export default function Furniture({hit, foxPet, onStrike, pianoNotes, onNoteOn, onNoteOff, records, vinylId, pulledBook, activeBookShelf, guitarHit, guitarTone, quality = 'high'}) {
  const candidateDrums = FLAGS.drumCandidate
  return <><Details quality={quality}/><Bed/><Bookshelves pulledBook={pulledBook} activeShelf={activeBookShelf}/><Workstation/><DrumCorner/>{candidateDrums ? <CandidateDrumKit hit={hit} onStrike={onStrike}/> : <DrumKit hit={hit} onStrike={onStrike}/>}<Lounge/><DreamLoungeProps/><Piano notes={pianoNotes} onNoteOn={onNoteOn} onNoteOff={onNoteOff}/><RecordPlayer records={records} playingId={vinylId}/><Foxes pet={foxPet}/><ReferenceDecor guitarHit={guitarHit} guitarTone={guitarTone}/></>
}
