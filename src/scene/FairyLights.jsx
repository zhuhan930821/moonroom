import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { age, energy, pianoColor } from '../audio/musicBus'
import { roomState } from '../game/roomState'

// I04 fairy-light garlands + I07 candle glows as one instanced pass.
// Bulbs are HDR (>1) unlit colours so bloom picks them up; only a few real
// point lights (one per strand) spill warmth onto walls to protect frame time.
const STRANDS = [
  // Window wall, one swag per arch bay
  { from: [-9.6, 7.15, -7.25], to: [-2.6, 7.15, -7.25], sag: .65 },
  { from: [-2.5, 7.15, -7.25], to: [2.5, 7.15, -7.25], sag: .55 },
  { from: [2.6, 7.15, -7.25], to: [9.6, 7.15, -7.25], sag: .65 },
  // Left wall above the drum corner
  { from: [-9.85, 4.7, -6.6], to: [-9.85, 4.7, -2.4], sag: .45, glow: [-9.3, 4.3, -4.5] },
  { from: [-9.85, 4.7, -2.4], to: [-9.85, 4.7, 1.8], sag: .45 },
  // Right bookshelf crown and the wall above the bed head
  { from: [8.42, 4.9, -5.6], to: [8.42, 4.9, -.6], sag: .3, glow: [8.1, 4.4, -3.1] },
  { from: [9.85, 4.25, .8], to: [9.85, 4.25, 3.0], sag: .4, glow: [9.2, 3.9, 3.0] },
  { from: [9.85, 4.25, 3.0], to: [9.85, 4.25, 5.3], sag: .4 },
]
const SPACING = .3
const BULB = new THREE.Color('#ffc27a')

// Small candle groups: [position, count]; heights land on desk top / floor.
const CANDLES = [
  [[-.25, 1.31, -3.55], 3],
  [[9.45, 0, .05], 3],
  [[-9.4, 0, 4.3], 2],
  [[-5.0, 0, 1.55], 2],
]

function catenary({ from, to, sag }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
  const count = Math.max(2, Math.round(a.distanceTo(b) / SPACING))
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count
    return a.clone().lerp(b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0))
  })
}

export default function FairyLights({ quality = 'high' }) {
  const bulbs = useRef(), flames = useRef(), strandLights = useRef([])
  const { points, along, wire, glows } = useMemo(() => {
    const strands = STRANDS.map(catenary)
    const wire = new THREE.BufferGeometry().setFromPoints(strands.flatMap(p => p.slice(1).flatMap((q, i) => [p[i], q])))
    const glows = STRANDS.map((s, i) => s.glow || strands[i][Math.floor(strands[i].length / 2)].toArray())
    // 0 at a strand's middle, 1 at its ends: snare hits travel outward along each garland.
    const along = strands.flatMap(p => p.map((_, i) => Math.abs(i / (p.length - 1) - .5) * 2))
    return { points: strands.flat(), along, wire, glows }
  }, [])
  const candles = useMemo(() => CANDLES.flatMap(([[x, y, z], n], g) => Array.from({ length: n }, (_, i) => ({
    x: x + Math.cos(i * 2.3 + g) * .09 * (i > 0), z: z + Math.sin(i * 2.3 + g) * .09 * (i > 0), h: .16 - i * .035,
    y, seed: g * 3.1 + i,
  }))), [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    points.forEach((p, i) => { bulbs.current.setMatrixAt(i, m.makeTranslation(p)); bulbs.current.setColorAt(i, BULB) })
    candles.forEach((c, i) => flames.current.setMatrixAt(i, m.makeTranslation(c.x, c.y + c.h + .03, c.z)))
    bulbs.current.instanceMatrix.needsUpdate = true
    flames.current.instanceMatrix.needsUpdate = true
  }, [points, candles])

  const color = useMemo(() => new THREE.Color(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Slow twinkle on bulbs, quicker flicker on flames; music adds kick swells, a snare wave
    // running out from each garland's middle, cymbal sparkle, and a piano-pitch tint.
    const kick = energy('kick', 7), cymbal = energy('cymbal', 2.5), piano = energy('piano', 1.6)
    const wave = age('snare') * 2.2
    const daylightDim = 1 - roomState.get().day * .65 // garlands read faint in daylight
    const waveOn = wave < 1.4
    points.forEach((_, i) => {
      let k = 3.2 + Math.sin(t * 1.3 + i * 1.7) * .7 + Math.sin(t * 3.1 + i * .37) * .3
      k += kick * 2.4
      if (waveOn) k += 3.2 * Math.exp(-((wave - along[i]) ** 2) / .012) * (1 - wave / 1.4)
      if (cymbal > .02) k += cymbal * 3 * (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1 > .55 ? 1 : 0)
      color.copy(BULB)
      if (piano > .02) color.lerp(pianoColor, piano * .6)
      bulbs.current.setColorAt(i, color.multiplyScalar(k * daylightDim))
      // Bulbs swell on the beat (already at full brightness, so size is what reads).
      const swell = 1 + kick * .9 + (k - 3.9) * .08
      bulbs.current.setMatrixAt(i, matrix.makeScale(swell, swell, swell).setPosition(points[i]))
    })
    bulbs.current.instanceMatrix.needsUpdate = true
    // Strand lights wash the walls on kicks and cymbals.
    strandLights.current.forEach(light => { if (light) { light.intensity = 2.2 + kick * 5 + cymbal * 3.5; light.color.copy(BULB).lerp(pianoColor, piano * .6) } })
    bulbs.current.instanceColor.needsUpdate = true
    candles.forEach((c, i) => {
      const k = 3.4 + Math.sin(t * 9 + c.seed * 5) * .4 + Math.sin(t * 23 + c.seed) * .25
      flames.current.setColorAt(i, color.set('#ffb15a').multiplyScalar(k))
    })
    flames.current.instanceColor.needsUpdate = true
  })

  return <group>
    <lineSegments geometry={wire}><lineBasicMaterial color="#3a2a22" /></lineSegments>
    <instancedMesh ref={bulbs} args={[null, null, points.length]} frustumCulled={false}>
      <sphereGeometry args={[.032, 8, 6]} /><meshBasicMaterial toneMapped={false} />
    </instancedMesh>
    {candles.map((c, i) => <mesh key={i} position={[c.x, c.y + c.h / 2, c.z]} castShadow={false}>
      <cylinderGeometry args={[.045, .05, c.h, 12]} /><meshStandardMaterial color="#f3e2c8" roughness={.6} emissive="#ff9a4a" emissiveIntensity={.12} />
    </mesh>)}
    <instancedMesh ref={flames} args={[null, null, candles.length]} frustumCulled={false}>
      <sphereGeometry args={[.018, 8, 6]} /><meshBasicMaterial toneMapped={false} />
    </instancedMesh>
    {quality === 'high' && glows.map((p, i) => <pointLight key={i} ref={light => { strandLights.current[i] = light }} position={p} color="#ffb769" intensity={2.2} distance={3.4} decay={2} />)}
    {CANDLES.map(([[x, y, z]], i) => <pointLight key={`c${i}`} position={[x, y + .35, z]} color="#ff9f52" intensity={.8} distance={2.2} decay={2} />)}
  </group>
}
