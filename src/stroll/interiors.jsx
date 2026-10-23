import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../worlds/spec'
import { worldState } from '../worlds/worldState'
import SouvenirMesh from '../worlds/SouvenirMesh'
import { DEPTH, FLOOR_H, FRONT } from './constants'
import { all } from './registry'
import { DEFAULT_LOOK } from './content/species'

// ---------- shared bits ----------
const BOX = new THREE.BoxGeometry(1, 1, 1)
// A box in building-local coordinates: u = depth from the front wall, z along the street.
function Part({ side, u0, u1, y0, y1, z0, z1, color, children, ...props }) {
  return <mesh geometry={BOX} position={[side * ((u0 + u1) / 2 - DEPTH / 2), (y0 + y1) / 2, (z0 + z1) / 2]} scale={[u1 - u0, y1 - y0, z1 - z0]} castShadow receiveShadow {...props}>
    {children || <meshStandardMaterial color={color} roughness={.85}/>}
  </mesh>
}

// The front wall with holes (door, display windows): vertical strips between holes, plus the
// pieces above and below each hole.
function FrontWall({ side, w, holes, color, glass }) {
  const pieces = [], sorted = [...holes].sort((a, b) => a.z - b.z)
  let z = -w / 2
  for (const h of sorted) {
    if (h.z - h.w / 2 > z) pieces.push([z, h.z - h.w / 2, 0, FLOOR_H])
    if (h.y0 > 0) pieces.push([h.z - h.w / 2, h.z + h.w / 2, 0, h.y0])
    pieces.push([h.z - h.w / 2, h.z + h.w / 2, h.y1, FLOOR_H])
    z = h.z + h.w / 2
  }
  if (z < w / 2) pieces.push([z, w / 2, 0, FLOOR_H])
  return <>
    {pieces.map(([z0, z1, y0, y1], i) => <Part key={i} side={side} u0={0} u1={.2} y0={y0} y1={y1} z0={z0} z1={z1} color={color}/>)}
    {holes.filter(h => h.y0 > 0).map((h, i) => <mesh key={`g${i}`} position={[side * (.1 - DEPTH / 2), (h.y0 + h.y1) / 2, h.z]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[h.w, h.y1 - h.y0]}/><meshPhysicalMaterial color={glass} transparent opacity={.22} roughness={.05} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>)}
  </>
}

// Ground floor shell (floor, walls, ceiling) + the solid storeys above.
function Shell({ b, holes, palette, floorColor, children }) {
  const H = b.floors * FLOOR_H, s = b.side, w = b.w
  const inner = useMemo(() => new THREE.Color(b.wall).lerp(new THREE.Color('#fff8ee'), .45).getStyle(), [b.wall])
  return <group position={[s * (FRONT + DEPTH / 2), 0, b.z]}>
    <Part side={s} u0={.2} u1={DEPTH - .2} y0={0} y1={.04} z0={-w / 2 + .2} z1={w / 2 - .2} color={floorColor}/>
    <Part side={s} u0={DEPTH - .2} u1={DEPTH} y0={0} y1={FLOOR_H} z0={-w / 2} z1={w / 2} color={inner}/>
    <Part side={s} u0={0} u1={DEPTH} y0={0} y1={FLOOR_H} z0={-w / 2} z1={-w / 2 + .2} color={inner}/>
    <Part side={s} u0={0} u1={DEPTH} y0={0} y1={FLOOR_H} z0={w / 2 - .2} z1={w / 2} color={inner}/>
    <FrontWall side={s} w={w} holes={holes} color={b.wall} glass={palette.light}/>
    <Part side={s} u0={0} u1={DEPTH} y0={FLOOR_H - .1} y1={FLOOR_H} z0={-w / 2} z1={w / 2} color={inner}/>
    {b.floors > 1 && <Part side={s} u0={0} u1={DEPTH} y0={FLOOR_H} y1={H} z0={-w / 2} z1={w / 2} color={b.wall}/>}
    {children}
  </group>
}

// Wall shelves full of little jars and books: one instanced mesh per shelf unit.
function ShelfUnit({ side, u, z0, z1, rows = 3, seed, palette, wood }) {
  const ref = useRef()
  const items = useMemo(() => {
    const r = rng(seed), out = [], colors = [palette.accent, palette.wallB, palette.wallC, palette.light, palette.roof]
    for (let row = 0; row < rows; row++) for (let z = z0 + .2; z < z1 - .2; z += .18 + r() * .14)
      out.push({ y: 1 + row * .62, z, h: .2 + r() * .22, c: colors[Math.floor(r() * colors.length)] })
    return out
  }, [seed, rows, z0, z1, palette])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color()
    items.forEach((it, i) => { ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(side * (u - DEPTH / 2), it.y + it.h / 2, it.z), new THREE.Quaternion(), new THREE.Vector3(.18, it.h, .12))); ref.current.setColorAt(i, c.set(it.c)) })
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true
  }, [items, side, u])
  return <>
    {Array.from({ length: rows + 1 }, (_, row) => <Part key={row} side={side} u0={u - .2} u1={u + .2} y0={.96 + row * .62} y1={1 + row * .62} z0={z0} z1={z1} color={wood}/>)}
    <instancedMesh ref={ref} args={[BOX, null, items.length]} castShadow><meshStandardMaterial roughness={.6}/></instancedMesh>
  </>
}

function HangingLamp({ side, u, z, color, intensity }) {
  return <group position={[side * (u - DEPTH / 2), FLOOR_H - .1, z]}>
    <mesh position-y={-.3}><cylinderGeometry args={[.01, .01, .6, 6]}/><meshStandardMaterial color="#2a2228"/></mesh>
    <mesh position-y={-.7}><sphereGeometry args={[.2, 16, 12]}/><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.8)} toneMapped={false}/></mesh>
    <pointLight position-y={-.8} color={color} intensity={intensity} distance={7} decay={2}/>
  </group>
}

// ---------- shopkeepers: little animals picked from the keeper's description ----------
function speciesOf(text) { return all('species').find(sp => sp.match.test(text)) || DEFAULT_LOOK }

export function Keeper({ text, apron, position, facing }) {
  const sp = useMemo(() => speciesOf(text), [text])
  const head = useRef(), body = useRef(), root = useRef()
  const { camera } = useThree()
  const mat = <meshStandardMaterial color={sp.color} roughness={.9}/>
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.sin(t * 2) * .02
    if (head.current && root.current) { // turn to look at you when you're close
      const p = root.current.getWorldPosition(new THREE.Vector3())
      const near = Math.hypot(camera.position.x - p.x, camera.position.z - p.z) < 5
      const target = near ? Math.atan2(camera.position.x - p.x, camera.position.z - p.z) - facing : Math.sin(t * .5) * .3
      head.current.rotation.y += (THREE.MathUtils.clamp(target, -1, 1) - head.current.rotation.y) * .08
      head.current.rotation.z = Math.sin(t * 1.3) * .05
    }
  })
  return <group ref={root} position={position} rotation-y={facing}><group ref={body}>
    <mesh position-y={.55} scale={[1, 1.1, .85]} castShadow><sphereGeometry args={[.42, 20, 14]}/>{mat}</mesh>
    <mesh position={[0, .5, .3]} scale={[.8, .9, .3]}><sphereGeometry args={[.4, 16, 12]}/><meshStandardMaterial color={apron} roughness={.8}/></mesh>
    {sp.spikes && Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[Math.cos(i * .7) * .3, .7 + (i % 3) * .12, -.25]} rotation-x={-.8}><coneGeometry args={[.06, .25, 5]}/><meshStandardMaterial color="#6a5040"/></mesh>)}
    <group ref={head} position-y={1.2}>
      <mesh castShadow><sphereGeometry args={[.36, 20, 16]}/>{mat}</mesh>
      <mesh position={[0, -.08, .27]} scale={[1, .75, .7]}><sphereGeometry args={[.16, 14, 10]}/><meshStandardMaterial color={sp.snout} roughness={.9}/></mesh>
      {sp.beak ? <mesh position={[0, -.04, .38]} rotation-x={Math.PI / 2}><coneGeometry args={[.07, .18, 8]}/><meshStandardMaterial color="#e8a040"/></mesh>
        : <mesh position={[0, 0, .41]}><sphereGeometry args={[.04, 10, 8]}/><meshStandardMaterial color="#2a1a20"/></mesh>}
      {[-1, 1].map(x => <mesh key={x} position={[x * .13, .07, .31]}><sphereGeometry args={[.045, 10, 8]}/><meshStandardMaterial color="#1a1018" roughness={.2}/></mesh>)}
      {[-1, 1].map(x => <mesh key={`b${x}`} position={[x * .22, -.08, .25]} scale={[1, .6, .3]}><sphereGeometry args={[.06, 10, 8]}/><meshStandardMaterial color="#ff9aa8" roughness={.9}/></mesh>)}
      {sp.ears !== 'none' && [-1, 1].map(x => sp.ears === 'round'
        ? <mesh key={x} position={[x * .26, .28, 0]}><sphereGeometry args={[.11, 12, 10]}/>{mat}</mesh>
        : <mesh key={x} position={[x * .2, sp.ears === 'long' ? .5 : .32, 0]} rotation-z={-x * .25} scale={sp.ears === 'long' ? [.6, 2.2, .5] : sp.ears === 'small' ? [.7, .7, .7] : [1, 1, .6]}>
            <coneGeometry args={[.12, .3, 10]}/>{mat}</mesh>)}
      {sp.antlers && [-1, 1].map(x => <mesh key={`a${x}`} position={[x * .18, .45, -.05]} rotation-z={-x * .5}><cylinderGeometry args={[.025, .035, .4, 6]}/><meshStandardMaterial color="#e8d8b0"/></mesh>)}
      {sp.glow && <pointLight color="#e8f070" intensity={2} distance={2.5} decay={2}/>}
    </group>
  </group></group>
}

// ---------- shop interior ----------
export function ShopInterior({ b, shop, world, night }) {
  const p = world.palette, s = b.side, w = b.w
  const holes = [{ z: 0, w: 1.5, y0: 0, y1: 2.4 }]
  if (w > 7.2) holes.push({ z: -w / 4 - .25, w: Math.min(1.8, w / 4), y0: .9, y1: 2.3 }, { z: w / 4 + .25, w: Math.min(1.8, w / 4), y0: .9, y1: 2.3 })
  const wood = new THREE.Color(p.roof).lerp(new THREE.Color('#6a4a3a'), .5).getStyle()
  const fire = ['cottage', 'gothic', 'seaside'].includes(world.street.style)
  return <Shell b={b} holes={holes} palette={p} floorColor={wood}>
    {/* counter + the goods on it */}
    <Part side={s} u0={3.65} u1={4.4} y0={0} y1={.95} z0={-w / 2 + .9} z1={w / 2 - .9} color={wood}/>
    <Part side={s} u0={3.55} u1={4.5} y0={.95} y1={1.02} z0={-w / 2 + .8} z1={w / 2 - .8} color={shop.sign}/>
    {shop.goods.map((g, i) => <SouvenirMesh key={g.id} shape={g.shape} color={g.color} glow={.55} spin scale={1.2}
      position={[s * (4.0 - DEPTH / 2), 1.1, (i - (shop.goods.length - 1) / 2) * 1.1]}/>)}
    <Keeper text={shop.keeper} apron={shop.sign} position={[s * (5.25 - DEPTH / 2), 0, 0]} facing={-s * Math.PI / 2}/>
    <ShelfUnit side={s} u={DEPTH - .45} z0={-w / 2 + .5} z1={w / 2 - .5} seed={world.seed + b.id} palette={p} wood={wood}/>
    {/* rug, lamp, and a fireplace or plants by style */}
    <Part side={s} u0={.8} u1={3.2} y0={.04} y1={.06} z0={-1.2} z1={1.2} color={shop.sign} castShadow={false}/>
    <HangingLamp side={s} u={2.2} z={0} color={p.light} intensity={night ? 9 : 5}/>
    {fire ? <group>
      <Part side={s} u0={1.6} u1={2.8} y0={0} y1={1.3} z0={-w / 2 + .2} z1={-w / 2 + .7} color="#8a7a78"/>
      <mesh position={[s * (2.2 - DEPTH / 2), .4, -w / 2 + .72]}><planeGeometry args={[.7, .55]}/><meshBasicMaterial color={new THREE.Color('#ff8a3a').multiplyScalar(2)} toneMapped={false}/></mesh>
      <pointLight position={[s * (2.2 - DEPTH / 2), .6, -w / 2 + 1.2]} color="#ff9a4a" intensity={4} distance={4} decay={2}/>
    </group> : [-1, 1].map(k => <group key={k} position={[s * (.6 - DEPTH / 2), 0, k * (w / 2 - .6)]}>
      <mesh position-y={.25}><cylinderGeometry args={[.22, .17, .5, 12]}/><meshStandardMaterial color={p.wallB}/></mesh>
      <mesh position-y={.8}><icosahedronGeometry args={[.4, 1]}/><meshStandardMaterial color="#6a9a5a" roughness={.9}/></mesh>
    </group>)}
  </Shell>
}

// ---------- home interior ----------
export function HomeInterior({ b, world, night, found }) {
  const p = world.palette, s = b.side, w = b.w, dz = b.doorZ - b.z
  const owned = useSyncExternalStore(worldState.subscribe, () => found ? worldState.owns(world, found.good) : true)
  const wood = new THREE.Color(p.roof).lerp(new THREE.Color('#7a5a44'), .6).getStyle()
  const blanket = p.wallC
  return <Shell b={b} holes={[{ z: dz, w: 1.4, y0: 0, y1: 2.35 }]} palette={p} floorColor={wood}>
    {/* the front door, swung open into the room */}
    <group position={[s * (.2 - DEPTH / 2), 0, dz - .7]} rotation-y={s * 1.25}><mesh position={[s * 0, 1.17, .7]} geometry={BOX} scale={[.08, 2.3, 1.38]}><meshStandardMaterial color={p.roof} roughness={.7}/></mesh></group>
    {/* bed in the back corner */}
    <Part side={s} u0={DEPTH - 2.4} u1={DEPTH - .2} y0={0} y1={.45} z0={w / 2 - 2.0} z1={w / 2 - .2} color={wood}/>
    <Part side={s} u0={DEPTH - 2.35} u1={DEPTH - .25} y0={.45} y1={.65} z0={w / 2 - 1.95} z1={w / 2 - .25} color="#f4eee6"/>
    <Part side={s} u0={DEPTH - 1.6} u1={DEPTH - .25} y0={.65} y1={.72} z0={w / 2 - 1.97} z1={w / 2 - .23} color={blanket}/>
    <Part side={s} u0={DEPTH - .75} u1={DEPTH - .3} y0={.65} y1={.85} z0={w / 2 - 1.7} z1={w / 2 - .5} color="#ffffff"/>
    {/* table, chair, lamp */}
    <Part side={s} u0={2.7} u1={3.8} y0={.8} y1={.87} z0={-.65} z1={.65} color={wood}/>
    {[[2.8, -.55], [3.7, -.55], [2.8, .55], [3.7, .55]].map(([u, z], i) => <Part key={i} side={s} u0={u - .04} u1={u + .04} y0={0} y1={.8} z0={z - .04} z1={z + .04} color={wood}/>)}
    <Part side={s} u0={2.0} u1={2.45} y0={0} y1={.48} z0={-.25} z1={.25} color={p.wallB}/>
    <Part side={s} u0={1.95} u1={2.05} y0={.48} y1={1.1} z0={-.25} z1={.25} color={p.wallB}/>
    <group position={[s * (3.55 - DEPTH / 2), .87, -.45]}>
      <mesh position-y={.15}><cylinderGeometry args={[.05, .08, .3, 10]}/><meshStandardMaterial color={p.accent}/></mesh>
      <mesh position-y={.38}><coneGeometry args={[.18, .22, 14, 1, true]}/><meshStandardMaterial color="#fff4dc" emissive="#ffd890" emissiveIntensity={1.4} side={THREE.DoubleSide}/></mesh>
    </group>
    {found && !owned && <SouvenirMesh shape={found.good.shape} color={found.good.color} glow={.7} spin={false} position={[s * (3.25 - DEPTH / 2), .98, 0]} scale={1.1}/>}
    <ShelfUnit side={s} u={1.2} z0={-w / 2 + .3} z1={-w / 2 + .3 + Math.min(2.2, w / 3)} rows={2} seed={world.seed + b.id * 3} palette={p} wood={wood}/>
    <Part side={s} u0={1.0} u1={3.5} y0={.04} y1={.055} z0={-1.4} z1={1.4} color={p.wallC} castShadow={false}/>
    {/* a window in the back wall that glows with the outside light */}
    <mesh position={[s * (DEPTH - .21 - DEPTH / 2), 1.7, -w / 4]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[1.2, 1.1]}/>
      <meshBasicMaterial color={new THREE.Color(night ? p.skyTop : p.skyHorizon).multiplyScalar(night ? 2.2 : 1.2)} toneMapped={false}/></mesh>
    <pointLight position={[s * (3 - DEPTH / 2), 2.5, 0]} color={p.light} intensity={night ? 7 : 4} distance={7} decay={2}/>
  </Shell>
}

// ---------- outside stair + rooftop terrace ----------
export function RoofDeck({ stair, b, world, night }) {
  const p = world.palette, s = stair.side, steps = 22, rise = stair.height / steps, run = (stair.bottom - stair.top) / steps
  const rail = new THREE.Color(p.roof).lerp(new THREE.Color('#2a2228'), .4).getStyle()
  const deck = new THREE.Color(p.wallA).lerp(new THREE.Color('#8a7a70'), .4).getStyle()
  const zc = (stair.z0 + stair.z1) / 2, H = stair.height
  return <group>
    {/* steps + rail + supports */}
    {Array.from({ length: steps }, (_, i) => <mesh key={i} geometry={BOX} position={[s * 5.1, rise * (i + .5), stair.bottom - run * (i + .5)]} scale={[1, rise, run + .02]} castShadow receiveShadow>
      <meshStandardMaterial color={deck} roughness={.85}/></mesh>)}
    <mesh geometry={BOX} position={[s * 4.55, H / 2 + .55, (stair.top + stair.bottom) / 2]} rotation-x={Math.atan2(H, stair.bottom - stair.top)} scale={[.06, .06, Math.hypot(H, stair.bottom - stair.top)]}><meshStandardMaterial color={rail}/></mesh>
    {[.33, .66].map(k => <mesh key={k} geometry={BOX} position={[s * 5.1, H * (1 - k) / 2, stair.top + (stair.bottom - stair.top) * k]} scale={[.18, H * (1 - k), .18]}><meshStandardMaterial color={rail}/></mesh>)}
    {/* landing over the pavement */}
    <mesh geometry={BOX} position={[s * (4.6 + (FRONT + .6 - 4.6) / 2), H - .1, stair.top - .8]} scale={[FRONT + .6 - 4.6, .2, 1.6]} receiveShadow><meshStandardMaterial color={deck}/></mesh>
    {/* roof slab, parapet with a gap at the landing */}
    <mesh geometry={BOX} position={[s * (FRONT + DEPTH / 2), H - .1, zc]} scale={[DEPTH, .2, b.w]} receiveShadow><meshStandardMaterial color={deck} roughness={.9}/></mesh>
    {[[0, DEPTH, stair.z0, stair.z0 + .1], [DEPTH - .1, DEPTH, stair.z0, stair.z1], [0, .1, stair.z0, stair.top - 1.6]].map(([u0, u1, z0, z1], i) =>
      <mesh key={i} geometry={BOX} position={[s * (FRONT + (u0 + u1) / 2), H + .45, (z0 + z1) / 2]} scale={[u1 - u0, .9, z1 - z0]}><meshStandardMaterial color={rail}/></mesh>)}
    {/* a little garden: bench, pots, telescope, string lights */}
    <group position={[s * (FRONT + DEPTH - 1), H, zc]}>
      <mesh geometry={BOX} position-y={.45} scale={[.5, .1, 1.8]}><meshStandardMaterial color={p.roof}/></mesh>
      <mesh geometry={BOX} position={[s * .2, .75, 0]} scale={[.1, .6, 1.8]}><meshStandardMaterial color={p.roof}/></mesh>
    </group>
    {[-1, 1].map(k => <group key={k} position={[s * (FRONT + 1.2), H, zc + k * (b.w / 2 - 1)]}>
      <mesh position-y={.3}><cylinderGeometry args={[.3, .24, .6, 12]}/><meshStandardMaterial color={p.wallB}/></mesh>
      <mesh position-y={.95}><icosahedronGeometry args={[.5, 1]}/><meshStandardMaterial color="#6a9a5a" roughness={.9}/></mesh>
    </group>)}
    <group position={[s * (FRONT + 2.4), H, zc - 1]} rotation-y={s * -.6}>
      {[0, 2.1, 4.2].map(a => <mesh key={a} position={[Math.cos(a) * .25, .5, Math.sin(a) * .25]} rotation={[Math.sin(a) * .3, 0, -Math.cos(a) * .3]}><cylinderGeometry args={[.02, .02, 1.1, 6]}/><meshStandardMaterial color="#3a3236"/></mesh>)}
      <mesh position-y={1.15} rotation-z={1.0}><cylinderGeometry args={[.07, .1, .9, 14]}/><meshStandardMaterial color={p.accent} metalness={.6} roughness={.3}/></mesh>
    </group>
    {Array.from({ length: 9 }, (_, i) => <mesh key={`l${i}`} position={[s * (FRONT + .4 + i * .75), H + 2.1 - Math.sin(i / 8 * Math.PI) * .4, zc + b.w / 2 - .4]}>
      <sphereGeometry args={[.07, 8, 6]}/><meshBasicMaterial color={new THREE.Color(p.accent).multiplyScalar(night ? 2.4 : 1.3)} toneMapped={false}/></mesh>)}
  </group>
}
