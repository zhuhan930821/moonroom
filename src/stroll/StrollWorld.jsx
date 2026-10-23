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
export const LENGTH = 200
const FRONT = 6.2, DEPTH = 7, WALK = 5.3
export const START_DOOR = [0, 0, 9.4], END_DOOR = [0, 0, -LENGTH - 5]

// ---------- layout (pure; also used by the HUD for shop positions) ----------
export function layoutStreet(world) {
  const r = rng(world.seed), style = world.street.style, tall = world.street.height
  const walls = [world.palette.wallA, world.palette.wallB, world.palette.wallC]
  const buildings = []
  for (const side of [-1, 1]) {
    let z = -2
    while (z > -LENGTH + 4) {
      const w = 6 + r() * 4
      const floors = 1 + Math.floor(r() * (1.5 + tall * (style === 'gothic' ? 4 : 3)))
      buildings.push({ side, z: z - w / 2, w, floors, wall: walls[Math.floor(r() * 3)], roll: r(), shop: null })
      z -= w + .3 + r() * .8
    }
  }
  // Spread the shops evenly down the street, alternating sides.
  const shops = world.shops.map((shop, i) => {
    const targetZ = -14 - (i + .5) * ((LENGTH - 30) / world.shops.length), side = i % 2 ? 1 : -1
    const b = buildings.filter(b => b.side === side && !b.shop).reduce((best, b) => Math.abs(b.z - targetZ) < Math.abs(best.z - targetZ) ? b : best)
    b.shop = i; b.floors = Math.max(b.floors, 2)
    return { ...shop, index: i, side, z: b.z, w: b.w }
  })
  const coins = Array.from({ length: 46 }, (_, i) => [(r() - .5) * 8, 1.15, -8 - i * 4.2 - r() * 2])
  return { buildings, shops, coins }
}

// ---------- textures ----------
function canvasTexture(w, h, draw, repeat) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  draw(canvas.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}
function roadTexture(kind, base, seed) {
  const r = rng(seed), c = new THREE.Color(base)
  const shade = k => `#${c.clone().multiplyScalar(k).getHexString()}`
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = shade(.8); ctx.fillRect(0, 0, w, h)
    if (kind === 'cobble') for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      ctx.fillStyle = shade(.9 + r() * .35); ctx.beginPath(); ctx.ellipse(x * 32 + 16 + (y % 2) * 8, y * 32 + 16, 13, 12, r(), 0, Math.PI * 2); ctx.fill()
    }
    if (kind === 'boardwalk') for (let x = 0; x < 8; x++) { ctx.fillStyle = shade(.85 + r() * .3); ctx.fillRect(x * 32 + 1, 0, 30, h); ctx.fillStyle = shade(.6); ctx.fillRect(x * 32 + 14, (r() * h) | 0, 3, 3) }
    if (kind === 'sand' || kind === 'moss') for (let i = 0; i < 2500; i++) { ctx.fillStyle = shade(.75 + r() * .45); ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3) }
    if (kind === 'moss') for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(120,170,110,.35)'; ctx.beginPath(); ctx.arc(r() * w, r() * h, 6 + r() * 14, 0, 7); ctx.fill() }
    if (kind === 'glass') for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = shade(.9 + r() * .4); ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x * 64 + 6, y * 64 + 6, 20, 4) }
  }, [5, LENGTH / 3])
}
function signTexture(name, color) {
  return canvasTexture(512, 224, (ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(40,24,30,.55)'; ctx.lineWidth = 14; ctx.strokeRect(10, 10, w - 20, h - 20)
    ctx.fillStyle = '#2a1a22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `600 ${name.length > 4 ? 76 : 96}px "Songti SC","Noto Serif SC",Georgia,serif`; ctx.fillText(name, w / 2, h / 2 + 4)
  })
}

// ---------- roof geometries (unit size, scaled per building) ----------
function prism() { // gable: triangle in x–y, extruded along z
  const shape = new THREE.Shape(); shape.moveTo(-.5, 0); shape.lineTo(.5, 0); shape.lineTo(0, 1); shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); return g
}
const GEO = { prism: prism(), box: new THREE.BoxGeometry(1, 1, 1), cone4: new THREE.ConeGeometry(.71, 1, 4, 1).rotateY(Math.PI / 4), dome: new THREE.SphereGeometry(.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(.5, 1, 16) }

function Roof({ style, w, top, roof, roll, accent }) {
  const mat = <meshStandardMaterial color={roof} roughness={.75}/>
  const d = DEPTH
  if (style === 'cottage' || style === 'candy') return <mesh geometry={GEO.prism} position-y={top} scale={[d + .6, 2.2 + roll * 1.2, w + .3]} castShadow>{mat}</mesh>
  if (style === 'gothic') return <group>
    <mesh geometry={GEO.prism} position-y={top} scale={[d + .4, 4 + roll * 2, w + .2]} castShadow>{mat}</mesh>
    {roll > .55 && <mesh geometry={GEO.cone4} position={[-.5, top + 3 + roll * 3, 0]} scale={[1.6, 7, 1.6]} castShadow>{mat}</mesh>}
  </group>
  if (style === 'pagoda') return <group>
    {[0, 1, 2].slice(0, 1 + Math.round(roll * 2)).map(i => <mesh key={i} geometry={GEO.cone4} position-y={top + .6 + i * 1.5} scale={[d + 2 - i * 1.6, 1.3, w + 1.6 - i * 1.6]} castShadow>{mat}</mesh>)}
  </group>
  if (style === 'seaside') return <group>
    <mesh geometry={GEO.box} position-y={top + .2} scale={[d + .3, .4, w + .3]}>{mat}</mesh>
    {roll > .5 && <mesh geometry={GEO.box} position={[-1, top + 1.2, 0]} scale={[2, 1.6, 2]}><meshStandardMaterial color={accent} roughness={.6}/></mesh>}
  </group>
  if (style === 'desert') return <group>
    <mesh geometry={GEO.box} position-y={top + .2} scale={[d + .2, .4, w + .2]}>{mat}</mesh>
    {roll > .45 && <mesh geometry={GEO.dome} position-y={top + .4} scale={Math.min(d, w) * .8} castShadow>{mat}</mesh>}
  </group>
  if (style === 'crystal') return <mesh geometry={GEO.cone4} position-y={top + 2} scale={[d, 4 + roll * 3, w]}>
    <meshStandardMaterial color={roof} emissive={roof} emissiveIntensity={.35} roughness={.1} transparent opacity={.85}/></mesh>
  if (style === 'mushroom') return <mesh geometry={GEO.dome} position-y={top - .3} scale={[d + 3, 3 + roll * 2, w + 3]} castShadow>{mat}</mesh>
  return null
}

function Building({ b, world, night }) {
  const x = b.side * (FRONT + DEPTH / 2), H = b.floors * 3.1
  const shop = b.shop != null ? world.shops[b.shop] : null
  const sign = useMemo(() => shop && signTexture(shop.name, shop.sign), [shop])
  const front = -b.side * DEPTH / 2 // local x of the street-facing wall
  return <group position={[x, 0, b.z]}>
    <mesh geometry={GEO.box} position-y={H / 2} scale={[DEPTH, H, b.w]} castShadow receiveShadow><meshStandardMaterial color={b.wall} roughness={.85}/></mesh>
    {/* plinth + door */}
    <mesh geometry={GEO.box} position={[front - b.side * .05, .25, 0]} scale={[.2, .5, b.w + .1]}><meshStandardMaterial color={world.palette.roof} roughness={.9}/></mesh>
    <mesh geometry={GEO.box} position={[front - b.side * .04, 1.15, shop ? 0 : (b.roll - .5) * (b.w - 2)]} scale={[.1, 2.3, 1.2]}><meshStandardMaterial color={shop ? '#3a2a24' : '#4a3a40'} roughness={.6}/></mesh>
    <Roof style={world.street.style} w={b.w} top={H} roof={world.palette.roof} roll={b.roll} accent={world.palette.accent}/>
    {shop && <group position-x={front}>
      {/* awning, shop window glow, blade sign, counter with the goods */}
      <mesh position={[-b.side * .9, 3.0, 0]} rotation-z={b.side * .35} scale={[2, .08, b.w - .6]} geometry={GEO.box}><meshStandardMaterial color={shop.sign} roughness={.7}/></mesh>
      <mesh position={[-b.side * .03, 1.6, 0]} rotation-y={-b.side * Math.PI / 2}><planeGeometry args={[b.w - 2.2, 1.9]}/>
        <meshBasicMaterial color={new THREE.Color(world.palette.light).multiplyScalar(night ? 1.6 : 1.05)} toneMapped={false}/></mesh>
      <group position={[-b.side * 1.2, 3.9, b.w / 2 - .4]}>
        <mesh geometry={GEO.box} position-x={b.side * .55} scale={[1.2, .06, .06]}><meshStandardMaterial color="#3a3036" metalness={.6}/></mesh>
        <mesh position={[0, -.55, 0]}><planeGeometry args={[1.8, .8]}/><meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={night ? .55 : .15} side={THREE.DoubleSide}/></mesh>
      </group>
      <mesh geometry={GEO.box} position={[-b.side * .35, .5, 0]} scale={[.7, 1, b.w - 2.4]} castShadow><meshStandardMaterial color={world.palette.roof} roughness={.8}/></mesh>
      {shop.goods.map((g, i) => <SouvenirMesh key={g.id} shape={g.shape} color={g.color} glow={.5} spin={false} scale={1.3}
        position={[-b.side * .35, 1.12, (i - (shop.goods.length - 1) / 2) * 1.1]}/>)}
      <pointLight position={[-b.side * 2.2, 3, 0]} color={world.palette.light} intensity={night ? 14 : 4} distance={9} decay={2}/>
    </group>}
  </group>
}

// All windows of the street in one instanced mesh.
function Windows({ buildings, world, night }) {
  const ref = useRef()
  const items = useMemo(() => {
    const r = rng(world.seed + 5), out = []
    for (const b of buildings) {
      const per = Math.max(1, Math.floor((b.w - 1.5) / 2.1)), x = b.side * (FRONT - .02)
      for (let f = b.shop != null ? 1 : 0; f < b.floors; f++) for (let i = 0; i < per; i++) {
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
    worldPhysics.active = true; worldPhysics.ground = () => 0; worldPhysics.blockers = []
    worldPhysics.walkable = (x, z) => (Math.abs(x) < WALK && z < 8.6 && z > -LENGTH - 4.2)
    worldPhysics.spots = { door: START_DOOR, doors: [START_DOOR, END_DOOR], shops: layout.shops }
    playerRig.teleport?.({ position: [0, 1.68, 6], yaw: 0, pitch: 0 })
    return () => {
      worldPhysics.active = false; worldPhysics.walkable = null; worldPhysics.spots = null
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
    {layout.buildings.map((b, i) => <Building key={i} b={b} world={world} night={night}/>)}
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
