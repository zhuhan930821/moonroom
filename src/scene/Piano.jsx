import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FURNITURE } from '../config/scene'
import { energy, pianoColor } from '../audio/musicBus'
import { KEYBOARD_FIRST, KEYBOARD_LAST, isBlackKey } from '../game/pianoKeys'
import { RoundedBox } from './Primitives'

// Left-wall stage piano: 37 playable keys (C3–C6). Keys dip and glow while held, from the
// computer keyboard, a mouse press on the key, or Studio playback.
const WHITE_W = .134
const NOTES = Array.from({ length: KEYBOARD_LAST - KEYBOARD_FIRST + 1 }, (_, i) => KEYBOARD_FIRST + i)
const WHITES = NOTES.filter(note => !isBlackKey(note))
const SPAN = WHITES.length * WHITE_W
const whiteIndex = note => WHITES.indexOf(note)
const keyX = note => isBlackKey(note)
  ? -SPAN / 2 + (whiteIndex(note - 1) + 1) * WHITE_W
  : -SPAN / 2 + (whiteIndex(note) + .5) * WHITE_W

function Key({ note, down, onNoteOn, onNoteOff }) {
  const black = isBlackKey(note)
  const handlers = onNoteOn ? {
    onPointerDown: event => { event.stopPropagation(); event.target.setPointerCapture?.(event.pointerId); onNoteOn(`ptr${note}`, note) },
    onPointerUp: () => onNoteOff(`ptr${note}`),
    onPointerLeave: () => onNoteOff(`ptr${note}`),
  } : {}
  return <mesh {...handlers} castShadow receiveShadow
    position={[keyX(note), black ? 1.255 - (down ? .014 : 0) : 1.205 - (down ? .018 : 0), black ? -.04 : .09]}
    rotation-x={down ? .035 : 0}>
    <boxGeometry args={black ? [.078, .07, .34] : [WHITE_W - .008, .055, .58]}/>
    <meshStandardMaterial color={down ? (black ? '#8a5f9a' : '#f6c7da') : black ? '#2a2533' : '#efe6da'} roughness={black ? .45 : .6}
      emissive={down ? '#ff9ec4' : '#000000'} emissiveIntensity={down ? .35 : 0}/>
  </mesh>
}

// Each note blooms on the floor and the wall around the piano in the note's colour.
function PianoGlow() {
  const light = useRef(), disc = useRef()
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(canvas)
  }, [])
  useFrame(() => {
    const e = energy('piano', 1.4)
    if (light.current) { light.current.intensity = e * 9; light.current.color.copy(pianoColor) }
    if (disc.current) { disc.current.material.opacity = e * .55; disc.current.material.color.copy(pianoColor) }
  })
  return <>
    <pointLight ref={light} position={[0, 1.7, .7]} intensity={0} distance={4.5} decay={2}/>
    <mesh ref={disc} position={[0, .03, .9]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[1.7, 40]}/>
      <meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
    </mesh>
  </>
}

export default function Piano({ notes, onNoteOn, onNoteOff }) {
  const p = FURNITURE.keyboard.position
  return <group position={p} rotation-y={Math.PI / 2}>
    <RoundedBox args={[SPAN + .2, .22, .95]} color="#393345" position-y={1.07}/>
    <RoundedBox args={[SPAN + .2, .16, .2]} color="#2f2a3a" position={[0, 1.24, -.37]}/>
    <PianoGlow/>
    {NOTES.map(note => <Key key={note} note={note} down={notes.has(note)} onNoteOn={onNoteOn} onNoteOff={onNoteOff}/>)}
    {[-1.2, 1.2].map(x => <mesh key={x} position={[x, .52, 0]} rotation-z={x < 0 ? -.13 : .13}><cylinderGeometry args={[.035, .035, 1.1, 8]}/><meshStandardMaterial color="#cbb3aa" metalness={.6}/></mesh>)}
  </group>
}
