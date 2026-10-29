import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox as SoftBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { DECOR_COLLIDERS } from '../game/collision'
import { hungItems, photoWall } from '../game/photoWall'
import { layoutPhotoWall } from './photoWallLayout'
import { builtinCanvas } from './photoArt'
import GLBAsset from './AssetModel'
import { guitarAmpLevel, guitarVisual } from '../audio/guitar'

// Decor pass 03: photo wall, neon, hanging stars, desk props, floor cushions,
// guitars, lanterns and candles. Botanical props use textured GLBs; the dedicated
// Blender dressing asset supplies ceiling and window greenery.

const rand = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 } }
const BLOSSOMS = ['#f4a6c4', '#ffd0e0', '#e88ab4', '#fff2f6', '#c9a3e8']

// Colliders for the pieces you could otherwise walk through (pushed once, on import).
const box = (x0, x1, z0, z1) => ({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 })
DECOR_COLLIDERS.push(
  box(-.6, .6, .6, 1.8),        // coffee table
  box(-4.75, -3.65, .95, 2.05), // flower floor cushion
  box(8.9, 9.95, -1.8, .1),     // guitars + amp
  box(-.76, .16, -2.94, -2.11), // pulled-out desk chair
)

// Browser-facing plants are actual textured GLB assets, not procedural leaf meshes.
const BOTANICAL = '/assets/models/botanical/'
function Plant({ position, scale = 1, bush = 'leafy', seed = 1 }) {
  const small = bush === 'vase' || seed % 3 === 0
  const tall = bush === 'tall'
  const file = tall ? 'potted_plant_01-polyhaven.glb' : small ? 'potted_plant_04-polyhaven.glb' : 'potted-plant-02-polyhaven.glb'
  const size = tall ? scale * .76 : small ? scale * 1.05 : scale * .6
  return <GLBAsset url={BOTANICAL + file} position={position} rotation={[0, seed * 1.73 % (Math.PI * 2), 0]} scale={size} axisCorrection={false} castShadow={false}/>
}
function Monstera({ position, scale = 1, seed = 3 }) {
  return <GLBAsset url={BOTANICAL + 'potted_plant_01-polyhaven.glb'} position={position} rotation={[0, seed * .51 % (Math.PI * 2), 0]} scale={scale * .9} axisCorrection={false} castShadow={false}/>
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

// Shared 8-tile atlas for the fixed side-wall photos and the drum-wall poster.
function photoAtlas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512
  const g = c.getContext('2d'), r = rand(5)
  const skies = [['#1d2a6a', '#e89ac0'], ['#2a1e5a', '#7a5ab8'], ['#f4b6a0', '#ffe2c8'], ['#3a5a9a', '#bfe0ff'], ['#4a2a5a', '#ff9ac0'], ['#1a2040', '#5a7ac0'], ['#e8c0d8', '#fff4f8'], ['#2a3a2a', '#9ac08a']]
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 256, [a, b] = skies[i]
    const grad = g.createLinearGradient(0, y, 0, y + 256); grad.addColorStop(0, a); grad.addColorStop(1, b)
    g.fillStyle = grad; g.fillRect(x, y, 256, 256)
    g.fillStyle = 'rgba(255,255,255,.9)'; for (let s = 0; s < 18; s++) g.fillRect(x + r() * 256, y + r() * 140, 2, 2)
    g.fillStyle = '#fff6dc'
    if (i % 3 === 0) { g.beginPath(); g.arc(x + 170, y + 80, 34, 0, 7); g.fill(); g.fillStyle = a; g.beginPath(); g.arc(x + 186, y + 72, 30, 0, 7); g.fill() } // crescent
    else if (i % 3 === 1) { g.beginPath(); g.arc(x + 128, y + 96, 44, 0, 7); g.fill() } // full moon
    g.fillStyle = 'rgba(30,20,50,.85)' // castles / hills / fox silhouettes
    if (i % 2) { for (let t = 0; t < 5; t++) { const tx = x + 60 + t * 30, th = 60 + r() * 70; g.fillRect(tx, y + 256 - th, 18, th); g.beginPath(); g.moveTo(tx - 4, y + 256 - th); g.lineTo(tx + 9, y + 226 - th); g.lineTo(tx + 22, y + 256 - th); g.fill() } }
    else { g.beginPath(); g.moveTo(x, y + 256); g.quadraticCurveTo(x + 90, y + 150, x + 170, y + 200); g.quadraticCurveTo(x + 220, y + 170, x + 256, y + 190); g.lineTo(x + 256, y + 256); g.fill()
      g.beginPath(); g.moveTo(x + 150, y + 200); g.lineTo(x + 158, y + 180); g.lineTo(x + 166, y + 196); g.lineTo(x + 174, y + 180); g.lineTo(x + 182, y + 200); g.fill() }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
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

// The existing photo wall lives under the loft and reads mainly from oblique
// views. These smaller clusters occupy the side-wall gaps visible on entry.
function SideWallGallery() {
  const atlas = useMemo(photoAtlas, [])
  const mats = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const t = atlas.clone(); t.needsUpdate = true; t.repeat.set(.25, .5); t.offset.set((i % 4) * .25, i < 4 ? .5 : 0)
    return new THREE.MeshStandardMaterial({ map: t, roughness: .82, side: THREE.DoubleSide })
  }), [atlas])
  const photos = useMemo(() => {
    const r = rand(241), list = []
    const add = (side, zs, ys) => zs.forEach((z, i) => ys.forEach((y, row) => {
      if (side === 'left' && z > 4.65 && z < 5.95 && y > 2.9 && y < 4.45) return // Claude's neon fox
      if (side === 'left' && z > 1.5 && z < 4.0 && y < 3.9) return // the customizable photo wall's band
      if (r() < .19) return // negative space prevents wallpaper-like repetition
      const w = .24 + r() * .21
      list.push({ side, z: z + (r() - .5) * .17, y: y + (r() - .5) * .18,
        w, h: w * (.82 + r() * .6), tilt: (r() - .5) * .17,
        tile: (i + row * 3 + (side === 'right' ? 2 : 0)) % 8, polaroid: r() > .34 })
    }))
    add('left', [3.75, 4.22, 4.62, 6.05, 6.48, 6.93, 7.38], [2.85, 3.42, 4.02])
    add('left', [-6.65, -6.12, -4.12, -3.58], [3.8, 4.45])
    // Quiet collage inside the otherwise bare drum-side wall panel.
    add('left', [-1.25, -.62, .08, .7], [2.22, 2.86])
    add('right', [-5.6, -5.1, -4.6, -4.1, -3.6], [4.95, 5.52])
    add('right', [2.46, 3.02, 3.6, 4.16], [2.86, 3.49])
    return list
  }, [])
  return <group name="DECOR_SideWallGallery_PASS04">
    {photos.map((p, i) => <group key={i} position={[p.side === 'left' ? -9.54 : 9.54, p.y, p.z]}
      rotation={[0, p.side === 'left' ? Math.PI / 2 : -Math.PI / 2, p.tilt]}>
      <mesh position-z={-.015}><boxGeometry args={[p.w + .052, p.h + .075, .025]}/><meshStandardMaterial color={p.polaroid ? '#f2e6dd' : '#785069'} roughness={.9}/></mesh>
      <mesh material={mats[p.tile]} position-y={p.polaroid ? p.h * .055 : 0} position-z={.004}>
        <planeGeometry args={[p.w * .88, p.h * (p.polaroid ? .72 : .9)]}/>
      </mesh>
      <mesh position={[0, p.h / 2 + .05, .025]}><sphereGeometry args={[.014, 6, 4]}/><meshStandardMaterial color={i % 4 ? '#d8ac75' : '#a987b0'} metalness={.5}/></mesh>
    </group>)}
  </group>
}

function DrumWallPoster() {
  const atlas = useMemo(photoAtlas, [])
  const texture = useMemo(() => {
    const t = atlas.clone(); t.needsUpdate = true; t.repeat.set(.25, .5); t.offset.set(.25, .5)
    return t
  }, [atlas])
  return <group name="DECOR_DrumWallPoster_PASS05" position={[-9.53, 4.1, -5.13]} rotation-y={Math.PI / 2}>
    <mesh position-z={-.035} castShadow><boxGeometry args={[1.02, 1.42, .065]}/><meshStandardMaterial color="#8b634e" roughness={.78}/></mesh>
    <mesh position-z={.002}><planeGeometry args={[.89, 1.27]}/><meshStandardMaterial map={texture} roughness={.93} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0, -.51, .009]}><planeGeometry args={[.82, .18]}/><meshStandardMaterial color="#352b4f" roughness={1} side={THREE.DoubleSide}/></mesh>
    {[-.13, -.065, 0, .065, .13].map((dy, i) => <mesh key={i} position={[0, -.51 + dy, .018]}>
      <boxGeometry args={[.68, .006, .005]}/><meshBasicMaterial color="#d9b47e"/>
    </mesh>)}
  </group>
}

function RearWallPrint() {
  const texture = useTexture('/assets/textures/wall-art/rear-crescent-castle.jpg')
  texture.colorSpace = THREE.SRGBColorSpace
  return <group name="DECOR_RearCrescentPrint" position={[-8.65, 2.72, 7.85]} rotation-y={Math.PI}>
    <mesh castShadow><boxGeometry args={[1.45, 1.8, .09]}/><meshStandardMaterial color="#715341" roughness={.76}/></mesh>
    <mesh position-z={.052}><planeGeometry args={[1.31, 1.66]}/><meshStandardMaterial color="#ecd9c4" roughness={.96}/></mesh>
    <mesh position-z={.059}><planeGeometry args={[1.2, 1.55]}/><meshStandardMaterial map={texture} roughness={.94}/></mesh>
  </group>
}

function WallShelf({ side, z, y, width = 1.45, seed = 1 }) {
  const x = side === 'left' ? -9.58 : 9.58
  const items = useMemo(() => {
    const r = rand(seed)
    return Array.from({ length: 5 }, (_, i) => ({ z: z - width * .33 + i * width * .16,
      h: .16 + r() * .2, color: ['#6f425a', '#bb8d6d', '#574d73', '#937156', '#d8a9a4'][i] }))
  }, [seed, z, width])
  return <group name={`DECOR_WallShelf_${side}_${seed}`}>
    <mesh position={[x, y, z]} castShadow><boxGeometry args={[.32, .055, width]}/><meshStandardMaterial color="#80604e" roughness={.84}/></mesh>
    {[z - width * .36, z + width * .36].map((zz, i) => <mesh key={i} position={[side === 'left' ? -9.75 : 9.75, y - .18, zz]} rotation-z={side === 'left' ? -.28 : .28}>
      <boxGeometry args={[.035, .36, .045]}/><meshStandardMaterial color="#b49876" metalness={.38} roughness={.52}/>
    </mesh>)}
    {items.map((item, i) => <mesh key={i} position={[x, y + .028 + item.h / 2, item.z]} rotation-x={(i - 2) * .025} castShadow>
      <boxGeometry args={[.19, item.h, .075]}/><meshStandardMaterial color={item.color} roughness={.91}/>
    </mesh>)}
    <Plant position={[x, y + .035, z + width * .3]} scale={.52} seed={seed + 13}/>
    <mesh position={[x, y + .16, z - width * .28]}><sphereGeometry args={[.085, 12, 8]}/><meshStandardMaterial color="#f6d9bd" emissive="#e8aa68" emissiveIntensity={.4} roughness={.6}/></mesh>
  </group>
}

function ReadingNookNeon() {
  const curves = useMemo(() => {
    const crescent = new THREE.CatmullRomCurve3([[.12, .39], [-.16, .25], [-.27, -.02], [-.16, -.28], [.13, -.4], [-.04, -.18], [-.07, .08], [.12, .39]].map(([x, y]) => new THREE.Vector3(x, y, 0)))
    const star = new THREE.CatmullRomCurve3(Array.from({ length: 11 }, (_, i) => { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .07 : .16; return new THREE.Vector3(.45 + Math.cos(a) * r, .16 + Math.sin(a) * r, 0) }), true)
    return [new THREE.TubeGeometry(crescent, 50, .024, 6), new THREE.TubeGeometry(star, 30, .019, 6, true)]
  }, [])
  return <group name="DECOR_ReadingNookNeon_PASS04" position={[9.77, 4.34, 5.55]} rotation-y={-Math.PI / 2}>
    {curves.map((g, i) => <mesh key={i} geometry={g}><meshBasicMaterial color={new THREE.Color(i ? '#f5c489' : '#d9a3f0').multiplyScalar(1.6)} toneMapped={false}/></mesh>)}
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
  // No rectangular border: it made the cloth read as a floating framed poster.
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function DeskChair() {
  const tex = useMemo(blanketTexture, [])
  // The throw occupies only one side of the chair back, leaving the upholstery visible.
  const drape = useMemo(() => {
    const g = new THREE.PlaneGeometry(.34, .71, 16, 12), pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), down = (.355 - y) / .71
      pos.setXYZ(i, x * (1 + down * .1), y - .355, Math.sin(x * 28) * .016 * down + down * .015)
    }
    g.computeVertexNormals(); return g
  }, [])
  return <group name="DECOR_DeskChair" position={[-.3, 0, -2.52]} rotation-y={.12}>
    {[0, 1, 2, 3, 4].map(i => <group key={i} rotation-y={i * Math.PI * 2 / 5}>
      <mesh position={[0, .12, .23]}><boxGeometry args={[.055, .055, .46]}/><meshStandardMaterial color="#3a3542" metalness={.5} roughness={.5}/></mesh>
      <mesh position={[0, .075, .44]}><sphereGeometry args={[.055, 10, 8]}/><meshStandardMaterial color="#27242c" roughness={.75}/></mesh>
    </group>)}
    <mesh position-y={.36}><cylinderGeometry args={[.045, .045, .53, 12]}/><meshStandardMaterial color="#4b4350" metalness={.55} roughness={.48}/></mesh>
    <SoftBox args={[.76, .16, .72]} radius={.075} smoothness={4} position-y={.68} castShadow>
      <meshStandardMaterial color="#a27f9f" roughness={.94}/>
    </SoftBox>
    <SoftBox args={[.73, .91, .17]} radius={.075} smoothness={4} position={[0, 1.17, .34]} rotation-x={-.1} castShadow>
      <meshStandardMaterial color="#94748e" roughness={.93}/>
    </SoftBox>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .42, .88, .04]}><boxGeometry args={[.045, .32, .045]}/><meshStandardMaterial color="#55495a" metalness={.3} roughness={.65}/></mesh>
      <SoftBox args={[.11, .065, .43]} radius={.025} smoothness={3} position={[side * .42, 1.055, .04]} castShadow>
        <meshStandardMaterial color="#a889a5" roughness={.92}/>
      </SoftBox>
    </group>)}
    <mesh position={[-.24, 1.59, .39]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.055, .055, .35, 12]}/><meshStandardMaterial map={tex} roughness={.98}/></mesh>
    <mesh geometry={drape} position={[-.24, 1.58, .46]} castShadow><meshStandardMaterial map={tex} roughness={.98} side={THREE.DoubleSide}/></mesh>
    {Array.from({ length: 5 }, (_, i) => <mesh key={`t${i}`} position={[-.39 + i * .075, .80 - (i % 2) * .025, .48]}><cylinderGeometry args={[.004, .004, .07, 4]}/><meshStandardMaterial color="#e8c070"/></mesh>)}
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

// ---------- right wall: CC0 acoustic guitar, amp, a wall shelf ----------
export function Guitar({ strumId = 0, z = -1.35, red = false, active = false, position = [9.5, .8, z] }) {
  const group = useRef()
  const model = useRef()
  const lastStrum = useRef(0)
  useEffect(() => { if (strumId) lastStrum.current = performance.now() }, [strumId])
  useFrame(() => {
    if (!group.current) return
    const age = (performance.now() - lastStrum.current) / 1000
    group.current.rotation.z = active && age < 1.1 ? Math.sin(age * 19) * .025 * Math.exp(-age * 4) : 0
    const strings = model.current?.getObjectByName('acoustic-guitar_strings')
    if (strings) {
      const latest = Math.max(...guitarVisual[red ? 'electric' : 'acoustic'])
      const vibration = Math.exp(-Math.max(0, performance.now() - latest) / 240)
      strings.rotation.z = active ? Math.sin(performance.now() * .085) * .007 * vibration : 0
    }
  })
  return <group ref={group} position={position} rotation-y={-Math.PI / 2}>
    <GLBAsset ref={model} url="/assets/models/acoustic-guitar-cc0.glb" axisCorrection={false} fallbackScale={.35} materialOverrides={red ? { 'acoustic-guitar_body_pbr': { color: new THREE.Color('#aa3d50') } } : undefined}/>
    <mesh position={[0, .98, -.025]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[.045, .012, 8, 16, Math.PI]}/><meshStandardMaterial color="#8a6755" metalness={.45} roughness={.48}/></mesh>
  </group>
}
function AmpSignal() {
  const bulb = useRef()
  useFrame(() => { if (bulb.current) bulb.current.material.emissiveIntensity = .18 + guitarAmpLevel() * 2.2 })
  return <mesh ref={bulb} position={[9.162, .47, -.9]} rotation-y={-Math.PI / 2}><circleGeometry args={[.026, 12]}/><meshStandardMaterial color="#ffc67a" emissive="#ff9c39" emissiveIntensity={.18}/></mesh>
}
function MusicWall({ guitarHit, guitarTone }) {
  return <group>
    <Guitar strumId={guitarHit} active={guitarTone === 'acoustic'}/>
    <Guitar strumId={guitarHit} z={-.15} red active={guitarTone === 'electric'}/>
    <AmpSignal/>
    <group position={[9.4, 0, -.9]}>
      <mesh position-y={.32} castShadow><boxGeometry args={[.45, .64, .55]}/><meshStandardMaterial color="#2a2428" roughness={.7}/></mesh>
      <mesh position={[-.226, .28, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[.46, .4]}/><meshStandardMaterial color="#6a5a50" roughness={1}/></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[-.226, .57, -.15 + i * .1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.015, .015, .02, 8]}/><meshStandardMaterial color="#e8d0a0" metalness={.6}/></mesh>)}
    </group>
    {/* wall shelf above with plants, a fox figurine and crystals */}
    <mesh position={[9.78, 3.5, -.8]}><boxGeometry args={[.36, .05, 1.8]}/><meshStandardMaterial color="#7a5038"/></mesh>
    <Plant position={[9.75, 3.52, -1.5]} scale={.7} seed={31}/>
    <Plant position={[9.75, 3.52, .0]} scale={.65} bush="vase" seed={32}/>
    <group position={[9.72, 3.53, -.75]} rotation-y={-Math.PI / 2} scale={.5}>
      <mesh position-y={.2} scale={[1, 1.1, 1]}><sphereGeometry args={[.18, 14, 10]}/><meshStandardMaterial color="#e0783a"/></mesh>
      <mesh position={[0, .45, .05]}><sphereGeometry args={[.14, 14, 10]}/><meshStandardMaterial color="#e0783a"/></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * .08, .6, .05]}><coneGeometry args={[.05, .12, 6]}/><meshStandardMaterial color="#c0602a"/></mesh>)}
      <mesh position={[0, .2, -.22]} rotation-x={-.6} scale={[.6, 1.6, .6]}><sphereGeometry args={[.1, 10, 8]}/><meshStandardMaterial color="#fff4e8"/></mesh>
    </group>
  </group>
}

export default function ReferenceDecor({ guitarHit, guitarTone }) {
  return <group>
    <PhotoWall/>
    <NeonSign/>
    <SideWallGallery/>
    <DrumWallPoster/>
    <RearWallPrint/>
    <WallShelf side="left" z={6.55} y={2.32} seed={81}/>
    <WallShelf side="left" z={-4.8} y={3.18} seed={82}/>
    <WallShelf side="right" z={2.45} y={3.12} seed={83}/>
    <WallShelf side="right" z={6.25} y={2.75} seed={84}/>
    <ReadingNookNeon/>
    <Pendants/>
    <Candles/>
    <Crystals/>
    <DeskChair/>
    <DeskLamp/>
    {/* desk greenery + flowers */}
    <Plant position={[-3.85, 1.31, -4.65]} scale={.9} seed={41}/>
    <Plant position={[-1.6, 1.31, -4.8]} scale={.75} bush="vase" seed={42}/>
    <Plant position={[1.35, 1.31, -4.8]} scale={.7} seed={43}/>
    <Plant position={[3.3, 1.31, -4.8]} scale={.8} bush="vase" seed={44}/>
    {/* big floor plants framing the window wall, by the bed, by the drums */}
    <Monstera position={[-6.8, 0, -7.0]} scale={1.1} seed={51}/>
    <Monstera position={[6.9, 0, -7.0]} scale={1.05} seed={52}/>
    <GLBAsset url="/assets/models/botanical/potted-plant-02-polyhaven.glb" position={[9.3, 0, 7.2]} scale={1.7} axisCorrection={false}/>
    <Plant position={[-4.6, 0, -6.95]} scale={1.6} bush="tall" seed={54}/>
    <Plant position={[4.4, 0, -6.95]} scale={1.6} bush="tall" seed={55}/>
    <GLBAsset url="/assets/models/botanical/potted-plant-02-polyhaven.glb" position={[-9.4, 0, 6.9]} rotation={[0, 1.2, 0]} scale={1.7} axisCorrection={false}/>
    <pointLight position={[-8.9, 1.35, 6.85]} color="#ffd1a0" intensity={2.4} distance={2.4} decay={2}/>
    <GLBAsset url="/assets/models/botanical/potted-plant-02-polyhaven.glb" position={[-9.2, 0, .55]} rotation={[0, -.7, 0]} scale={1.4} axisCorrection={false}/>
    <CoffeeTable/>
    <FlowerCushion position={[-4.2, 0, 1.5]}/>
    <FloorBits/>
    <Lantern position={[-5.5, 0, -6.4]} light/>
    <Lantern position={[5.4, 0, -6.4]} scale={1.1}/>
    <Lantern position={[9.3, 0, 6.3]} light/>
    <Lantern position={[-2.8, 0, 7.4]} scale={.9}/>
    <Lantern position={[-8.6, 0, 4.9]} scale={.8}/>
    <MusicWall guitarHit={guitarHit} guitarTone={guitarTone}/>
  </group>
}
