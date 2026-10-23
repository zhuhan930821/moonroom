import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from './spec'
import { worldPhysics, worldState } from './worldState'
import { playerRig } from '../game/PlayerController'
import SouvenirMesh from './SouvenirMesh'
import { DoorModel } from './AnywhereDoor'
import IdSea from './IdSea'
import { Hero, Landmark, Scatter } from './landmarks'
import { startWorldMusic } from './worldAudio'

// Builds a world spec into a walkable scene. The player arrives at the origin facing -Z with
// the door home just behind them; the souvenir waits on a lit pedestal somewhere out there.
export const SPAWN = [0, 0, 5]
export const HOME_DOOR = [0, 0, 8.5]
const RADIUS = 60

// ---------- noise + ground ----------
function makeNoise(seed) {
  const r = rng(seed), perm = Array.from({ length: 512 }, () => r())
  const at = (x, z) => perm[((x * 73856093) ^ (z * 19349663)) & 511]
  const smooth = t => t * t * (3 - 2 * t)
  const value = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = smooth(x - xi), fz = smooth(z - zi)
    const a = at(xi, zi), b = at(xi + 1, zi), c = at(xi, zi + 1), d = at(xi + 1, zi + 1)
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz
  }
  return (x, z, octaves = 4) => { let s = 0, amp = .5, f = 1; for (let i = 0; i < octaves; i++) { s += amp * value(x * f, z * f); f *= 2.03; amp *= .5 } return s }
}

export function groundFor(spec) {
  const noise = makeNoise(spec.seed), k = spec.terrain.kind, rough = spec.terrain.roughness
  const flat = (x, z) => THREE.MathUtils.smoothstep(Math.hypot(x, z), 9, 22) // keep the arrival plaza level
  if (k === 'ocean' || k === 'islands') return (x, z) => k === 'islands' ? Math.max(0, (noise(x * .035, z * .035) - .52) * 18 * (.5 + rough)) * flat(x, z) : 0
  if (k === 'dunes') return (x, z) => (Math.sin(x * .09 + noise(x * .02, z * .02) * 6) * .5 + .5) * (2 + rough * 5) * flat(x, z)
  if (k === 'crystal') return (x, z) => Math.pow(noise(x * .05, z * .05), 2) * (3 + rough * 9) * flat(x, z)
  if (k === 'clouds') return (x, z) => (noise(x * .04, z * .04) - .3) * (2 + rough * 4) * flat(x, z)
  return (x, z) => (noise(x * .03, z * .03) - .35) * (2 + rough * 6) * flat(x, z) // meadow
}

// ---------- sky ----------
const skyShader = {
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `
uniform vec3 top, horizon, light, accent; uniform vec3 sunDir; uniform float stars, aurora, time, celestial, day;
varying vec3 vDir;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir); float y = d.y;
  vec3 c = mix(horizon, top, smoothstep(-.05, .6, y));
  c = mix(c, horizon * .55, smoothstep(0., -.3, y));
  vec3 cell = floor(d * 240.); float s = step(.9965, h(cell)) * smoothstep(.05, .4, y) * stars * (1. - day);
  c += s * (.6 + .4 * sin(time * 2. + h(cell + 3.) * 50.)) * vec3(1., .95, .85);
  if (aurora > 0.) { float a = atan(d.x, -d.z); float band = exp(-pow((y - .32 - .05 * sin(a * 3. + time * .2)) * 9., 2.));
    c += accent * band * aurora * (.5 + .5 * sin(a * 12. + time * .6)) * .8 * (1. - day); }
  float m = dot(d, sunDir);
  if (celestial > .5) {
    c += light * smoothstep(.9985, .9992, m) * 2.2;                 // disc
    c += light * pow(max(m, 0.), 60.) * .35 + light * pow(max(m, 0.), 8.) * .12; // halo
    if (celestial > 1.5 && celestial < 2.5) { vec3 d2 = normalize(sunDir + vec3(.18, .06, 0.)); c += accent * smoothstep(.9993, .9996, dot(d, d2)) * 1.6; }
    if (celestial > 2.5) { vec3 n = normalize(vec3(.3, 1., .15)); float r = length(cross(d - sunDir * m, n));
      c += accent * .5 * smoothstep(.002, 0., abs(dot(d - sunDir, n))) * step(.02, distance(d, sunDir)) * step(distance(d, sunDir), .09); }
  }
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
}

function Sky({ spec, sunDir }) {
  const p = spec.palette
  const material = useMemo(() => new THREE.ShaderMaterial({
    ...skyShader, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(p.skyTop) }, horizon: { value: new THREE.Color(p.skyHorizon) },
      light: { value: new THREE.Color(p.light) }, accent: { value: new THREE.Color(p.accent) }, sunDir: { value: sunDir },
      stars: { value: spec.sky.stars }, aurora: { value: spec.sky.aurora }, time: { value: 0 },
      celestial: { value: { none: 0, moon: 1, sun: 1, 'twin-moons': 2, 'ringed-planet': 3 }[spec.sky.celestial] },
      day: { value: spec.sky.time === 'day' ? 1 : spec.sky.time === 'night' ? 0 : .4 },
    },
  }), [spec, sunDir])
  useFrame(({ clock }) => { material.uniforms.time.value = clock.elapsedTime })
  return <mesh material={material} renderOrder={-1} frustumCulled={false}><sphereGeometry args={[400, 48, 24]}/></mesh>
}

// ---------- terrain ----------
function Terrain({ spec, ground }) {
  const p = spec.palette, kind = spec.terrain.kind
  const geometry = useMemo(() => {
    if (kind === 'ocean') return null
    const g = new THREE.PlaneGeometry(RADIUS * 3, RADIUS * 3, 180, 180); g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position, colors = [], low = new THREE.Color(p.ground), high = new THREE.Color(kind === 'clouds' ? p.light : p.accent).lerp(low, .55), tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = ground(x, z) - (kind === 'islands' ? 1.2 : 0)
      pos.setY(i, y)
      tmp.copy(low).lerp(high, THREE.MathUtils.clamp(y / 8, 0, 1)); colors.push(tmp.r, tmp.g, tmp.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals()
    return g
  }, [spec, ground, kind])
  return <>
    {geometry && <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors flatShading={kind === 'crystal'} roughness={kind === 'clouds' ? 1 : .85}
        emissive={kind === 'clouds' ? p.light : '#000000'} emissiveIntensity={kind === 'clouds' ? .12 : 0}/>
    </mesh>}
    {(kind === 'ocean' || kind === 'islands') && <Water spec={spec}/>}
    {/* the arrival plaza: a soft stone disc so the door always stands on something */}
    <group position-y={kind === 'ocean' || kind === 'islands' ? .05 : ground(0, 0)}>
      <mesh position={[0, .05, 6.5]} receiveShadow><cylinderGeometry args={[3.2, 3.4, .1, 48]}/><meshStandardMaterial color={new THREE.Color(p.ground).lerp(new THREE.Color(p.light), .3)} roughness={.85}/></mesh>
      <mesh position={[0, .11, 6.5]} rotation-x={-Math.PI / 2}><ringGeometry args={[3.0, 3.12, 48]}/><meshBasicMaterial color={new THREE.Color(p.accent)} transparent opacity={.6} toneMapped={false}/></mesh>
    </group>
  </>
}

function Water({ spec }) {
  const p = spec.palette
  const material = useMemo(() => new THREE.ShaderMaterial({
    fog: true, transparent: false,
    uniforms: { ...THREE.UniformsLib.fog, time: { value: 0 }, deep: { value: new THREE.Color(p.ground).multiplyScalar(.5) }, sky: { value: new THREE.Color(p.skyHorizon) }, glint: { value: new THREE.Color(p.light) } },
    vertexShader: `uniform float time; varying vec3 vW; varying float vH;
      #include <fog_pars_vertex>
      void main(){ vec3 p = position; float w = sin(p.x * .18 + time * .9) * .25 + sin(p.z * .23 - time * 1.1) * .2 + sin((p.x + p.z) * .41 + time * 1.7) * .08;
        p.y += w; vH = w; vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 deep, sky, glint; uniform float time; varying vec3 vW; varying float vH;
      #include <fog_pars_fragment>
      void main(){ vec3 v = normalize(cameraPosition - vW); float fres = pow(1. - max(v.y, 0.), 3.);
        vec3 c = mix(deep, sky, fres * .85 + .1);
        float sparkle = pow(max(sin(vW.x * 3.1 + time * 2.) * sin(vW.z * 2.7 - time * 1.6), 0.), 24.);
        c += glint * (sparkle * .6 + smoothstep(.3, .45, vH) * .15);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  }), [spec])
  useFrame(({ clock }) => { material.uniforms.time.value = clock.elapsedTime })
  return <mesh material={material} rotation-x={-Math.PI / 2}><planeGeometry args={[RADIUS * 3, RADIUS * 3, 160, 160]}/></mesh>
}

// ---------- creatures + weather ----------
const DOT = (() => {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
})()
function Creatures({ spec, ground }) {
  const { kind, count, color } = spec.creatures
  const ref = useRef()
  const r = useMemo(() => rng(spec.seed + 11), [spec.seed])
  const agents = useMemo(() => Array.from({ length: kind === 'none' ? 0 : Math.max(1, count) }, () => ({ a: r() * 6.28, d: 6 + r() * 40, h: r(), s: .2 + r() * .6, p: r() * 6.28 })), [kind, count, r])
  const geometry = useMemo(() => {
    if (kind === 'fish') { const g = new THREE.ConeGeometry(.12, .5, 6); g.rotateX(Math.PI / 2); return g }
    if (kind === 'birds') { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .3, -.6, .15, -.1, 0, 0, -.05, 0, 0, .3, .6, .15, -.1, 0, 0, -.05], 3)); g.computeVertexNormals(); return g }
    if (kind === 'jellyfish') return new THREE.SphereGeometry(.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)
    return new THREE.SphereGeometry(.06, 6, 4) // fireflies
  }, [kind])
  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), v = useMemo(() => new THREE.Vector3(), []), s = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    agents.forEach((g, i) => {
      const a = g.a + t * g.s * (kind === 'birds' ? .15 : .08)
      const x = Math.cos(a) * g.d, z = Math.sin(a) * g.d
      const y = kind === 'birds' ? 18 + g.h * 10 : kind === 'jellyfish' ? 3 + g.h * 8 + Math.sin(t * .6 + g.p) * 1.2 : kind === 'fish' ? 1.5 + g.h * 3 + Math.sin(t + g.p) * .3 : ground(x, z) + .5 + g.h * 2.5 + Math.sin(t * 1.3 + g.p) * .4
      v.set(x, y, z); q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -a)
      const k = kind === 'fireflies' ? .6 + .4 * Math.sin(t * 3 + g.p) : kind === 'birds' ? 1 + Math.sin(t * 8 + g.p) * .15 : 1
      s.set(k, kind === 'jellyfish' ? .8 + Math.sin(t * 2 + g.p) * .15 : k, k)
      ref.current.setMatrixAt(i, m.compose(v, q, s))
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  if (!agents.length) return null
  const glowy = kind === 'fireflies' || kind === 'jellyfish'
  return <instancedMesh ref={ref} args={[geometry, null, agents.length]} frustumCulled={false}>
    {glowy ? <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(kind === 'fireflies' ? 3 : 1.4)} transparent opacity={kind === 'jellyfish' ? .55 : 1} toneMapped={false} side={THREE.DoubleSide}/>
      : <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={.6}/>}
  </instancedMesh>
}

function Weather({ spec }) {
  const { kind, intensity } = spec.weather
  const ref = useRef()
  const count = kind === 'none' ? 0 : Math.round(300 + intensity * 1500)
  const { positions, speeds } = useMemo(() => {
    const r = rng(spec.seed + 29), positions = new Float32Array(count * 3), speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) { positions[i * 3] = (r() - .5) * 70; positions[i * 3 + 1] = r() * 30; positions[i * 3 + 2] = (r() - .5) * 70; speeds[i] = .5 + r() }
    return { positions, speeds }
  }, [count, spec.seed])
  const style = { rain: ['#cfe3ff', .06, -14], snow: ['#ffffff', .12, -1.2], petals: ['#ffc2d6', .16, -.9], embers: ['#ffab5c', .1, 1.4], bubbles: ['#bff6ff', .22, 1.1] }[kind] || ['#fff', .1, -1]
  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    const attr = ref.current.geometry.attributes.position, t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) + style[2] * speeds[i] * dt
      if (y < 0) y += 30; if (y > 30) y -= 30
      attr.setY(i, y)
      if (kind === 'petals' || kind === 'snow' || kind === 'bubbles') attr.setX(i, attr.getX(i) + Math.sin(t + i) * dt * .4)
    }
    attr.needsUpdate = true
  })
  if (!count) return null
  return <points ref={ref} frustumCulled={false}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
    <pointsMaterial map={DOT} color={style[0]} size={style[1] * 1.8} transparent alphaTest={.02} opacity={kind === 'bubbles' ? .6 : .9} depthWrite={false} sizeAttenuation/>
  </points>
}

// ---------- the world ----------
function GeneratedWorld({ spec }) {
  const ground = useMemo(() => groundFor(spec), [spec])
  const p = spec.palette, time = spec.sky.time
  const sunDir = useMemo(() => {
    const el = time === 'day' ? .9 : time === 'night' ? .42 : .14, az = (rng(spec.seed + 3)() - .5) * 1.2
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize()
  }, [spec, time])
  // Landmark placement (and colliders) from the seed.
  const placed = useMemo(() => {
    const r = rng(spec.seed + 7), out = []
    spec.landmarks.forEach((l, li) => {
      for (let i = 0; i < l.count; i++) {
        const small = l.kind === 'lantern'
        const a = r() * Math.PI * 2, d = small ? 7 + r() * 25 : 16 + r() * 38
        const x = Math.cos(a) * d, z = Math.sin(a) * d
        if (Math.hypot(x - HOME_DOOR[0], z - HOME_DOOR[2]) < 6) continue
        const scale = l.scale * (.75 + r() * .5)
        out.push({ ...l, key: `${li}-${i}`, x, z, y: ground(x, z), rot: r() * 6.28, scale, seed: spec.seed + li * 100 + i,
          r: l.kind === 'floating-island' ? 0 : { tower: 1.8, arch: .8, monolith: 1, tree: .7, crystal: 1.6, lantern: .2, ruin: 3, shrine: 2 }[l.kind] * scale })
      }
    })
    return out
  }, [spec, ground])
  const souvenirAt = useMemo(() => {
    const r = rng(spec.seed + 41), a = -Math.PI / 2 + (r() - .5) * 1.6, d = 20 + r() * 8
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    return [x, ground(x, z), z]
  }, [spec, ground])
  useWorldPhysics(ground, placed, souvenirAt)
  const lightLevel = { day: 2.4, dusk: 1.4, dawn: 1.4, night: .9 }[time]
  return <>
    <color attach="background" args={[p.skyHorizon]}/>
    <fogExp2 attach="fog" args={[p.fog, time === 'day' ? .0065 : .009]}/>
    <Sky spec={spec} sunDir={sunDir}/>
    <hemisphereLight args={[p.skyHorizon, p.ground, .8 + lightLevel * .3]}/>
    <ambientLight color={p.light} intensity={.35}/>
    <directionalLight position={sunDir.clone().multiplyScalar(60)} color={p.light} intensity={lightLevel} castShadow shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-far={150}/>
    <Terrain spec={spec} ground={ground}/>
    {placed.map(({ key, ...l }) => <group key={key} position={[l.x, l.y, l.z]} rotation-y={l.rot} scale={l.scale}><Landmark {...l} accent={p.accent}/></group>)}
    <Hero {...spec.hero} accent={p.accent}/>
    <Scatter {...spec.scatter} ground={ground} seed={spec.seed}/>
    <Creatures spec={spec} ground={ground}/>
    <Weather spec={spec}/>
    <SouvenirSpot spec={spec} at={souvenirAt}/>
    <group position={[HOME_DOOR[0], ground(HOME_DOOR[0], HOME_DOOR[2]), HOME_DOOR[2]]} rotation-y={Math.PI}><DoorModel glow="#ffcf8a"/></group>
  </>
}

// Pedestal + beam of light so the souvenir can be found from anywhere.
export function SouvenirSpot({ spec, at }) {
  const taken = useTaken()
  const beam = useRef()
  useFrame(({ clock }) => { if (beam.current) beam.current.material.opacity = (taken ? 0 : .12) + Math.sin(clock.elapsedTime * 1.5) * .03 })
  return <group position={at}>
    <mesh position-y={.5} castShadow><cylinderGeometry args={[.45, .6, 1, 16]}/><meshStandardMaterial color={spec.palette.ground} roughness={.8}/></mesh>
    {!taken && <SouvenirMesh shape={spec.souvenir.shape} color={spec.souvenir.color} glow={spec.souvenir.glow} position-y={1.35} scale={1.6}/>}
    <mesh ref={beam} position-y={20}><cylinderGeometry args={[.5, .9, 40, 20, 1, true]}/>
      <meshBasicMaterial color={spec.souvenir.color} transparent opacity={.12} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false}/></mesh>
  </group>
}

function useTaken() { return useSyncExternalStore(worldState.subscribe, () => worldState.get().carried) }

// Register walk bounds/ground/obstacles + the interactable spots; teleport in, and home on exit.
function useWorldPhysics(ground, placed, souvenirAt) {
  useEffect(() => {
    worldPhysics.active = true
    worldPhysics.radius = RADIUS
    worldPhysics.ground = ground
    worldPhysics.blockers = placed.filter(l => l.r > 0).map(l => ({ x: l.x, z: l.z, r: l.r }))
      .concat([{ x: souvenirAt[0], z: souvenirAt[2], r: .6 }, { x: HOME_DOOR[0], z: HOME_DOOR[2], r: .7 }])
    worldPhysics.spots = { souvenir: souvenirAt, door: HOME_DOOR }
    playerRig.teleport?.({ position: [SPAWN[0], 1.68 + ground(SPAWN[0], SPAWN[2]), SPAWN[2]], yaw: 0, pitch: 0 })
    return () => {
      worldPhysics.active = false; worldPhysics.blockers = []; worldPhysics.ground = () => 0; worldPhysics.spots = null
      playerRig.teleport?.({ position: [-4.5, 1.68, 6.4], yaw: Math.PI * 0, pitch: 0 })
    }
  }, [ground, placed, souvenirAt])
}
export { useWorldPhysics }

export default function WorldScene({ world }) {
  const { gl, camera } = useThree()
  useEffect(() => { // worlds are big: see to the horizon while away, restore the room's near far-plane after
    const far = camera.far; camera.far = 2500; camera.updateProjectionMatrix()
    return () => { camera.far = far; camera.updateProjectionMatrix() }
  }, [camera])
  useEffect(() => {
    const prev = [gl.toneMapping, gl.toneMappingExposure]
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = world.kind === 'idsea' ? .78 : 1.05
    return () => { gl.toneMapping = prev[0]; gl.toneMappingExposure = prev[1] }
  }, [gl, world])
  useEffect(() => startWorldMusic(world.music), [world])
  return world.kind === 'idsea' ? <IdSea world={world}/> : <GeneratedWorld spec={world}/>
}
