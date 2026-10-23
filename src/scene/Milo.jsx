import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import { energy } from '../audio/musicBus'

// Milo, Mugo's Tiny Band drummer (same flat SVG design as ~/DrumApp TinyBandRoom), visiting
// the room as a camera-facing cut-out. Hi-hat swings his left arm, snare the right, kick
// bounces him — so he also grooves along when you play.
const VIEW = 'viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg"'
const BODY = `<svg ${VIEW}>
  <ellipse cx="150" cy="238" rx="80" ry="10" fill="#302d4b" opacity=".18"/>
  <path d="M113 185L108 230M183 185L192 230" stroke="#34354e" stroke-width="19" stroke-linecap="round"/>
  <path d="M110 118Q148 94 187 120L192 184H106Z" fill="#ed896d"/>
  <rect x="140" y="94" width="20" height="25" rx="8" fill="#ba795b"/>
  <ellipse cx="150" cy="71" rx="37" ry="40" fill="#dca17a"/>
  <path d="M112 71Q102 18 151 24Q200 24 188 77L178 52Q142 67 121 48Z" fill="#34354e"/>
  <path d="M133 78h1m29 0h1" stroke="#34354e" stroke-width="5" stroke-linecap="round"/>
  <path d="M142 92q8 7 16 0" fill="none" stroke="#743f42" stroke-width="3" stroke-linecap="round"/>
</svg>`
const LEFT = `<svg ${VIEW}><path d="M113 128L83 154L123 167" fill="none" stroke="#dca17a" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M117 164l-24-37" stroke="#e9c69b" stroke-width="5" stroke-linecap="round"/></svg>`
const RIGHT = `<svg ${VIEW}><path d="M185 128L209 151L177 168" fill="none" stroke="#dca17a" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M179 162l23-38" stroke="#e9c69b" stroke-width="5" stroke-linecap="round"/></svg>`

const UNIT = 2.0 / 214 // metres per SVG unit: Milo stands ~2 m, in scale with the room's furniture
const W = 300 * UNIT, H = 260 * UNIT
const toLocal = (x, y) => [(x - 150) * UNIT, (130 - y) * UNIT] // SVG point → plane-centred metres
const GROUND = 108 * UNIT // plane centre sits this far above Milo's feet (svg y 238)

function useSvgTexture(svg) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 520
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
  useEffect(() => {
    const image = new Image()
    image.onload = () => { const ctx = texture.image.getContext('2d'); ctx.clearRect(0, 0, 600, 520); ctx.drawImage(image, 0, 0, 600, 520); texture.needsUpdate = true }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [svg, texture])
  return texture
}

// An arm layer pivots at its shoulder: the group sits on the shoulder, the plane is offset back.
function Arm({ svg, shoulder, swing }) {
  const texture = useSvgTexture(svg)
  const [sx, sy] = toLocal(...shoulder)
  return <group ref={swing} position={[sx, sy, .002]}>
    <mesh position={[-sx, -sy, 0]}><planeGeometry args={[W, H]}/><meshBasicMaterial map={texture} transparent alphaTest={.02} toneMapped={false}/></mesh>
  </group>
}

export const MILO_SEAT = [FURNITURE.drums.position[0] - .2, 0, FURNITURE.drums.position[2] + 1.45] // drum throne
export const MILO_ASIDE = [-4.55, 0, -3.3] // beside the kit when you take the throne

export default function Milo({ aside = false }) {
  const body = useSvgTexture(BODY)
  const root = useRef(), figure = useRef(), left = useRef(), right = useRef()
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    target.set(...(aside ? MILO_ASIDE : MILO_SEAT))
    if (root.current) root.current.position.lerp(target, 1 - Math.exp(-dt * 3))
    const hat = energy('hat', 9), snare = energy('snare', 8), kick = energy('kick', 8), any = energy('any', 3)
    if (left.current) left.current.rotation.z = -hat * .55 + Math.sin(clock.elapsedTime * 2) * .03
    if (right.current) right.current.rotation.z = snare * .6 - Math.sin(clock.elapsedTime * 2 + 1) * .03
    if (figure.current) figure.current.position.y = GROUND - kick * .05 + Math.sin(clock.elapsedTime * 2.4) * .01 * (1 + any * 3)
  })
  return <group ref={root} position={MILO_SEAT}>
    <Billboard lockX lockZ>
      <group ref={figure} position-y={GROUND}>
        <mesh><planeGeometry args={[W, H]}/><meshBasicMaterial map={body} transparent alphaTest={.02} toneMapped={false}/></mesh>
        <Arm svg={LEFT} shoulder={[113, 128]} swing={left}/>
        <Arm svg={RIGHT} shoulder={[185, 128]} swing={right}/>
      </group>
    </Billboard>
  </group>
}
