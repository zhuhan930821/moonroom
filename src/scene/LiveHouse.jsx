import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { energy, loudness } from '../audio/musicBus'
import { roomState } from '../game/roomState'
import { ROOM } from '../config/scene'

// Band mode turns the room into a little live house: the room lamps go out, a mirror ball over
// the stage scatters spots across walls, ceiling and floor, four moving heads sweep the stage,
// and two colour washes punch on the kick. Everything is restored when the band stops.

export const BALL = [-5.4, 4.05, -.45] // in front of the loft, over the stage
const HALF = { x: ROOM.width / 2 - .08, z: ROOM.depth / 2 - .08 }, CEILING = ROOM.height - .06
const PALETTE = ['#ff5ab8', '#59d7ff', '#ffd36b', '#a98bff', '#7dffb6'].map(c => new THREE.Color(c))

// Where a ray from the ball hits the room box: the spot's position and the surface normal.
export function hitRoom(origin, dir) {
  let best = Infinity, normal = null
  const test = (t, n) => { if (t > 0 && t < best) { best = t; normal = n } }
  if (dir.x) test(((dir.x > 0 ? HALF.x : -HALF.x) - origin.x) / dir.x, [dir.x > 0 ? -1 : 1, 0, 0])
  if (dir.z) test(((dir.z > 0 ? HALF.z : -HALF.z) - origin.z) / dir.z, [0, 0, dir.z > 0 ? -1 : 1])
  if (dir.y) test(((dir.y > 0 ? CEILING : .02) - origin.y) / dir.y, [0, dir.y > 0 ? -1 : 1, 0])
  return { point: origin.clone().addScaledVector(dir, best), normal: new THREE.Vector3(...normal), distance: best }
}

// Facet directions spread evenly over the sphere (Fibonacci), so spots never clump.
function facetDirections(n) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
  })
}

function MirrorBall() {
  const ball = useRef(), spots = useRef(), glint = useRef()
  const dirs = useMemo(() => facetDirections(150), [])
  const origin = useMemo(() => new THREE.Vector3(...BALL), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), d: new THREE.Vector3(), z: new THREE.Vector3(0, 0, 1), c: new THREE.Color(), spin: new THREE.Quaternion(), axis: new THREE.Vector3(0, 1, 0) }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, kick = energy('kick', 5), loud = Math.min(1, loudness() / 5)
    const angle = t * (.35 + loud * .5)
    if (ball.current) ball.current.rotation.y = angle
    if (glint.current) glint.current.material.opacity = .35 + kick * .6
    tmp.spin.setFromAxisAngle(tmp.axis, angle)
    dirs.forEach((dir, i) => {
      tmp.d.copy(dir).applyQuaternion(tmp.spin)
      const hit = hitRoom(origin, tmp.d)
      // Spots grow with distance (the beam spreads) and lie flat on the surface they land on.
      const size = .05 + hit.distance * .018
      tmp.q.setFromUnitVectors(tmp.z, hit.normal)
      tmp.s.set(size, size, size)
      spots.current.setMatrixAt(i, tmp.m.compose(hit.point.addScaledVector(hit.normal, .01), tmp.q, tmp.s))
      const shade = PALETTE[(i + Math.floor(t * .5)) % PALETTE.length]
      spots.current.setColorAt(i, tmp.c.copy(shade).multiplyScalar(.55 + kick * 1.2 + (Math.sin(t * 3 + i) > .96 ? .8 : 0)))
    })
    spots.current.instanceMatrix.needsUpdate = true
    spots.current.instanceColor.needsUpdate = true
  })
  return <group>
    <mesh position={[BALL[0], (BALL[1] + CEILING) / 2, BALL[2]]}><cylinderGeometry args={[.008, .008, CEILING - BALL[1], 4]}/><meshStandardMaterial color="#888" metalness={.8}/></mesh>
    <mesh ref={ball} position={BALL}><icosahedronGeometry args={[.34, 3]}/><meshStandardMaterial color="#e8e8f0" metalness={1} roughness={.12} flatShading emissive="#4a4a66" emissiveIntensity={.5}/></mesh>
    <mesh ref={glint} position={BALL}><sphereGeometry args={[.5, 16, 12]}/><meshBasicMaterial color="#cfd8ff" transparent opacity={.4} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
    <instancedMesh ref={spots} args={[null, null, dirs.length]} frustumCulled={false}>
      <circleGeometry args={[1, 10]}/><meshBasicMaterial transparent opacity={.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
    </instancedMesh>
  </group>
}

// Moving heads on a ceiling bar: each beam sweeps a figure-of-eight over the stage, faster and
// brighter when the music is loud.
const HEADS = [[-1.6, -3.2], [-2.6, -1.1], [-2.6, 1.1], [-1.6, 3.2]]
function MovingHeads() {
  const beams = useRef([]), mats = useRef([])
  const cone = useMemo(() => { const g = new THREE.ConeGeometry(.55, 7, 24, 1, true); g.translate(0, -3.5, 0); return g }, [])
  const tmp = useMemo(() => ({ from: new THREE.Vector3(), to: new THREE.Vector3(), down: new THREE.Vector3(0, -1, 0) }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, loud = Math.min(1, loudness() / 5), kick = energy('kick', 6), speed = .5 + loud * 1.1
    beams.current.forEach((beam, i) => {
      if (!beam) return
      const p = t * speed + i * 1.7
      tmp.to.set(-7.3 + Math.sin(p) * 1.7, 0, -.1 + Math.sin(p * 2) * 2.4 * (i % 2 ? 1 : -1))
      tmp.from.copy(beam.position)
      beam.quaternion.setFromUnitVectors(tmp.down, tmp.to.sub(tmp.from).normalize())
      const m = mats.current[i]
      if (m) { m.opacity = .05 + loud * .08 + kick * .1; m.color.copy(PALETTE[(i + Math.floor(t / 4)) % PALETTE.length]) }
    })
  })
  return <group>
    <mesh position={[-2.2, CEILING - .25, 0]}><boxGeometry args={[.12, .08, 7.4]}/><meshStandardMaterial color="#1c1820" metalness={.7} roughness={.4}/></mesh>
    {HEADS.map(([x, z], i) => <group key={i}>
      <mesh position={[x, CEILING - .42, z]}><boxGeometry args={[.22, .26, .22]}/><meshStandardMaterial color="#222" metalness={.6}/></mesh>
      <mesh ref={el => { beams.current[i] = el }} position={[x, CEILING - .55, z]} geometry={cone} renderOrder={3}>
        <meshBasicMaterial ref={el => { mats.current[i] = el }} transparent opacity={.08} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false}/>
      </mesh>
    </group>)}
  </group>
}

// Two colour washes low on either side of the stage, punching on the kick.
function Washes() {
  const a = useRef(), b = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, kick = energy('kick', 7), snare = energy('snare', 7)
    if (a.current) { a.current.intensity = 4 + kick * 14; a.current.color.copy(PALETTE[Math.floor(t / 3) % PALETTE.length]) }
    if (b.current) { b.current.intensity = 4 + snare * 12; b.current.color.copy(PALETTE[(Math.floor(t / 3) + 2) % PALETTE.length]) }
  })
  return <>
    <pointLight ref={a} position={[-5.2, .6, -3.6]} intensity={4} distance={9} decay={1.6}/>
    <pointLight ref={b} position={[-5.4, .6, 3.6]} intensity={4} distance={9} decay={1.6}/>
  </>
}

// House lights down while the band plays: the lamps switch off, and every other room light is
// held at a fraction of whatever the room sets it to (lighting code may update intensities each
// frame, so the base is re-read whenever someone else changed it). Stage lights are left alone.
const DIM = .3
function HouseLights() {
  const scene = useThree(state => state.scene)
  const lights = useRef(new Map()) // light -> { base, set }
  useEffect(() => {
    const before = { ...roomState.get().lamps }
    roomState.setLamps(Object.fromEntries(Object.keys(before).map(id => [id, false])))
    const held = lights.current
    return () => {
      roomState.setLamps(before)
      held.forEach((v, light) => { if (light.intensity === v.set) light.intensity = v.base })
      held.clear()
    }
  }, [])
  useFrame(() => {
    scene.traverse(o => {
      if (!o.isLight) return
      for (let p = o; p; p = p.parent) if (p.name === 'BandStage') return
      const v = lights.current.get(o)
      if (!v || o.intensity !== v.set) { const base = o.intensity; lights.current.set(o, { base, set: base * DIM }); o.intensity = base * DIM }
    })
  })
  return null
}

export default function LiveHouse() {
  return <group name="LiveHouse">
    <HouseLights/>
    <MirrorBall/>
    <MovingHeads/>
    <Washes/>
  </group>
}
