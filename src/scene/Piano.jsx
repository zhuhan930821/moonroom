import { FURNITURE } from '../config/scene'
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

export default function Piano({ notes, onNoteOn, onNoteOff }) {
  const p = FURNITURE.keyboard.position
  return <group position={p} rotation-y={Math.PI / 2}>
    <RoundedBox args={[SPAN + .2, .22, .95]} color="#393345" position-y={1.07}/>
    <RoundedBox args={[SPAN + .2, .16, .2]} color="#2f2a3a" position={[0, 1.24, -.37]}/>
    {NOTES.map(note => <Key key={note} note={note} down={notes.has(note)} onNoteOn={onNoteOn} onNoteOff={onNoteOff}/>)}
    {[-1.2, 1.2].map(x => <mesh key={x} position={[x, .52, 0]} rotation-z={x < 0 ? -.13 : .13}><cylinderGeometry args={[.035, .035, 1.1, 8]}/><meshStandardMaterial color="#cbb3aa" metalness={.6}/></mesh>)}
  </group>
}
