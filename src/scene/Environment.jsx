import { useFrame, useLoader } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ROOM, WINDOW_ARCHES } from '../config/scene'
import SheerCurtainSample from './SheerCurtainSample'
import GLBAsset from './AssetModel'
import { RoundedBox, StarField } from './Primitives'
import { FLAGS } from '../config/flags'
import { energy, pianoColor } from '../audio/musicBus'
import { roomState } from '../game/roomState'

const ARCHITECTURE_URLS = {
  phase1: '/assets/models/architecture/moonroom-architecture-phase1.glb',
  oakTest: '/assets/models/architecture/moonroom-architecture-floor-material-test.glb',
  polyhaven: '/assets/models/architecture/moonroom-architecture-polyhaven-wood-floor-test.glb',
}
const gold = '#b98669'
const cloudColors = ['#f0a3c8', '#d98abc', '#ad83cb', '#fac1bd']
// Open the entire window-facing wall to the sky while retaining the three
// architectural arches, their jambs, sills, curtains, and the room shell.
const TRANSPARENT_WINDOW_WALL = [
  'ARCH_Back_Pier_0', 'ARCH_Back_Pier_1', 'ARCH_Back_Pier_2', 'ARCH_Back_Pier_End',
  'ARCH_Window_Spanderel_0', 'ARCH_Window_Spanderel_1', 'ARCH_Window_Spanderel_2',
]

function Arch({ x, width }) {
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => {
    const a = Math.PI - i / 24 * Math.PI
    return new THREE.Vector3(x + Math.cos(a) * width / 2, 4.05 + Math.sin(a) * 3.45, -7.64)
  }))
  return <group>
    <mesh><tubeGeometry args={[curve, 40, .13, 8, false]} /><meshStandardMaterial color={gold} metalness={.45} roughness={.4} /></mesh>
    {[-1, 1].map(side => <RoundedBox key={side} args={[.22, 4.25, .3]} color={gold} position={[x + side * width / 2, 2.12, -7.59]} />)}
    <RoundedBox args={[width + .4, .25, .45]} color="#9a6b72" position={[x, .2, -7.45]} />
  </group>
}

function Windows() {
  return <group>
    {WINDOW_ARCHES.map(({ x, width }) => <Arch key={x} x={x} width={width} />)}
    {[-7.7, -2.55, 2.55, 7.7].map(x => <RoundedBox key={x} args={[.36, 7.8, .46]} color="#6b4b62" position={[x, 3.9, -7.5]} />)}
  </group>
}

function MoonRiver({ hit }) {
  const river = useRef(), pulse = useRef(0), lastId = useRef(0)
  const curves = useMemo(() => [
    new THREE.CatmullRomCurve3([new THREE.Vector3(6.9,3.5,-27),new THREE.Vector3(5,2.3,-23),new THREE.Vector3(7,1.25,-19),new THREE.Vector3(3.5,.65,-15),new THREE.Vector3(1.1,.25,-11)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(7.2,3.45,-27),new THREE.Vector3(5.3,2.25,-23),new THREE.Vector3(7.3,1.2,-19),new THREE.Vector3(3.8,.62,-15),new THREE.Vector3(1.3,.23,-11)]),
  ], [])
  const tint = useMemo(() => new THREE.Color(), [])
  const base = useMemo(() => [new THREE.Color('#69dfe8'), new THREE.Color('#ff9ed6')], [])
  useFrame(() => {
    // Kick and toms surge the river; piano notes wash it in the note's colour.
    pulse.current = Math.max(energy('kick', 2.4), energy('snare', 3) * .8, energy('tom', 2.4) * .9, energy('piano', 2) * .55)
    const piano = energy('piano', 1.2)
    if (river.current) river.current.children.forEach((child, i) => {
      child.material.opacity = (i ? .24 : .34) + pulse.current * .22
      child.material.emissiveIntensity = 1.1 + pulse.current * 2
      child.material.emissive.copy(tint.copy(base[i]).lerp(pianoColor, piano * .7))
    })
  })
  return <group ref={river}>
    <mesh><tubeGeometry args={[curves[0], 80, .22, 12, false]} /><meshStandardMaterial color="#bbfff3" emissive="#69dfe8" emissiveIntensity={1.1} transparent opacity={.34} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh><tubeGeometry args={[curves[1], 80, .065, 8, false]} /><meshStandardMaterial color="#ffe4d1" emissive="#ff9ed6" emissiveIntensity={1.1} transparent opacity={.24} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  </group>
}

// The painted backdrop used to be a finite plane, so oblique views from the room's edges
// (or looking up through an arch) ran past its border into empty background. It now sits on
// an inward-facing cylinder arc with every edge faded into a gradient dome sampled from the
// painting's own border colours, so no view direction can find an edge.
const SKY_RADIUS = 36
const SKY_IMAGE_ARC = 1.5            // radians covered by the painting (~ the old plane's apparent width)
const SKY_TOTAL_ARC = 2 * Math.PI    // full ring: the dome colour continues all the way round
const SKY_IMAGE_HEIGHT = SKY_RADIUS * SKY_IMAGE_ARC / (1672 / 941)
const SKY_CENTER_ANGLE = Math.PI - .13 // aims the painting's centre at the old plane centre ([5, y, -38])
const SKY_HEIGHT = 90

const skyVertex = `
varying vec2 vUv;
varying vec3 vDir;
void main() {
  vUv = uv;
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const skyFragment = `
uniform sampler2D map;
uniform vec3 zenith, upper, horizon, below;
uniform float imageArc, totalArc, imageV0, imageV1, dawn, day, castleRise, castleGlow, time;
uniform vec3 dawnZenith, dawnUpper, dawnHorizon, dayZenith, dayUpper, dayHorizon;
varying vec2 vUv;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  float h = normalize(vDir).y;
  vec3 hz = mix(mix(horizon, dawnHorizon, dawn), dayHorizon, day), up = mix(mix(upper, dawnUpper, dawn), dayUpper, day), zn = mix(mix(zenith, dawnZenith, dawn), dayZenith, day);
  vec3 dome = h > 0.0
    ? mix(mix(hz, up, smoothstep(0.0, 0.32, h)), zn, smoothstep(0.32, 0.9, h))
    : mix(hz, below, smoothstep(0.0, -0.35, h));
  vec3 cell = floor(normalize(vDir) * 260.0);
  float star = step(0.9965, hash(cell)) * smoothstep(0.12, 0.45, h);
  dome += star * vec3(1.0, 0.94, 0.82) * (0.5 + 0.5 * hash(cell + 7.0)) * (1.0 - dawn);
  // Cylinder u runs against screen-right when seen from inside, so flip it.
  float u = 0.5 - (vUv.x - 0.5) * totalArc / imageArc;
  float v = (vUv.y - imageV0) / (imageV1 - imageV0);
  float fadeU = smoothstep(0.0, 0.14, u) * smoothstep(1.0, 0.86, u);
  float fadeV = smoothstep(0.0, 0.10, v) * smoothstep(1.0, 0.82, v);
  vec3 painting = texture2D(map, clamp(vec2(u, v), 0.0, 1.0)).rgb;
  // Sunrise grades the painted night: warmer, lifted shadows, a low peach glow near the horizon.
  vec3 sunrise = painting * vec3(1.18, 1.0, .82) + vec3(.10, .05, .02) + vec3(.22, .10, .03) * smoothstep(.55, .1, v);
  painting = mix(painting, sunrise, dawn);
  // Daylight: lift and cool the grade back to neutral, and calm the night's saturation.
  vec3 daylit = painting * vec3(1.05, 1.1, 1.12) + vec3(.13, .15, .18);
  daylit = mix(daylit, vec3(dot(daylit, vec3(.3, .55, .15))), .22);
  painting = mix(painting, daylit, day);
  // Castle lights (painting coords: castle spans u .62–.90, v .68–.96; tallest spire at .725, .94).
  if (castleGlow > 0.0) {
    float inCastle = smoothstep(.60, .63, u) * smoothstep(.92, .89, u) * smoothstep(.66, .70, v) * smoothstep(.985, .96, v);
    float front = .965 - castleRise * .31;               // lights come on from the top down
    float lit = smoothstep(front, front + .025, v);
    float lum = dot(painting, vec3(.3, .55, .15));
    float windows = smoothstep(.32, .72, lum);
    float twinkle = .7 + .3 * sin(time * 7.0 + u * 97.0 + v * 61.0);
    // Warm window light plus a gold wash over the lit part of the castle.
    painting = mix(painting, painting * vec3(1.25, 1.0, .7), castleGlow * inCastle * lit * .6);
    painting += castleGlow * inCastle * lit * (windows * vec3(1.0, .74, .36) * 2.6 * twinkle + vec3(.16, .10, .03));
    float spire = distance(vec2(u * 1.777, v), vec2(.725 * 1.777, .94));
    painting += castleGlow * smoothstep(.07, .0, spire) * vec3(1.0, .86, .56) * (1.2 + (1.0 - castleRise) * 2.0);
  }
  gl_FragColor = vec4(mix(dome, painting, fadeU * fadeV), 1.0);
  #include <colorspace_fragment>
}`

function SkyBackdrop({ sky }) {
  const material = useMemo(() => {
    const centre = 2, half = SKY_HEIGHT / 2
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: sky },
        zenith: { value: new THREE.Color('#0a1846') }, upper: { value: new THREE.Color('#143276') },
        horizon: { value: new THREE.Color('#8a5f99') }, below: { value: new THREE.Color('#5a3d70') },
        imageArc: { value: SKY_IMAGE_ARC }, totalArc: { value: SKY_TOTAL_ARC }, dawn: { value: 0 }, day: { value: 0 }, castleRise: { value: 0 }, castleGlow: { value: 0 }, time: { value: 0 },
        dawnZenith: { value: new THREE.Color('#5d7fd0') }, dawnUpper: { value: new THREE.Color('#e9a3b8') }, dawnHorizon: { value: new THREE.Color('#ffc58c') },
        dayZenith: { value: new THREE.Color('#6fa8ec') }, dayUpper: { value: new THREE.Color('#a9d1f5') }, dayHorizon: { value: new THREE.Color('#f6e9d6') },
        imageV0: { value: (centre - SKY_IMAGE_HEIGHT / 2 + half) / SKY_HEIGHT },
        imageV1: { value: (centre + SKY_IMAGE_HEIGHT / 2 + half) / SKY_HEIGHT },
      },
      vertexShader: skyVertex, fragmentShader: skyFragment,
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    })
  }, [sky])
  // Caps only show the dome gradient: push the painting band out of their UV range.
  const capMaterial = useMemo(() => {
    const cap = material.clone()
    cap.uniforms.imageV0 = { value: 2 }; cap.uniforms.imageV1 = { value: 3 }
    return cap
  }, [material])
  useFrame(({ clock }) => {
    const state = roomState.get()
    material.uniforms.dawn.value = capMaterial.uniforms.dawn.value = state.dawn
    material.uniforms.day.value = capMaterial.uniforms.day.value = state.day
    // Celebration: spire flares, lights travel down over 3.5 s, hold, fade out by 16 s.
    const age = performance.now() / 1000 - state.celebrateAt
    material.uniforms.castleRise.value = Math.min(1, Math.max(0, age / 3.5))
    material.uniforms.castleGlow.value = age < 0 || age > 16 ? 0 : Math.min(1, age * 3) * Math.min(1, (16 - age) / 2.5)
    material.uniforms.time.value = clock.elapsedTime
  })
  return <group>
    <mesh material={material} renderOrder={-1}>
      <cylinderGeometry args={[SKY_RADIUS, SKY_RADIUS, SKY_HEIGHT, 96, 1, true, SKY_CENTER_ANGLE - SKY_TOTAL_ARC / 2, SKY_TOTAL_ARC]} />
    </mesh>
    {[1, -1].map(side => <mesh key={side} material={capMaterial} position-y={side * SKY_HEIGHT / 2} rotation-x={-side * Math.PI / 2} renderOrder={-1}>
      <circleGeometry args={[SKY_RADIUS, 96]} />
    </mesh>)}
  </group>
}

function Outside({ hit, quality, visualBaseline, cinematic }) {
  const clouds=useRef()
  const sky=useLoader(THREE.TextureLoader,'/assets/textures/moon-river-sky.png')
  sky.colorSpace=THREE.SRGBColorSpace
  useFrame(({clock})=>{if(clouds.current)clouds.current.position.x=Math.sin(clock.elapsedTime*.075)*.35})
  return <group>
    {visualBaseline
      ? <mesh position={[0,7,-38]}><planeGeometry args={[86,48.4]} /><meshBasicMaterial map={sky} fog={false} toneMapped={false}/></mesh>
      : <SkyBackdrop sky={sky}/>}
    <StarField hit={hit} />
    <group ref={clouds}>{Array.from({ length: quality==='low'?8:14 }, (_, i) => {
      const x = -18 + (i * 7.73) % 36
      const y = .6 + (i % 5) * .35
      const z = -12 - (i % 4) * 2.3
      return <mesh key={i} position={[x, y, z]} scale={[1.8 + i % 4, .38 + i % 3 * .1, 1.25]}><sphereGeometry args={[1, 24, 12]} /><meshBasicMaterial color={cloudColors[i % cloudColors.length]} transparent opacity={.38} depthWrite={false} /></mesh>
    })}</group>
    <MoonRiver hit={hit} />
    {!cinematic && <pointLight position={[7,3.7,-24]} color="#75f4ff" intensity={hit?.id ? 14 : 6} distance={11} />}
  </group>
}

export default function Environment({ hit, quality, cinematic = false }) {
  const blenderArchitecture = !FLAGS.legacyArchitecture
  const architectureUrl = ARCHITECTURE_URLS[FLAGS.floor]
  const visualBaseline = FLAGS.visualBaseline
  return <>
    <color attach="background" args={['#182657']} /><fog attach="fog" args={['#b47caf', 24, 58]} />
    {!cinematic && <><ambientLight intensity={visualBaseline?1.15:.55} color={visualBaseline?'#d5b5d9':'#d0c2df'} />
    <hemisphereLight args={visualBaseline?['#d7c1ed', '#ad6180', 1.2]:['#b7c9ed', '#77506b', .78]} />
    <directionalLight position={[-4, 8, 4]} color="#ffd2a2" intensity={visualBaseline?2:1.35} castShadow shadow-mapSize={[2048, 2048]} />
    <pointLight position={[0, 5, -5]} color="#f5a8bc" intensity={visualBaseline?22:6} distance={15} />
    {!visualBaseline && <><pointLight position={[-2.7,2.5,-4.2]} color="#ffbd80" intensity={13} distance={5.8} decay={2}/><pointLight position={[6.7,2.5,2.8]} color="#ffc28a" intensity={9} distance={6.5} decay={2}/></>}</>}
    <Outside hit={hit} quality={quality} visualBaseline={visualBaseline} cinematic={cinematic} />
    {blenderArchitecture ? <GLBAsset url={architectureUrl} axisCorrection castShadow={false} hiddenNodes={['ARCH_Lounge_Floor_Inlay', ...TRANSPARENT_WINDOW_WALL]} /> : <>
      <mesh receiveShadow rotation-x={-Math.PI / 2}><planeGeometry args={[ROOM.width, ROOM.depth]} /><meshStandardMaterial color="#70516f" roughness={.92} /></mesh>
      <mesh receiveShadow position={[0, ROOM.height, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[ROOM.width, ROOM.depth]} /><meshStandardMaterial color="#433150" /></mesh>
      <mesh receiveShadow position={[-ROOM.width / 2, ROOM.height / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[ROOM.depth, ROOM.height]} /><meshStandardMaterial color="#765172" /></mesh>
      <mesh receiveShadow position={[ROOM.width / 2, ROOM.height / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[ROOM.depth, ROOM.height]} /><meshStandardMaterial color="#765172" /></mesh>
      <mesh receiveShadow position={[0, ROOM.height / 2, ROOM.depth / 2]} rotation-y={Math.PI}><planeGeometry args={[ROOM.width, ROOM.height]} /><meshStandardMaterial color="#6b4b71" /></mesh>
      <Windows />
    </>}
    {FLAGS.voile && <SheerCurtainSample />}
    {FLAGS.decorSample && <>
      <GLBAsset url="/assets/models/decor/moonroom-decor-phase01-ceiling-sample.glb" axisCorrection castShadow={false} fallbackScale={.1} />
      {!cinematic && <pointLight position={[2.9,6.55,-3.05]} color="#ffe0b5" intensity={3.5} distance={3.2} decay={2} />}
    </>}
    {!cinematic && [-9.5, 9.5].map(x => <pointLight key={x} position={[x, 3.3, -4]} color="#ffbc79" intensity={5} distance={4} />)}
  </>
}
