import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../worlds/spec'
import { worldPhysics, worldState } from '../worlds/worldState'
import { playerRig } from '../game/PlayerController'
import { Sky, Weather } from '../worlds/WorldScene'
import { Hero } from '../worlds/landmarks'
import { DoorModel } from '../worlds/AnywhereDoor'
import SouvenirMesh from '../worlds/SouvenirMesh'
import { playChime } from '../audio/drums'

// The street: you arrive at z≈6 facing -Z and walk to the far door at z=-LENGTH-5.
// Buildings line both sides with their fronts at |x| = FRONT; the walkable strip is |x| < WALK.
export { LENGTH, START_DOOR, END_DOOR } from './layout'
import { DEPTH, END_DOOR, FRONT, LENGTH, START_DOOR, layoutStreet, makePhysics } from './layout'
import { RoofDeck } from './interiors'

import { GEO, canvasTexture, roadTexture } from './geometry'
import { renderer } from './registry'
import './content/render'

// A building: its roof style and (if it's a room) its interior come from the content registry.
function Building({ b, world, night, layout }) {
  const x = b.side * (FRONT + DEPTH / 2), H = b.floors * 3.1, front = -b.side * DEPTH / 2
  const Roof = b.roof ? null : renderer('style', world.street.style)
  const Room = b.room ? renderer('room', b.room) : null
  return <>
    {Room && <Room b={b} world={world} night={night} layout={layout}/>}
    <group position={[x, 0, b.z]}>
      {!Room && <>
        <mesh geometry={GEO.box} position-y={H / 2} scale={[DEPTH, H, b.w]} castShadow receiveShadow><meshStandardMaterial color={b.wall} roughness={.85}/></mesh>
        <mesh geometry={GEO.box} position={[front - b.side * .05, .25, 0]} scale={[.2, .5, b.w + .1]}><meshStandardMaterial color={world.palette.roof} roughness={.9}/></mesh>
        <mesh geometry={GEO.box} position={[front - b.side * .04, 1.15, (b.roll - .5) * (b.w - 2)]} scale={[.1, 2.3, 1.2]}><meshStandardMaterial color="#4a3a40" roughness={.6}/></mesh>
      </>}
      {Roof && <Roof w={b.w} top={H} roof={world.palette.roof} roll={b.roll} accent={world.palette.accent} depth={DEPTH}/>}
    </group>
  </>
}

// All windows of the street in one instanced mesh.
function Windows({ buildings, world, night }) {
  const ref = useRef()
  const items = useMemo(() => {
    const r = rng(world.seed + 5), out = []
    for (const b of buildings) {
      const per = Math.max(1, Math.floor((b.w - 1.5) / 2.1)), x = b.side * (FRONT - .02)
      for (let f = b.room ? 1 : 0; f < b.floors; f++) for (let i = 0; i < per; i++) {
        const z = b.z + (i - (per - 1) / 2) * 2.1
        if (f === 0 && Math.abs(z - (b.z + (b.roll - .5) * (b.w - 2))) < 1.1) continue // the door
        out.push({ x, y: 1.6 + f * 3.1, z, lit: r() < (night ? .6 : .15) })
      }
    }
    return out
  }, [buildings, world, night])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), s = new THREE.Vector3(1.1, 1.5, 1)
    const warm = new THREE.Color(world.palette.light).lerp(new THREE.Color(world.palette.accent), .55).multiplyScalar(night ? 1.05 : .8)
    const dark = new THREE.Color(world.palette.skyTop).lerp(new THREE.Color('#1a1820'), .5)
    items.forEach((w, i) => { ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(w.x, w.y, w.z), q, s)); ref.current.setColorAt(i, w.lit ? warm : dark) })
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true
  }, [items, world, night])
  return <instancedMesh ref={ref} args={[null, null, items.length]}><planeGeometry/><meshBasicMaterial toneMapped={false} side={THREE.DoubleSide}/></instancedMesh>
}

// Street lamps on both kerbs + lantern strings across the street.
function StreetLights({ world, night }) {
  const posts = useRef(), bulbs = useRef(), strings = useRef()
  const lamps = useMemo(() => { const out = []; for (let z = -6; z > -LENGTH; z -= 14) for (const s of [-1, 1]) out.push([s * 5.0, z - (s > 0 ? 7 : 0)]); return out }, [])
  const { wire, beads } = useMemo(() => {
    const every = 24 - world.street.lanterns * 14, pts = [], beads = []
    for (let z = -10; z > -LENGTH; z -= every) {
      const line = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return new THREE.Vector3(-5.6 + t * 11.2, 5.4 - Math.sin(t * Math.PI) * .9, z) })
      line.slice(1).forEach((p, i) => pts.push(line[i], p)); line.slice(1, -1).forEach(p => beads.push(p))
    }
    return { wire: new THREE.BufferGeometry().setFromPoints(pts), beads }
  }, [world])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    lamps.forEach(([x, z], i) => { posts.current.setMatrixAt(i, m.makeTranslation(x, 1.6, z)); bulbs.current.setMatrixAt(i, m.makeTranslation(x, 3.3, z)) })
    beads.forEach((p, i) => strings.current.setMatrixAt(i, m.makeTranslation(p.x, p.y - .12, p.z)))
    ;[posts, bulbs, strings].forEach(ref => { ref.current.instanceMatrix.needsUpdate = true })
  }, [lamps, beads])
  const glow = new THREE.Color(world.palette.light).multiplyScalar(night ? 2.6 : 1.2), bead = new THREE.Color(world.palette.accent).multiplyScalar(night ? 2.4 : 1.2)
  return <group>
    <instancedMesh ref={posts} args={[null, null, lamps.length]} castShadow><cylinderGeometry args={[.06, .09, 3.2, 8]}/><meshStandardMaterial color="#2e2a33" metalness={.5} roughness={.5}/></instancedMesh>
    <instancedMesh ref={bulbs} args={[null, null, lamps.length]}><sphereGeometry args={[.22, 14, 10]}/><meshBasicMaterial color={glow} toneMapped={false}/></instancedMesh>
    <lineSegments geometry={wire}><lineBasicMaterial color="#2a2228"/></lineSegments>
    <instancedMesh ref={strings} args={[null, null, beads.length]}><sphereGeometry args={[.09, 8, 6]}/><meshBasicMaterial color={bead} toneMapped={false}/></instancedMesh>
  </group>
}

// Dreamy passers-by: soft translucent figures strolling both ways.
function Passersby({ world }) {
  const bodies = useRef(), heads = useRef()
  const walkers = useMemo(() => { const r = rng(world.seed + 9); return Array.from({ length: 12 }, () => ({ x: (r() < .5 ? -1 : 1) * (1.4 + r() * 2.8), z: -r() * LENGTH, v: (r() < .5 ? -1 : 1) * (.5 + r() * .6), h: .85 + r() * .35, p: r() * 6 })) }, [world])
  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), v = useMemo(() => new THREE.Vector3(), []), s = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    if (!bodies.current) return
    const t = clock.elapsedTime
    walkers.forEach((w, i) => {
      w.z += w.v * dt; if (w.z < -LENGTH) w.z = 2; if (w.z > 2) w.z = -LENGTH
      const bob = Math.abs(Math.sin(t * 4 + w.p)) * .05
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, w.v > 0 ? Math.PI : 0)
      bodies.current.setMatrixAt(i, m.compose(v.set(w.x, .75 * w.h + bob, w.z), q, s.set(w.h, w.h, w.h)))
      heads.current.setMatrixAt(i, m.compose(v.set(w.x, 1.62 * w.h + bob, w.z), q, s.set(w.h, w.h, w.h)))
    })
    bodies.current.instanceMatrix.needsUpdate = true; heads.current.instanceMatrix.needsUpdate = true
  })
  const tint = new THREE.Color(world.palette.accent).lerp(new THREE.Color(world.palette.skyHorizon), .4)
  return <>
    <instancedMesh ref={bodies} args={[null, null, walkers.length]} frustumCulled={false}><capsuleGeometry args={[.28, .9, 6, 12]}/><meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={.35} transparent opacity={.4} depthWrite={false}/></instancedMesh>
    <instancedMesh ref={heads} args={[null, null, walkers.length]} frustumCulled={false}><sphereGeometry args={[.24, 14, 10]}/><meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={.45} transparent opacity={.45} depthWrite={false}/></instancedMesh>
  </>
}

// Moonlight coins floating over the street; walk through one to pick it up.
function Coins({ coins, world }) {
  const ref = useRef(), taken = useRef(new Set())
  const upright = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), [])
  const { camera } = useThree()
  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), v = useMemo(() => new THREE.Vector3(), []), s = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    coins.forEach(([x, y, z], i) => {
      if (!taken.current.has(i) && Math.hypot(camera.position.x - x, camera.position.z - z) < 1.1) {
        taken.current.add(i); worldState.addCoins(1)
        playChime([84 + world.music.root + [0, 4, 7, 12][i % 4]])
      }
      const k = taken.current.has(i) ? 0 : 1
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t * 2 + i).multiply(upright) // stand the coin on edge, spinning
      ref.current.setMatrixAt(i, m.compose(v.set(x, y + Math.sin(t * 2 + i) * .12, z), q, s.set(k, k, k)))
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[null, null, coins.length]} frustumCulled={false}>
    <cylinderGeometry args={[.22, .22, .05, 20]}/><meshBasicMaterial color={new THREE.Color('#ffd46a').multiplyScalar(1.8)} toneMapped={false}/>
  </instancedMesh>
}

// Distant silhouettes behind the street so it never ends in a void.
function Skyline({ world }) {
  const ref = useRef()
  const blocks = useMemo(() => { const r = rng(world.seed + 13), out = []; for (let i = 0; i < 90; i++) out.push([(r() < .5 ? -1 : 1) * (22 + r() * 30), (6 + r() * 26), -r() * (LENGTH + 80) + 30, 4 + r() * 8]); return out }, [world])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    blocks.forEach(([x, h, z, w], i) => ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w))))
    ref.current.instanceMatrix.needsUpdate = true
  }, [blocks])
  return <instancedMesh ref={ref} args={[GEO.box, null, blocks.length]}><meshStandardMaterial color={new THREE.Color(world.palette.fog).lerp(new THREE.Color(world.palette.skyTop), .4)} roughness={1}/></instancedMesh>
}

export default function StrollWorld({ world }) {
  const layout = useMemo(() => layoutStreet(world), [world])
  const night = world.sky.time === 'night' || world.sky.time === 'dusk'
  const p = world.palette
  const road = useMemo(() => roadTexture(world.street.road, p.road, world.seed), [world])
  const sunDir = useMemo(() => {
    const el = { day: .85, dusk: .12, dawn: .15, night: .45 }[world.sky.time]
    return new THREE.Vector3(.25 * Math.cos(el), Math.sin(el), -Math.cos(el)).normalize()
  }, [world])
  useEffect(() => {
    const physics = makePhysics(layout)
    worldPhysics.active = true; worldPhysics.ground = physics.ground; worldPhysics.blockers = []
    worldPhysics.walkable = physics.walkable
    worldPhysics.spots = { door: START_DOOR, doors: [START_DOOR, END_DOOR], shops: layout.shops, interact: layout.interact }
    playerRig.teleport?.({ position: [0, 1.68, 6], yaw: 0, pitch: 0 })
    return () => {
      worldPhysics.active = false; worldPhysics.walkable = null; worldPhysics.spots = null; worldPhysics.ground = () => 0
      playerRig.teleport?.({ position: [-4.5, 1.68, 6.4], yaw: 0, pitch: 0 })
    }
  }, [layout])
  const light = { day: 2.6, dusk: 1.2, dawn: 1.3, night: .55 }[world.sky.time]
  return <>
    <color attach="background" args={[p.skyHorizon]}/>
    <fogExp2 attach="fog" args={[p.fog, .011]}/>
    <Sky spec={world} sunDir={sunDir}/>
    <hemisphereLight args={[p.skyHorizon, p.road, .55 + light * .3]}/>
    <ambientLight color={p.light} intensity={night ? .3 : .45}/>
    <directionalLight position={sunDir.clone().multiplyScalar(80).add(new THREE.Vector3(0, 0, -100))} color={p.light} intensity={light} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={60} shadow-camera-bottom={-60} shadow-camera-far={300}>
      <object3D attach="target" position={[0, 0, -100]}/>
    </directionalLight>
    {/* road + kerbs + wide ground */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -LENGTH / 2 + 4]} receiveShadow><planeGeometry args={[12.4, LENGTH + 20]}/><meshStandardMaterial map={road} roughness={.9}/></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -.02, -LENGTH / 2]}><planeGeometry args={[220, LENGTH + 260]}/><meshStandardMaterial color={new THREE.Color(p.road).multiplyScalar(.55)} roughness={1}/></mesh>
    {layout.buildings.map((b, i) => <Building key={i} b={b} world={world} night={night} layout={layout}/>)}
    {layout.props.map((inst, i) => { const Prop = renderer('prop', inst.prop); return Prop ? <Prop key={`p${i}`} {...inst} world={world} night={night}/> : null })}
    {layout.stairs.map((st, i) => <RoofDeck key={`r${i}`} stair={st} b={layout.buildings[st.building]} world={world} night={night}/>)}
    <Windows buildings={layout.buildings} world={world} night={night}/>
    <StreetLights world={world} night={night}/>
    <Passersby world={world}/>
    <Coins coins={layout.coins} world={world}/>
    <Skyline world={world}/>
    <Weather spec={world}/>
    <group position-z={-LENGTH - 40}><Hero {...world.hero} accent={p.accent} distance={90}/></group>
    <group position={START_DOOR} rotation-y={Math.PI}><DoorModel glow="#ffcf8a"/></group>
    <group position={END_DOOR}><DoorModel glow="#ffcf8a"/></group>
  </>
}
