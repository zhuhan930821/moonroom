import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DECOR_COLLIDERS } from '../game/collision'
import { hungItems, photoWall } from '../game/photoWall'
import { layoutPhotoWall } from './photoWallLayout'
import { builtinCanvas } from './photoArt'

// Decor pass 03: the layer of the 2D reference that the room still lacked — ivy curtains over
// the arches and along the loft, a photo wall + neon moon-fox on the left wall, hanging stars and
// a glass orb, desk greenery/crystals/lamp, a desk chair with a star blanket, a coffee table
// setting with floor cushions, headphones and open books, guitars by the bed, lanterns and
// candles. Leaves, blossoms, candles and crystals are instanced; few real lights.

const rand = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 } }
const LEAF_GREENS = ['#4f7a52', '#5f8b5c', '#3f6648', '#7aa070', '#6a8f62']
const BLOSSOMS = ['#f4a6c4', '#ffd0e0', '#e88ab4', '#fff2f6', '#c9a3e8']

// Colliders for the pieces you could otherwise walk through (pushed once, on import).
const box = (x0, x1, z0, z1) => ({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 })
DECOR_COLLIDERS.push(
  box(-.6, .6, .6, 1.8),        // coffee table
  box(-4.75, -3.65, .95, 2.05), // flower floor cushion
  box(8.9, 9.95, -1.8, .1),     // guitars + amp
)

// ---------- ivy: strands hanging from points, leaves + blossoms instanced ----------
function leafGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, 0); s.bezierCurveTo(.05, .03, .06, .1, 0, .15); s.bezierCurveTo(-.06, .1, -.05, .03, 0, 0)
  const g = new THREE.ShapeGeometry(s, 4); g.translate(0, -.01, 0); return g
}
const LEAF = leafGeometry(), BLOOM = new THREE.IcosahedronGeometry(.045, 0)

function strandsFor(seed) {
  const r = rand(seed), out = []
  // Over each arch: strands from the arch curve and the beam above it.
  for (const [cx, w] of [[-5.25, 4.6], [0, 4.85], [5.25, 4.6]]) {
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (.05 + .9 * r())
      out.push({ x: cx + Math.cos(a) * w / 2 * (1 + (r() - .5) * .1), y: 4.1 + Math.sin(a) * 3.4, z: -7.25 - r() * .2, len: .6 + r() * (a > .6 && a < 2.5 ? 1.6 : 3.2), bloom: .35 })
    }
  }
  for (let i = 0; i < 26; i++) out.push({ x: -9.6 + r() * 19.2, y: 7.75, z: -7.0 - r() * .5, len: .5 + r() * 2.2, bloom: .25 })
  // Loft front rail (x≈-6.1, z .7–7.8, y 5.3) and its underside.
  for (let i = 0; i < 26; i++) out.push({ x: -6.05 + (r() - .5) * .2, y: 5.25, z: .8 + r() * 6.9, len: .5 + r() * 2.0, bloom: .3 })
  // Right wall shelf + corner by the bed.
  for (let i = 0; i < 10; i++) out.push({ x: 9.75, y: 3.5 + r() * .2, z: -1.6 + r() * 1.5, len: .4 + r() * 1.3, bloom: .2 })
  return out.map(s => ({ ...s, seed: Math.floor(r() * 1e6) }))
}

function Ivy() {
  const leaves = useRef(), blooms = useRef()
  const { L, B } = useMemo(() => {
    const L = [], B = []
    for (const s of strandsFor(7)) {
      const r = rand(s.seed), n = Math.round(s.len / .1)
      let x = s.x, z = s.z
      for (let i = 0; i < n; i++) {
        const y = s.y - i * .1
        x += (r() - .5) * .03; z += (r() - .5) * .02
        for (const side of [-1, 1]) L.push({ p: [x + side * .03, y, z], rot: [(r() - .5) * .9, r() * 6.28, side * (.6 + r() * .6) + Math.PI], k: .7 + r() * .7 * (1 - i / n * .5), c: LEAF_GREENS[Math.floor(r() * LEAF_GREENS.length)] })
        if (r() < s.bloom * (i < 6 ? 1.6 : .7)) B.push({ p: [x + (r() - .5) * .1, y, z + .04], k: .45 + r() * .5, c: BLOSSOMS[Math.floor(r() * BLOSSOMS.length)] })
      }
    }
    return { L, B }
  }, [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color()
    L.forEach((l, i) => { leaves.current.setMatrixAt(i, m.compose(new THREE.Vector3(...l.p), q.setFromEuler(e.set(...l.rot)), new THREE.Vector3(l.k, l.k, l.k))); leaves.current.setColorAt(i, c.set(l.c)) })
    B.forEach((b, i) => { blooms.current.setMatrixAt(i, m.compose(new THREE.Vector3(...b.p), q.identity(), new THREE.Vector3(b.k, b.k, b.k))); blooms.current.setColorAt(i, c.set(b.c)) })
    for (const ref of [leaves, blooms]) { ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true }
  }, [L, B])
  return <>
    <instancedMesh ref={leaves} args={[LEAF, null, L.length]} frustumCulled={false}><meshStandardMaterial side={THREE.DoubleSide} roughness={.8}/></instancedMesh>
    <instancedMesh ref={blooms} args={[BLOOM, null, B.length]} frustumCulled={false}><meshStandardMaterial roughness={.7} emissive="#ff9ec7" emissiveIntensity={.12}/></instancedMesh>
  </>
}

// ---------- potted plants & flower vases (one prototype, many placements) ----------
function Plant({ position, scale = 1, pot = '#e8dccb', bush = 'leafy', flowers = 0, seed = 1 }) {
  const r = useMemo(() => rand(seed), [seed])
  const parts = useMemo(() => Array.from({ length: bush === 'tall' ? 9 : bush === 'vase' ? 10 : 7 }, () => [r(), r(), r()]), [r, bush])
  return <group position={position} scale={scale}>
    <mesh position-y={.14} castShadow><cylinderGeometry args={[.16, .12, .28, 14]}/><meshStandardMaterial color={pot} roughness={.6}/></mesh>
    {bush === 'vase' ? <>
      <mesh position-y={.14}><cylinderGeometry args={[.1, .14, .28, 14]}/><meshPhysicalMaterial color="#ffffff" transparent opacity={.35} roughness={.05}/></mesh>
      {parts.map(([a, b, c], i) => <group key={i} rotation={[(a - .5) * .7, b * 6, (c - .5) * .7]}>
        <mesh position-y={.4}><cylinderGeometry args={[.006, .006, .45, 4]}/><meshStandardMaterial color="#5f8b5c"/></mesh>
        {[0, 1, 2].map(k => <mesh key={k} position={[(k - 1) * .025, .6 + k * .03 + a * .06, (k % 2) * .02]}><sphereGeometry args={[.022 + c * .012, 6, 5]}/><meshStandardMaterial color={BLOSSOMS[(i + k) % BLOSSOMS.length]} roughness={.7}/></mesh>)}
        <mesh position={[.03, .45, 0]} rotation-z={-.8} scale={[.5, 1, .2]}><sphereGeometry args={[.05, 6, 4]}/><meshStandardMaterial color="#5f8b5c"/></mesh>
      </group>)}
    </> : parts.map(([a, b, c], i) => <mesh key={i} position={[(a - .5) * .3, .32 + b * (bush === 'tall' ? .7 : .28), (c - .5) * .3]} rotation={[a, b * 6, c]} scale={[1, .55, 1]} castShadow>
      <sphereGeometry args={[.12 + c * .06, 8, 6]}/><meshStandardMaterial color={LEAF_GREENS[i % LEAF_GREENS.length]} roughness={.85}/>
    </mesh>)}
    {flowers > 0 && parts.slice(0, flowers).map(([a, b], i) => <mesh key={`f${i}`} position={[(b - .5) * .3, .5 + a * .3, (a - .5) * .3]}><sphereGeometry args={[.04, 8, 6]}/><meshStandardMaterial color={BLOSSOMS[i % 3]}/></mesh>)}
  </group>
}

function Monstera({ position, scale = 1, seed = 3 }) {
  const r = useMemo(() => rand(seed), [seed])
  const leaves = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * Math.PI * 2 + r() * .4, tilt: .5 + r() * .5, h: .7 + r() * .7 })), [r])
  return <group position={position} scale={scale}>
    <mesh position-y={.25} castShadow><cylinderGeometry args={[.28, .22, .5, 16]}/><meshStandardMaterial color="#c98a6a" roughness={.7}/></mesh>
    {leaves.map((l, i) => <group key={i} rotation-y={l.a}>
      <mesh position={[0, l.h * .5 + .4, .05]} rotation-x={.2}><cylinderGeometry args={[.012, .015, l.h, 5]}/><meshStandardMaterial color="#4f7a52"/></mesh>
      <mesh position={[0, l.h + .45, .35]} rotation-x={-l.tilt} scale={[1, 1.25, .08]}><sphereGeometry args={[.28, 12, 8]}/><meshStandardMaterial color={LEAF_GREENS[i % 3]} roughness={.7}/></mesh>
    </group>)}
  </group>
}

// ---------- candles & crystals (instanced) ----------
const CANDLES = [
  // coffee table, desk, bookshelf top, window sills, floor clusters
  [.25, .47, 1.05], [.35, .47, 1.25], [-2.0, 1.31, -4.75], [4.0, 1.31, -3.75], [3.75, 1.31, -3.85],
  [-9.3, .02, -.9], [-9.1, .02, -1.1], [-5.6, .02, -6.9], [-5.4, .02, -7.0], [5.3, .02, -6.95], [5.5, .02, -6.85],
  [9.4, .02, 6.6], [9.2, .02, 6.85], [-2.4, .02, 7.35], [-2.2, .02, 7.5], [2.4, .02, 7.4],
]
const CRYSTALS = [[3.95, 1.31, -4.7, 1.2], [4.15, 1.31, -4.55, .8], [-3.9, 1.31, -4.75, .9], [.1, .47, 1.35, .7], [9.5, 3.55, -.4, 1], [9.55, 3.55, -1.2, .7], [-8.3, 2.2, -5.8, .9]]
function Candles() {
  const wax = useRef(), flame = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    CANDLES.forEach(([x, y, z], i) => { const h = .08 + (i % 3) * .05; wax.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h / .1, 1))) })
    wax.current.instanceMatrix.needsUpdate = true
  }, [])
  const tmp = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    CANDLES.forEach(([x, y, z], i) => { const h = .08 + (i % 3) * .05, k = .85 + Math.sin(t * 9 + i * 1.7) * .12; flame.current.setMatrixAt(i, tmp.compose(new THREE.Vector3(x, y + h + .03, z), new THREE.Quaternion(), new THREE.Vector3(k, k * 1.4, k))) })
    flame.current.instanceMatrix.needsUpdate = true
  })
  return <>
    <instancedMesh ref={wax} args={[null, null, CANDLES.length]}><cylinderGeometry args={[.035, .035, .1, 10]}/><meshStandardMaterial color="#f6ead6" emissive="#ffb070" emissiveIntensity={.15}/></instancedMesh>
    <instancedMesh ref={flame} args={[null, null, CANDLES.length]} frustumCulled={false}><sphereGeometry args={[.018, 8, 6]}/><meshBasicMaterial color={new THREE.Color('#ffb15a').multiplyScalar(3)} toneMapped={false}/></instancedMesh>
  </>
}
function Crystals() {
  const ref = useRef()
  const parts = useMemo(() => CRYSTALS.flatMap(([x, y, z, k], i) => { const r = rand(i + 11); return Array.from({ length: 4 }, () => ({ p: [x + (r() - .5) * .14 * k, y, z + (r() - .5) * .14 * k], rot: [(r() - .5) * .6, r() * 6, (r() - .5) * .6], s: [.05 * k, (.1 + r() * .12) * k, .05 * k] })) }), [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
    parts.forEach((c, i) => ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(c.p[0], c.p[1] + c.s[1] * .8, c.p[2]), q.setFromEuler(e.set(...c.rot)), new THREE.Vector3(...c.s))))
    ref.current.instanceMatrix.needsUpdate = true
  }, [parts])
  return <instancedMesh ref={ref} args={[null, null, parts.length]}><octahedronGeometry args={[1, 0]}/><meshStandardMaterial color="#b48ae8" emissive="#9a6ad8" emissiveIntensity={.6} roughness={.15} transparent opacity={.9}/></instancedMesh>
}

// ---------- the photo wall (left wall, under the loft) ----------
// Which photos hang is up to the player (src/game/photoWall.js); the layout is a staggered
// salon arrangement (src/scene/photoWallLayout.js).
const FRAME_COLORS = { polaroid: '#f6f0e6', wood: '#6a4430', black: '#2a2228', gold: '#c8a060', cream: '#efe4d0' }
// The free band of wall between the chair rail (y 2.78), the loft soffit (y 3.82), the moon
// wall relief (z < 1.55, scripts/build_ceiling_wall_dressing.py) and the music shelf (z 3.98).
const PHOTO_WALL = { centerZ: 2.78, centerY: 3.3, width: 2.3, height: .88 }
function photoTexture(item) {
  const t = item.src ? new THREE.TextureLoader().load(item.src) : new THREE.CanvasTexture(builtinCanvas(item.id))
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
// Crops the texture to the frame's shape (like object-fit: cover).
function coverCrop(texture, frameAspect, imageAspect) {
  texture.repeat.set(1, 1); texture.offset.set(0, 0)
  if (frameAspect > imageAspect) { texture.repeat.y = imageAspect / frameAspect; texture.offset.y = (1 - texture.repeat.y) / 2 }
  else { texture.repeat.x = frameAspect / imageAspect; texture.offset.x = (1 - texture.repeat.x) / 2 }
}
function FramedPhoto({ p, item, texture }) {
  const polaroid = p.frame === 'polaroid'
  const picY = polaroid ? (p.h - p.ph) / 2 - (p.w - p.pw) / 2 : 0
  useLayoutEffect(() => { coverCrop(texture, p.pw / p.ph, item.src ? item.aspect : 1); texture.needsUpdate = true }, [texture, p.pw, p.ph, item])
  return <group position={[p.x, p.y, 0]} rotation-z={p.rot}>
    <mesh position-z={-.008}><boxGeometry args={[p.w, p.h, .025]}/><meshStandardMaterial color={FRAME_COLORS[p.frame]} roughness={p.frame === 'gold' ? .35 : .8} metalness={p.frame === 'gold' ? .55 : 0}/></mesh>
    {p.frame === 'cream' && <mesh position-z={.0055}><planeGeometry args={[p.pw + .03, p.ph + .03]}/><meshStandardMaterial color="#8a6a50" roughness={.8}/></mesh>}
    <mesh position={[0, picY, .006]}><planeGeometry args={[p.pw, p.ph]}/><meshStandardMaterial map={texture} roughness={.6}/></mesh>
    {polaroid && <mesh position={[0, p.h / 2 - .005, .008]} rotation-z={(p.rot * 7) % .3}><planeGeometry args={[.11, .035]}/><meshStandardMaterial color={BLOSSOMS[Math.abs(Math.round(p.x * 10)) % 5]} transparent opacity={.85} roughness={.9}/></mesh>}
  </group>
}
function PhotoWall() {
  const wall = useSyncExternalStore(photoWall.subscribe, photoWall.get)
  const items = useMemo(() => hungItems(wall), [wall])
  const layout = useMemo(() => layoutPhotoWall(items, { seed: wall.seed, width: PHOTO_WALL.width, height: PHOTO_WALL.height }), [items, wall.seed])
  // One texture per photo id, kept while it hangs and disposed once taken down.
  const cache = useRef(new Map())
  const textures = useMemo(() => {
    const next = new Map()
    for (const item of items) next.set(item.id, cache.current.get(item.id) || photoTexture(item))
    for (const [id, t] of cache.current) if (!next.has(id)) t.dispose()
    cache.current = next
    return next
  }, [items])
  useEffect(() => () => cache.current.forEach(t => t.dispose()), [])
  return <group position={[-9.93, PHOTO_WALL.centerY, PHOTO_WALL.centerZ]} rotation-y={Math.PI / 2}>
    {layout.map(p => <FramedPhoto key={p.id} p={p} item={items.find(item => item.id === p.id)} texture={textures.get(p.id)}/>)}
    {/* a string of photo-clip lights across the gallery */}
    {Array.from({ length: 10 }, (_, i) => <mesh key={`l${i}`} position={[-1.2 + i * 2.4 / 9, 3.77 - PHOTO_WALL.centerY - Math.sin(i / 9 * Math.PI) * .07, .03]}><sphereGeometry args={[.028, 8, 6]}/><meshBasicMaterial color={new THREE.Color('#ffc77a').multiplyScalar(2.2)} toneMapped={false}/></mesh>)}
  </group>
}

// ---------- neon moon + fox (left wall, beside the photos) ----------
function NeonSign() {
  const tube = (pts, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), closed), 80, .022, 8, closed)
  const moon = useMemo(() => tube([[.0, .5], [-.3, .35], [-.38, 0], [-.28, -.32], [.02, -.46], [-.1, -.22], [-.13, .05], [-.06, .3], [0, .5]]), [])
  const fox = useMemo(() => tube([[.2, -.42], [.22, -.05], [.3, .18], [.28, .38], [.36, .26], [.44, .32], [.44, .16], [.5, .05], [.46, -.05], [.56, -.2], [.66, -.42], [.62, -.15], [.78, -.1], [.82, -.3], [.74, -.44], [.2, -.42]]), [])
  const glow = useRef(), mat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5ab8').multiplyScalar(1.3), toneMapped: false }), [])
  useFrame(({ clock }) => { const k = .92 + Math.sin(clock.elapsedTime * 2.2) * .04 + (Math.sin(clock.elapsedTime * 13) > .97 ? -.3 : 0); mat.color.setRGB(1.35 * k, .32 * k, .95 * k); if (glow.current) glow.current.intensity = 5 * k })
  return <group position={[-9.9, 3.55, 5.2]} rotation-y={Math.PI / 2} scale={1.3}>
    <mesh geometry={moon} material={mat}/>
    <mesh geometry={fox} material={mat}/>
    <pointLight ref={glow} position={[.2, 0, .5]} color="#ff7ac8" intensity={5} distance={4.5} decay={2}/>
  </group>
}

// ---------- hanging stars + glass orb pendant ----------
function Pendants() {
  const star = useMemo(() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, rr = i % 2 ? .07 : .17; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) } return new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 1 }) }, [])
  const stars = [[-3.6, 6.1, -6.4], [-1.2, 6.6, -6.7], [1.6, 6.3, -6.5], [3.4, 5.9, -6.6], [6.5, 6.5, -6.3], [-7.6, 6.4, -6.4], [2.6, 6.9, -5.2]]
  const group = useRef()
  useFrame(({ clock }) => group.current?.children.forEach((c, i) => { c.rotation.y = Math.sin(clock.elapsedTime * .5 + i) * .4 }))
  return <>
    <group ref={group}>{stars.map(([x, y, z], i) => <group key={i} position={[x, y, z]}>
      <mesh position-y={(7.9 - y) / 2}><cylinderGeometry args={[.006, .006, 7.9 - y, 4]}/><meshStandardMaterial color="#c9b08a"/></mesh>
      <mesh geometry={star}><meshStandardMaterial color="#ffd27a" emissive="#ffb84a" emissiveIntensity={1.4} metalness={.6} roughness={.3}/></mesh>
    </group>)}</group>
    {/* glass orb pendant, right of the castle arch */}
    <group position={[8.1, 5.5, -6.3]}>
      <mesh position-y={1.2}><cylinderGeometry args={[.008, .008, 2.4, 4]}/><meshStandardMaterial color="#c9b08a"/></mesh>
      <mesh><sphereGeometry args={[.42, 32, 24]}/><meshStandardMaterial color="#ffe8c8" emissive="#ffb868" emissiveIntensity={.9} transparent opacity={.55} roughness={.2} depthWrite={false}/></mesh>
      <mesh><sphereGeometry args={[.14, 16, 12]}/><meshBasicMaterial color={new THREE.Color('#ffc477').multiplyScalar(2.6)} toneMapped={false}/></mesh>
      <mesh position-y={.44}><cylinderGeometry args={[.06, .1, .08, 16]}/><meshStandardMaterial color="#c9a46a" metalness={.8} roughness={.3}/></mesh>
      <pointLight color="#ffc477" intensity={6} distance={6} decay={2}/>
    </group>
  </>
}

// ---------- desk: chair with star blanket, lamp, plants ----------
function blanketTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const g = c.getContext('2d'); g.fillStyle = '#3a3a7a'; g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#e8c070'; const r = rand(3)
  for (let i = 0; i < 26; i++) { const x = r() * 256, y = r() * 256, k = 4 + r() * 8; g.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5, rr = j % 2 ? k * .45 : k; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) } g.fill() }
  g.strokeStyle = '#e8c070'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 240)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function DeskChair() {
  const tex = useMemo(blanketTexture, [])
  // A cloth panel hanging from the backrest roll: soft vertical folds that deepen toward the hem.
  const drape = useMemo(() => {
    const g = new THREE.PlaneGeometry(.72, .9, 24, 12), pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), down = (.45 - y) / .9
      pos.setXYZ(i, x * (1 + down * .15), y - .45, Math.sin(x * 26) * .035 * down + down * .06)
    }
    g.computeVertexNormals(); return g
  }, [])
  return <group position={[-.3, 0, -2.95]} rotation-y={.25}>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 1.256) * .3, .06, Math.sin(i * 1.256) * .3]}><sphereGeometry args={[.04, 8, 6]}/><meshStandardMaterial color="#2a2a30"/></mesh>)}
    <mesh position-y={.32}><cylinderGeometry args={[.04, .04, .5, 10]}/><meshStandardMaterial color="#3a3a40" metalness={.6}/></mesh>
    <mesh position-y={.6}><boxGeometry args={[.62, .1, .58]}/><meshStandardMaterial color="#4a4650" roughness={.8}/></mesh>
    <mesh position={[0, 1.05, .28]} rotation-x={-.12}><boxGeometry args={[.58, .8, .08]}/><meshStandardMaterial color="#4a4650" roughness={.8}/></mesh>
    {/* the star blanket thrown over the back: a soft roll on top, folds hanging off one side */}
    <mesh position={[0, 1.46, .3]} rotation-z={Math.PI / 2} scale={[1, 1, .8]}><cylinderGeometry args={[.07, .07, .66, 12]}/><meshStandardMaterial map={tex} roughness={.95}/></mesh>
    <mesh geometry={drape} position={[0, 1.47, .36]}><meshStandardMaterial map={tex} roughness={.95} side={THREE.DoubleSide}/></mesh>
    {Array.from({ length: 9 }, (_, i) => <mesh key={`t${i}`} position={[-.3 + i * .07, .6 - (i % 3) * .03, .4]}><cylinderGeometry args={[.006, .006, .08, 4]}/><meshStandardMaterial color="#e8c070"/></mesh>)}
  </group>
}
function DeskLamp() {
  return <group position={[4.0, 1.31, -4.6]} rotation-y={-.6}>
    <mesh position-y={.02}><cylinderGeometry args={[.11, .13, .04, 18]}/><meshStandardMaterial color="#c9a46a" metalness={.8} roughness={.3}/></mesh>
    <mesh position={[0, .28, .05]} rotation-x={.3}><cylinderGeometry args={[.012, .012, .55, 6]}/><meshStandardMaterial color="#c9a46a" metalness={.8}/></mesh>
    <mesh position={[0, .55, .2]} rotation-x={1.0}><coneGeometry args={[.14, .2, 18, 1, true]}/><meshStandardMaterial color="#e8c48a" side={THREE.DoubleSide} metalness={.5}/></mesh>
    <mesh position={[0, .5, .24]}><sphereGeometry args={[.05, 10, 8]}/><meshBasicMaterial color={new THREE.Color('#ffd09a').multiplyScalar(2.5)} toneMapped={false}/></mesh>
    <pointLight position={[0, .45, .3]} color="#ffc48a" intensity={3} distance={3.2} decay={2}/>
  </group>
}

// ---------- the lounge: coffee table, cushions, headphones, books ----------
function CoffeeTable() {
  return <group position={[0, 0, 1.2]}>
    <mesh position-y={.42} castShadow receiveShadow><cylinderGeometry args={[.62, .62, .06, 36]}/><meshStandardMaterial color="#8a5a3c" roughness={.6}/></mesh>
    <mesh position-y={.2}><cylinderGeometry args={[.08, .2, .4, 12]}/><meshStandardMaterial color="#6a4430"/></mesh>
    {/* mug with a fox, a stack of books, an open laptop, flowers, a candle in a glass */}
    <group position={[-.3, .45, -.1]}><mesh position-y={.06}><cylinderGeometry args={[.05, .045, .12, 14]}/><meshStandardMaterial color="#f6f0e8"/></mesh>
      <mesh position={[.055, .06, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[.03, .008, 6, 12]}/><meshStandardMaterial color="#f6f0e8"/></mesh></group>
    {[0, 1, 2].map(i => <mesh key={i} position={[-.18, .47 + i * .035, .25]} rotation-y={i * .3}><boxGeometry args={[.26, .03, .18]}/><meshStandardMaterial color={['#7a5aa8', '#e8a0b8', '#4a6a9a'][i]}/></mesh>)}
    <group position={[.22, .45, .05]} rotation-y={-2.6}>
      <mesh position-y={.01}><boxGeometry args={[.42, .02, .3]}/><meshStandardMaterial color="#c8c8d0" metalness={.7} roughness={.3}/></mesh>
      <mesh position={[0, .15, -.15]} rotation-x={-.25}><boxGeometry args={[.42, .3, .015]}/><meshStandardMaterial color="#c8c8d0" metalness={.7} roughness={.3}/></mesh>
      <mesh position={[0, .15, -.141]} rotation-x={-.25}><planeGeometry args={[.36, .24]}/><meshBasicMaterial color={new THREE.Color('#e8b0e0').multiplyScalar(1.2)} toneMapped={false}/></mesh>
    </group>
    <Plant position={[-.05, .45, .4]} scale={.8} bush="vase" seed={21}/>
    <pointLight position={[.3, .9, .2]} color="#ffb070" intensity={2} distance={3} decay={2}/>
  </group>
}
function FlowerCushion({ position, color = '#f2a8c4', seed = 4 }) {
  return <group position={position}>
    {Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * .32, .15, Math.sin(a) * .32]} rotation-y={-a} scale={[1, .55, .7]} castShadow>
      <sphereGeometry args={[.3, 14, 10]}/><meshStandardMaterial color={color} roughness={1}/></mesh> })}
    <mesh position-y={.22} scale={[1, .45, 1]}><sphereGeometry args={[.26, 16, 10]}/><meshStandardMaterial color="#ffd8e4" roughness={1}/></mesh>
  </group>
}
function FloorBits() {
  return <group>
    {/* headphones */}
    <group position={[-.95, .05, 2.3]} rotation={[-Math.PI / 2 + .2, 0, .6]}>
      <mesh><torusGeometry args={[.13, .015, 8, 24, Math.PI]}/><meshStandardMaterial color="#2a2830" roughness={.4}/></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * .13, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.06, .06, .05, 18]}/><meshStandardMaterial color="#3a3640"/></mesh>)}
    </group>
    {/* open books */}
    {[[-.3, 2.6, .4], [.6, 2.05, -.3]].map(([x, z, r], i) => <group key={i} position={[x, .03, z]} rotation-y={r}>
      {[-1, 1].map(s => <mesh key={s} position={[s * .12, .01, 0]} rotation-z={s * -.08}><boxGeometry args={[.24, .02, .32]}/><meshStandardMaterial color="#f6efe2" roughness={.9}/></mesh>)}
      <mesh position-y={-.004}><boxGeometry args={[.5, .012, .34]}/><meshStandardMaterial color={['#8a4a6a', '#3a5a8a'][i]}/></mesh>
    </group>)}
    {/* round floor pouf next to the sofa */}
    <mesh position={[2.9, .2, 1.5]} scale={[1, .55, 1]} castShadow><sphereGeometry args={[.42, 20, 14]}/><meshStandardMaterial color="#f4c8d4" roughness={1}/></mesh>
  </group>
}

// ---------- lanterns ----------
function Lantern({ position, scale = 1, light = false }) {
  return <group position={position} scale={scale}>
    <mesh position-y={.02}><boxGeometry args={[.3, .04, .3]}/><meshStandardMaterial color="#b0844a" metalness={.7} roughness={.35}/></mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <mesh key={i} position={[a * .13, .22, b * .13]}><boxGeometry args={[.02, .4, .02]}/><meshStandardMaterial color="#b0844a" metalness={.7} roughness={.35}/></mesh>)}
    <mesh position-y={.22}><boxGeometry args={[.25, .38, .25]}/><meshPhysicalMaterial color="#fff2dc" transparent opacity={.25} roughness={.1}/></mesh>
    <mesh position-y={.15}><cylinderGeometry args={[.05, .05, .14, 12]}/><meshStandardMaterial color="#f6ead6"/></mesh>
    <mesh position-y={.25}><sphereGeometry args={[.035, 8, 6]}/><meshBasicMaterial color={new THREE.Color('#ffb15a').multiplyScalar(3)} toneMapped={false}/></mesh>
    <mesh position-y={.44}><coneGeometry args={[.2, .12, 4]}/><meshStandardMaterial color="#b0844a" metalness={.7} roughness={.35}/></mesh>
    <mesh position-y={.53}><torusGeometry args={[.04, .01, 6, 12]}/><meshStandardMaterial color="#b0844a" metalness={.7}/></mesh>
    {light && <pointLight position-y={.3} color="#ffa95a" intensity={2.4} distance={3.2} decay={2}/>}
  </group>
}

// ---------- right wall: guitars, amp, a wall shelf ----------
function Guitar({ position, color, rot = 0 }) {
  return <group position={position} rotation={[0, -Math.PI / 2, rot]}>
    <mesh position-y={.32} scale={[1, 1.15, .32]} castShadow><sphereGeometry args={[.22, 18, 12]}/><meshStandardMaterial color={color} roughness={.4}/></mesh>
    <mesh position-y={.6} scale={[.85, .95, .3]}><sphereGeometry args={[.17, 16, 10]}/><meshStandardMaterial color={color} roughness={.4}/></mesh>
    <mesh position={[0, .45, .075]}><circleGeometry args={[.055, 16]}/><meshStandardMaterial color="#1a1418"/></mesh>
    <mesh position-y={1.05}><boxGeometry args={[.05, .62, .03]}/><meshStandardMaterial color="#5a3a26"/></mesh>
    <mesh position-y={1.42}><boxGeometry args={[.08, .14, .03]}/><meshStandardMaterial color="#3a2a1e"/></mesh>
  </group>
}
function MusicWall() {
  return <group>
    <Guitar position={[9.62, 0, -1.45]} color="#e8a060" rot={.12}/>
    <Guitar position={[9.62, 0, -.35]} color="#8a2a3a" rot={-.1}/>
    <group position={[9.4, 0, -.9]}>
      <mesh position-y={.32} castShadow><boxGeometry args={[.45, .64, .55]}/><meshStandardMaterial color="#2a2428" roughness={.7}/></mesh>
      <mesh position={[-.226, .28, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[.46, .4]}/><meshStandardMaterial color="#6a5a50" roughness={1}/></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[-.226, .57, -.15 + i * .1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.015, .015, .02, 8]}/><meshStandardMaterial color="#e8d0a0" metalness={.6}/></mesh>)}
    </group>
    {/* wall shelf above with plants, a fox figurine and crystals */}
    <mesh position={[9.78, 3.5, -.8]}><boxGeometry args={[.36, .05, 1.8]}/><meshStandardMaterial color="#7a5038"/></mesh>
    <Plant position={[9.75, 3.52, -1.5]} scale={.7} pot="#d8a0b0" seed={31}/>
    <Plant position={[9.75, 3.52, .0]} scale={.65} bush="vase" seed={32}/>
    <group position={[9.72, 3.53, -.75]} rotation-y={-Math.PI / 2} scale={.5}>
      <mesh position-y={.2} scale={[1, 1.1, 1]}><sphereGeometry args={[.18, 14, 10]}/><meshStandardMaterial color="#e0783a"/></mesh>
      <mesh position={[0, .45, .05]}><sphereGeometry args={[.14, 14, 10]}/><meshStandardMaterial color="#e0783a"/></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * .08, .6, .05]}><coneGeometry args={[.05, .12, 6]}/><meshStandardMaterial color="#c0602a"/></mesh>)}
      <mesh position={[0, .2, -.22]} rotation-x={-.6} scale={[.6, 1.6, .6]}><sphereGeometry args={[.1, 10, 8]}/><meshStandardMaterial color="#fff4e8"/></mesh>
    </group>
  </group>
}

export default function ReferenceDecor() {
  return <group>
    <Ivy/>
    <PhotoWall/>
    <NeonSign/>
    <Pendants/>
    <Candles/>
    <Crystals/>
    <DeskChair/>
    <DeskLamp/>
    {/* desk greenery + flowers */}
    <Plant position={[-3.85, 1.31, -4.65]} scale={.9} seed={41} flowers={3}/>
    <Plant position={[-1.6, 1.31, -4.8]} scale={.75} bush="vase" seed={42}/>
    <Plant position={[1.35, 1.31, -4.8]} scale={.7} seed={43}/>
    <Plant position={[3.3, 1.31, -4.8]} scale={.8} bush="vase" seed={44}/>
    {/* big floor plants framing the window wall, by the bed, by the drums */}
    <Monstera position={[-6.8, 0, -7.0]} scale={1.1} seed={51}/>
    <Monstera position={[6.9, 0, -7.0]} scale={1.05} seed={52}/>
    <Monstera position={[9.3, 0, 7.2]} scale={.9} seed={53}/>
    <Plant position={[-4.6, 0, -6.95]} scale={1.6} bush="tall" pot="#d8a0b0" seed={54}/>
    <Plant position={[4.4, 0, -6.95]} scale={1.6} bush="tall" seed={55}/>
    <Plant position={[-9.4, 0, 6.9]} scale={1.5} bush="tall" pot="#c98a6a" seed={56} flowers={4}/>
    <CoffeeTable/>
    <FlowerCushion position={[-4.2, 0, 1.5]}/>
    <FloorBits/>
    <Lantern position={[-5.5, 0, -6.4]} light/>
    <Lantern position={[5.4, 0, -6.4]} scale={1.1}/>
    <Lantern position={[9.3, 0, 6.3]} light/>
    <Lantern position={[-2.8, 0, 7.4]} scale={.9}/>
    <Lantern position={[-8.6, 0, 4.9]} scale={.8}/>
    <MusicWall/>
  </group>
}
