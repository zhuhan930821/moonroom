import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from './spec'

// Parametric landmarks: `height` (0–1), `tiers` (1–6) and `ornament` (0–1) let the same kind
// grow differently in every world. All sizes in metres before the landmark's own `scale`.
export function Landmark({ kind, color, glow, height = .5, tiers = 3, ornament = .5, seed, accent }) {
  const r = useMemo(() => rng(seed), [seed])
  const c = useMemo(() => new THREE.Color(color), [color])
  const e = useMemo(() => c.clone().lerp(new THREE.Color(accent), .35), [c, accent])
  const rand = useMemo(() => Array.from({ length: 24 }, () => [r(), r(), r()]), [r])
  const stone = <meshStandardMaterial color={c} emissive={c} emissiveIntensity={.12} roughness={.85}/>
  const lit = <meshStandardMaterial color={e} emissive={e} emissiveIntensity={.5 + glow * 2.4} roughness={.4} toneMapped={false}/>
  const H = .5 + height * 1.5 // overall height factor 0.5–2
  const n = Math.max(1, Math.round(tiers))
  const orn = k => rand.slice(0, Math.round(ornament * k))

  if (kind === 'tower') {
    const seg = 2.6 * H
    return <group>
      {Array.from({ length: n + 1 }, (_, i) => { const rad = 1.7 - i * (1.1 / (n + 1)); return <group key={i}>
        <mesh position-y={seg / 2 + i * seg} castShadow><cylinderGeometry args={[rad * .92, rad, seg, 20]}/>{stone}</mesh>
        {ornament > .2 && <mesh position-y={seg * .6 + i * seg}><cylinderGeometry args={[rad * .93, rad * .93, seg * .22, 20, 1, true]}/>{lit}</mesh>}
        {i > 0 && <mesh position-y={i * seg}><cylinderGeometry args={[rad * 1.12, rad * 1.12, .18, 20]}/>{stone}</mesh>}
      </group> })}
      <mesh position-y={(n + 1) * seg + 1.3 * H}><coneGeometry args={[.9, 2.6 * H, 16]}/>{stone}</mesh>
      <mesh position-y={(n + 1) * seg + 2.8 * H}><sphereGeometry args={[.3, 14, 10]}/>{lit}</mesh>
      {orn(6).map(([a], i) => <mesh key={i} position={[Math.cos(i * 1.05) * 1.9, (i + 1) * seg * .8, Math.sin(i * 1.05) * 1.9]} rotation-y={-i * 1.05}><boxGeometry args={[.05, .9, .6]}/>{lit}</mesh>)}
    </group>
  }
  if (kind === 'arch') {
    const R = 2.5 + H * 2.5
    return <group>
      {Array.from({ length: n }, (_, i) => <group key={i} position-z={(i - (n - 1) / 2) * 3.2} scale={1 - i * .05}>
        <mesh rotation-y={Math.PI / 2}><torusGeometry args={[R, .45, 14, 40, Math.PI]}/>{stone}</mesh>
        <mesh rotation-y={Math.PI / 2}><torusGeometry args={[R - .5, .07, 8, 40, Math.PI]}/>{lit}</mesh>
      </group>)}
      {orn(5).map(([a], i) => <mesh key={i} position={[0, R * Math.sin((i + 1) / 6 * Math.PI) - .6, R * Math.cos((i + 1) / 6 * Math.PI)]}><sphereGeometry args={[.18, 12, 8]}/>{lit}</mesh>)}
    </group>
  }
  if (kind === 'monolith') {
    const h = 3 + H * 5
    return <group rotation-z={(rand[0][0] - .5) * .18}>
      {Array.from({ length: n }, (_, i) => <mesh key={i} position={[(rand[i][1] - .5) * .3, h / n * (i + .5), 0]} rotation-y={(rand[i][2] - .5) * .25} castShadow>
        <boxGeometry args={[1.5 - i * .12, h / n * .96, .8 - i * .06]}/>{stone}</mesh>)}
      {orn(10).map(([a, b], i) => <mesh key={i} position={[(a - .5) * .9, .6 + b * (h - 1.2), .42]}><boxGeometry args={[.25 + a * .5, .07, .02]}/>{lit}</mesh>)}
      {ornament > .6 && <mesh position-y={h + .9}><octahedronGeometry args={[.45, 0]}/>{lit}</mesh>}
    </group>
  }
  if (kind === 'tree') {
    const h = 2.5 + H * 4
    return <group>
      <mesh position-y={h / 2} castShadow><cylinderGeometry args={[.22, .5, h, 10]}/><meshStandardMaterial color="#5b3f35" roughness={.9}/></mesh>
      {Array.from({ length: n }, (_, layer) => rand.slice(layer * 3, layer * 3 + 4).map(([a, b, d], i) =>
        <mesh key={`${layer}-${i}`} position={[(a - .5) * (3 - layer * .4), h + layer * 1.3 + b * .6, (d - .5) * (3 - layer * .4)]} castShadow>
          <icosahedronGeometry args={[1.3 - layer * .15 + b * .4, 1]}/>{stone}</mesh>))}
      {orn(12).map(([a, b, d], i) => <mesh key={`f${i}`} position={[(d - .5) * 3.2, h - .4 + a * n * 1.3, (b - .5) * 3.2]}><sphereGeometry args={[.13, 10, 8]}/>{lit}</mesh>)}
    </group>
  }
  if (kind === 'crystal') {
    return <group>
      {rand.slice(0, 2 + n * 2).map(([a, b, d], i) => <mesh key={i} position={[(a - .5) * 2.6, 0, (d - .5) * 2.6]} rotation={[(b - .5) * .7, a * 3, (d - .5) * .7]} scale={[.55, (1.5 + b * 3) * H, .55]}>
        <octahedronGeometry args={[1, 0]}/><meshStandardMaterial color={c} emissive={e} emissiveIntensity={.3 + glow * 1.6} roughness={.12} transparent opacity={.85}/>
      </mesh>)}
      {orn(8).map(([a, b, d], i) => <mesh key={`s${i}`} position={[(a - .5) * 4, 1 + b * 4 * H, (d - .5) * 4]}><octahedronGeometry args={[.08, 0]}/>{lit}</mesh>)}
    </group>
  }
  if (kind === 'lantern') {
    const h = 1.6 + H * 1.6
    return <group>
      <mesh position-y={h / 2}><cylinderGeometry args={[.05, .07, h, 8]}/><meshStandardMaterial color="#3a3340" metalness={.5}/></mesh>
      {Array.from({ length: Math.min(n, 3) }, (_, i) => { const a = i / Math.min(n, 3) * Math.PI * 2, arm = n > 1 ? .45 : 0
        return <group key={i} position={[Math.cos(a) * arm, h + .25 - i * .05, Math.sin(a) * arm]}>
          <mesh><sphereGeometry args={[.24 + ornament * .1, 16, 12]}/>{lit}</mesh>
          {ornament > .5 && <mesh position-y={.3}><coneGeometry args={[.28, .25, 12]}/>{stone}</mesh>}
        </group> })}
      {glow > .3 && <pointLight position-y={h + .25} color={e} intensity={glow * 6} distance={7} decay={2}/>}
    </group>
  }
  if (kind === 'ruin') {
    return <group>
      {Array.from({ length: n + 3 }, (_, i) => { const a = i / (n + 3) * Math.PI * 2, broken = rand[i][1] > .6, h = (1.5 + rand[i][0] * 3) * H
        return <group key={i} position={[Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2]}>
          <mesh position-y={h / 2} castShadow><cylinderGeometry args={[.38, .45, h, 12]}/>{stone}</mesh>
          {!broken && <mesh position-y={h + .15}><boxGeometry args={[1.1, .3, 1.1]}/>{stone}</mesh>}
          {broken && <mesh position={[.8, .35, .3]} rotation-z={1.45}><cylinderGeometry args={[.38, .4, 1.4, 12]}/>{stone}</mesh>}
        </group> })}
      {ornament > .3 && <mesh position-y={.06} rotation-x={-Math.PI / 2}><ringGeometry args={[2.3, 2.6, 48]}/>{lit}</mesh>}
    </group>
  }
  if (kind === 'floating-island') return <FloatingIsland stone={stone} lit={lit} phase={rand[0][0] * 6} altitude={8 + H * 10} houses={n} ornament={ornament}/>
  if (kind === 'shrine') {
    const h = 3 + H * 2.5
    return <group>
      {Array.from({ length: n }, (_, i) => <group key={i} position-z={i * 2.6} scale={1 - i * .04}>
        {[-1.6, 1.6].map(x => <mesh key={x} position={[x, h / 2, 0]} castShadow><cylinderGeometry args={[.2, .24, h, 12]}/>{stone}</mesh>)}
        <mesh position-y={h + .1}><boxGeometry args={[4.6, .32, .5]}/>{stone}</mesh>
        <mesh position-y={h - .6}><boxGeometry args={[3.8, .18, .32]}/>{ornament > .3 ? lit : stone}</mesh>
      </group>)}
    </group>
  }
  return null
}

function FloatingIsland({ stone, lit, phase, altitude, houses, ornament }) {
  const ref = useRef()
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = altitude + Math.sin(clock.elapsedTime * .3 + phase) * .8 })
  return <group ref={ref}>
    <mesh rotation-x={Math.PI}><coneGeometry args={[4, 6, 9]}/>{stone}</mesh>
    <mesh position-y={3.1}><cylinderGeometry args={[4, 4, .3, 9]}/><meshStandardMaterial color="#7a9a74" roughness={.9}/></mesh>
    {Array.from({ length: houses }, (_, i) => { const a = i / houses * Math.PI * 2 + phase
      return <group key={i} position={[Math.cos(a) * 2, 3.25, Math.sin(a) * 2]}>
        <mesh position-y={.45}><boxGeometry args={[.9, .9, .9]}/>{stone}</mesh>
        <mesh position-y={1.15} rotation-y={Math.PI / 4}><coneGeometry args={[.8, .6, 4]}/><meshStandardMaterial color="#8a4b4b" roughness={.8}/></mesh>
        {ornament > .3 && <mesh position={[0, .5, .46]}><planeGeometry args={[.25, .3]}/>{lit}</mesh>}
      </group> })}
  </group>
}

// The one huge thing on the horizon, straight ahead of the door, that names the world.
export function Hero({ kind, color, glow, accent, distance = 110 }) {
  const c = useMemo(() => new THREE.Color(color), [color]), e = useMemo(() => c.clone().lerp(new THREE.Color(accent), .4), [c, accent])
  const body = <meshStandardMaterial color={c} emissive={c} emissiveIntensity={.18} roughness={.9}/>
  const lit = <meshBasicMaterial color={e.clone().multiplyScalar(1 + glow * 1.5)} toneMapped={false}/>
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (kind === 'sky-whale') { const t = clock.elapsedTime * .05; ref.current.position.set(Math.sin(t) * 40, 45 + Math.sin(t * 3) * 4, -distance + Math.cos(t) * 10); ref.current.rotation.y = Math.cos(t) * .6 + Math.PI / 2 }
    if (kind === 'inverted-castle' || kind === 'spiral-tower') ref.current.rotation.y = clock.elapsedTime * .01
  })
  if (kind === 'none') return null
  return <group ref={ref} position={[0, 0, -distance]}>
    {kind === 'giant-tree' && <group scale={.62}>
      <mesh position-y={30}><cylinderGeometry args={[3, 6, 60, 16]}/><meshStandardMaterial color="#4b3530" roughness={.9}/></mesh>
      {[[0, 62, 0, 18], [-14, 56, 6, 13], [13, 58, -5, 14], [4, 72, -4, 12], [-8, 68, -8, 10]].map(([x, y, z, s], i) => <mesh key={i} position={[x, y, z]}><icosahedronGeometry args={[s, 2]}/>{body}</mesh>)}
      {glow > .2 && Array.from({ length: 16 }, (_, i) => <mesh key={`f${i}`} position={[Math.cos(i * 2.3) * 16, 50 + (i % 5) * 4, Math.sin(i * 2.3) * 10]}><sphereGeometry args={[.9, 10, 8]}/>{lit}</mesh>)}
    </group>}
    {kind === 'inverted-castle' && <group position-y={58}>
      <mesh rotation-x={Math.PI}><coneGeometry args={[20, 16, 10]}/>{body}</mesh>
      {[[0, 0, 4, 26], [-9, 3, 2.5, 18], [8, -4, 2.5, 20], [3, 9, 2, 14], [-5, -9, 2, 16]].map(([x, z, r, h], i) => <group key={i} position={[x, -8 - h / 2, z]}>
        <mesh><cylinderGeometry args={[r, r, h, 12]}/>{body}</mesh>
        <mesh position-y={-h / 2 - 3}><coneGeometry args={[r * 1.2, 6, 12]} /><meshStandardMaterial color={e} roughness={.6}/></mesh>
        <mesh position-y={-h * .2}><cylinderGeometry args={[r * 1.01, r * 1.01, 1.4, 12, 1, true]}/>{lit}</mesh>
      </group>)}
    </group>}
    {kind === 'colossal-moon' && <group position-y={18}>
      <mesh><sphereGeometry args={[42, 48, 32]}/><meshBasicMaterial color={c.clone().multiplyScalar(1.1 + glow * .6)} toneMapped={false} fog={false}/></mesh>
      {[[-14, 12, 9], [10, -6, 6], [16, 18, 5], [-6, -16, 7], [2, 4, 4]].map(([x, y, r], i) => <mesh key={i} position={[x, y, 41]}><circleGeometry args={[r, 24]}/><meshBasicMaterial color={c.clone().multiplyScalar(.75)} toneMapped={false} fog={false}/></mesh>)}
    </group>}
    {kind === 'great-arch' && <group>
      <mesh><torusGeometry args={[38, 3.2, 20, 80, Math.PI]}/>{body}</mesh>
      <mesh><torusGeometry args={[34.5, .5, 10, 80, Math.PI]}/>{lit}</mesh>
    </group>}
    {kind === 'spiral-tower' && <group>
      {Array.from({ length: 40 }, (_, i) => <mesh key={i} position={[Math.cos(i * .5) * 6, i * 2, Math.sin(i * .5) * 6]} rotation-y={-i * .5}><boxGeometry args={[9, 1.6, 3]}/>{body}</mesh>)}
      <mesh position-y={40}><cylinderGeometry args={[3, 4, 80, 16]}/>{body}</mesh>
      <mesh position-y={83}><sphereGeometry args={[3.5, 20, 14]}/>{lit}</mesh>
    </group>}
    {kind === 'sky-whale' && <group>
      <mesh scale={[1, .55, .6]}><sphereGeometry args={[22, 32, 20]}/>{body}</mesh>
      <mesh position={[-24, 2, 0]} rotation-z={.4} scale={[1, .2, 1]}><coneGeometry args={[9, 14, 3]}/>{body}</mesh>
      {[-1, 1].map(s => <mesh key={s} position={[4, -7, s * 11]} rotation-x={s * .8} scale={[1, .15, .5]}><sphereGeometry args={[8, 16, 10]}/>{body}</mesh>)}
      <mesh position={[0, -11.5, 0]} scale={[1, .1, .5]}><sphereGeometry args={[18, 24, 12]}/>{lit}</mesh>
    </group>}
  </group>
}

// Thousands of small things on the ground (instanced), thinning near the arrival plaza.
export function Scatter({ kind, density, color, ground, seed, radius = 55 }) {
  const ref = useRef()
  const count = kind === 'none' ? 0 : Math.round(400 + density * 2600)
  const geometry = useMemo(() => {
    if (kind === 'grass') { const g = new THREE.ConeGeometry(.05, .5, 3); g.translate(0, .25, 0); return g }
    if (kind === 'flowers') { const g = new THREE.SphereGeometry(.09, 6, 4); g.translate(0, .32, 0); return g }
    if (kind === 'stones') return new THREE.DodecahedronGeometry(.18, 0)
    if (kind === 'shells') { const g = new THREE.SphereGeometry(.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); return g }
    if (kind === 'crystals') { const g = new THREE.OctahedronGeometry(.14, 0); g.scale(.6, 2, .6); g.translate(0, .2, 0); return g }
    if (kind === 'mushrooms') { const g = new THREE.SphereGeometry(.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(0, .18, 0); return g }
    return null
  }, [kind])
  useLayoutEffect(() => {
    if (!ref.current || !count) return
    const r = rng(seed + 77), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), tint = new THREE.Color(), base = new THREE.Color(color)
    let i = 0
    while (i < count) {
      const a = r() * Math.PI * 2, d = 4 + Math.sqrt(r()) * radius
      if (d < 9 && r() < .7) continue // keep the plaza mostly clear
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      p.set(x, ground(x, z), z); q.setFromEuler(new THREE.Euler((r() - .5) * .3, r() * 6.28, (r() - .5) * .3))
      const k = .6 + r() * .9; s.set(k, k * (kind === 'grass' ? .6 + r() * 1.2 : 1), k)
      ref.current.setMatrixAt(i, m.compose(p, q, s))
      ref.current.setColorAt(i, tint.copy(base).offsetHSL((r() - .5) * .08, 0, (r() - .5) * .2))
      i++
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count, color, ground, seed, kind, radius])
  if (!count || !geometry) return null
  const glowy = kind === 'crystals' || kind === 'mushrooms'
  return <instancedMesh ref={ref} args={[geometry, null, count]} receiveShadow>
    <meshStandardMaterial roughness={kind === 'shells' ? .4 : .85} emissive={glowy ? color : '#000000'} emissiveIntensity={glowy ? .6 : 0} flatShading={kind === 'stones' || kind === 'crystals'}/>
  </instancedMesh>
}
