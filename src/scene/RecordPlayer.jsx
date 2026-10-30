import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import { RoundedBox } from './Primitives'

// D04 turntable: takes "pressed" in Studio become records in the crate beside it. Playing one
// lowers the tonearm, spins the platter at 33⅓ rpm, and plays the take through the room.
export const recordColor = id => {
  let h = 0
  for (const ch of id || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return new THREE.Color().setHSL((h % 360) / 360, .55, .62)
}

function grooveTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#121016'; ctx.fillRect(0, 0, 512, 512)
  for (let r = 92; r < 252; r += 2.2) {
    ctx.strokeStyle = `rgba(255,255,255,${.025 + (r % 9) * .006})`
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke()
  }
  // Two soft sheen wedges so the spin reads.
  const sheen = ctx.createConicGradient(0, 256, 256)
  ;[[0, 0], [.08, .16], [.16, 0], [.5, 0], [.58, .12], [.66, 0], [1, 0]].forEach(([at, a]) => sheen.addColorStop(at, `rgba(255,240,230,${a})`))
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sheen
  ctx.beginPath(); ctx.arc(256, 256, 252, 0, Math.PI * 2); ctx.arc(256, 256, 90, 0, Math.PI * 2, true); ctx.fill()
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const ARM_REST = 0, ARM_PLAY = -.44
export const RECORD_SCALE = .72 // was crowding the piano corner at full size
const RPM = 33.333 / 60 * Math.PI * 2

export default function RecordPlayer({ records = [], playingId = null }) {
  const p = FURNITURE.record.position
  const disc = useRef(), arm = useRef()
  const grooves = useMemo(grooveTexture, [])
  const playing = records.find(record => record.id === playingId)
  const labelColor = useMemo(() => recordColor(playingId), [playingId])
  useFrame((_, dt) => {
    if (disc.current && playing) disc.current.rotation.y -= RPM * dt
    if (arm.current) arm.current.rotation.y += ((playing ? ARM_PLAY : ARM_REST) - arm.current.rotation.y) * (1 - Math.exp(-dt * 2.4))
  })
  return <group position={p} scale={RECORD_SCALE}>
    {/* cabinet */}
    <RoundedBox args={[1.5, .56, 1.42]} color="#8a5a43" position-y={.42}/>
    <RoundedBox args={[1.56, .06, 1.48]} color="#6d4433" position-y={.72}/>
    {[[-.65, -.6], [.65, -.6], [-.65, .6], [.65, .6]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, .07, z]}><cylinderGeometry args={[.035, .03, .14, 10]}/><meshStandardMaterial color="#3b2a25"/></mesh>)}
    {/* platter + record */}
    <mesh position={[-.1, .77, .05]}><cylinderGeometry args={[.52, .52, .04, 48]}/><meshStandardMaterial color="#2b2730" metalness={.5} roughness={.4}/></mesh>
    {playing && <group ref={disc} position={[-.1, .8, .05]}>
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[.49, 64]}/><meshStandardMaterial map={grooves} roughness={.35} metalness={.2}/></mesh>
      <mesh position-y={.002} rotation-x={-Math.PI / 2}><circleGeometry args={[.16, 40]}/><meshStandardMaterial color={labelColor} roughness={.8}/></mesh>
      <mesh position={[.07, .004, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[.025, 16]}/><meshStandardMaterial color="#f5ead8"/></mesh>
    </group>}
    <mesh position={[-.1, .83, .05]}><cylinderGeometry args={[.012, .012, .06, 10]}/><meshStandardMaterial color="#d9c6a5" metalness={.8} roughness={.3}/></mesh>
    {/* tonearm */}
    <mesh position={[.48, .8, -.5]}><cylinderGeometry args={[.07, .08, .1, 20]}/><meshStandardMaterial color="#c9b48f" metalness={.75} roughness={.3}/></mesh>
    <group ref={arm} position={[.48, .86, -.5]}>
      <mesh position={[0, 0, .3]} rotation-x={Math.PI / 2}><cylinderGeometry args={[.012, .012, .6, 8]}/><meshStandardMaterial color="#e2d3b6" metalness={.8} roughness={.25}/></mesh>
      <RoundedBox args={[.06, .03, .1]} color="#2a2530" position={[0, -.02, .62]}/>
      <mesh position={[0, 0, -.1]}><cylinderGeometry args={[.035, .035, .08, 14]}/><meshStandardMaterial color="#3a3440" metalness={.6}/></mesh>
    </group>
    {/* knobs */}
    {[.42, .58].map(x => <mesh key={x} position={[x, .76, .55]}><cylinderGeometry args={[.035, .035, .035, 14]}/><meshStandardMaterial color="#d9c6a5" metalness={.7}/></mesh>)}
    {/* record crate with one sleeve per pressed take */}
    <group position={[.15, 0, 1.08]}>
      <RoundedBox args={[.78, .36, .44]} color="#a87a5a" position-y={.18}/>
      {records.slice(0, 12).map((record, i) => <mesh key={record.id} position={[-.33 + i * .06, .36, 0]} rotation-z={(i % 3 - 1) * .04}>
        <boxGeometry args={[.018, .36, .36]}/><meshStandardMaterial color={recordColor(record.id)} roughness={.85}/>
      </mesh>)}
    </group>
  </group>
}
