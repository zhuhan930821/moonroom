import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FLAGS } from '../config/flags'
import { playChime } from '../audio/drums'
import { projectKey, takeStore } from '../audio/takes'

// Moving the curtains brushes a wind chime tuned to the major pentatonic of your latest
// piano take's key (C when there is none).
function ringChime() {
  const root = projectKey(takeStore.getAll()) ?? 0
  const scale = [0, 2, 4, 7, 9].map(step => 84 + ((root + step) % 12))
  const notes = Array.from({ length: 5 + Math.floor(Math.random() * 3) }, () => scale[Math.floor(Math.random() * scale.length)])
  playChime(notes)
}

// One track serves the entire transparent front wall, not three arch-sized curtains.
const WALL_SPAN = 19.6
const PANEL_WIDTH = WALL_SPAN / 2
const RAIL_Y = 7.78
const WALL_Z = -7.16

const VERTEX = `
  uniform float uTime;
  uniform float uPhase;
  uniform float uGather;
  varying vec2 vUv;
  varying float vFold;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x *= mix(1.0, 0.16, uGather);
    float freeEnd = pow(1.0 - uv.y, 1.65);
    float slow = sin(uTime * 0.41 + uPhase + uv.y * 2.7 + uv.x * 1.5);
    float slower = sin(uTime * 0.27 + uPhase * 1.8 + uv.y * 5.1);
    p.x += freeEnd * (0.045 * slow + 0.020 * slower);
    p.z += freeEnd * (0.065 * slow + 0.024 * slower) + 0.035 * sin(uTime * 0.34 + uPhase + uv.x * 4.0) * uv.x;
    vFold = sin(uv.x * 84.0 + uPhase * 0.35 + uv.y * 0.9);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const FRAGMENT = `
  varying vec2 vUv;
  varying float vFold;
  void main() {
    vec3 cream = vec3(0.98, 0.952, 0.907);
    vec3 lavender = vec3(0.867, 0.827, 0.943);
    vec3 color = mix(lavender, cream, smoothstep(0.0, 1.0, vUv.y));
    float foldLight = 0.88 + 0.12 * vFold;
    color *= foldLight;
    float hem = smoothstep(0.0, 0.045, vUv.x) * smoothstep(0.0, 0.045, 1.0 - vUv.x);
    float alpha = (0.34 + 0.12 * (1.0 - vFold) + 0.06 * (1.0 - vUv.y)) * hem;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function makePanel(width, height, phase, side) {
  const columns = 96, rows = 36
  const positions = [], uvs = [], indices = []
  for (let row = 0; row <= rows; row++) {
    const v = row / rows
    for (let column = 0; column <= columns; column++) {
      const u = column / columns
      const x = side * width * u + 0.018 * Math.sin(u * 46 + v * 3 + phase) * (1 - v)
      const y = 0.28 + height * v + 0.025 * Math.sin(u * 11 + phase) * (1 - v)
      const pleat = 0.075 * Math.sin(u * 84 + phase * 0.35) * (0.7 + 0.3 * v)
      const billow = 0.085 * Math.sin(u * 6.2 + v * 2.6 + phase) * (1 - v) ** 1.3
      positions.push(x, y, pleat + billow)
      uvs.push(u, v)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column
        indices.push(a, a + 1, a + columns + 2, a, a + columns + 2, a + columns + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function VoilePanel({ x, side, phase, gather }) {
  const geometry = useMemo(() => makePanel(PANEL_WIDTH, 7.38, phase, side), [phase, side])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uGather: { value: gather.current } },
    side: THREE.DoubleSide, transparent: true, depthWrite: false, depthTest: true,
  }), [phase, side])
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uGather.value = gather.current
  })
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <mesh name={`WholeWallVoile_${side < 0 ? 'Right' : 'Left'}`} geometry={geometry} material={material} position={[x, 0, WALL_Z]} renderOrder={3} frustumCulled={false} />
}

export default function SheerCurtainSample() {
  // QA can render the closed state without relying on a timing-sensitive keypress.
  const initiallyClosed = FLAGS.curtainClosed
  const gather = useRef(initiallyClosed ? 0 : 0.86)
  const target = useRef(initiallyClosed ? 0 : 0.86)
  useEffect(() => {
    const onKey = event => {
      if (event.code !== 'KeyC' || event.repeat || document.querySelector('main')?.dataset.mode !== 'explore') return
      target.current = target.current > 0.5 ? 0 : 0.86
      ringChime()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useFrame((_, delta) => {
    gather.current = THREE.MathUtils.damp(gather.current, target.current, 2.2, delta)
  })
  return <group name="Whole_Wall_Sheer_Voile">
    <mesh name="Continuous_Curtain_Rail" position={[0, RAIL_Y, WALL_Z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, WALL_SPAN + 0.25, 12]} /><meshStandardMaterial color="#c8ac91" metalness={0.6} roughness={0.35} /></mesh>
    {[-1, 1].map(side => <mesh key={side} name={`Curtain_Rail_End_${side}`} position={[side * (WALL_SPAN / 2 + .13), RAIL_Y, WALL_Z]}><sphereGeometry args={[.085, 12, 8]} /><meshStandardMaterial color="#d4bdad" metalness={.48} roughness={.42} /></mesh>)}
    <VoilePanel x={-PANEL_WIDTH} side={1} phase={0.3} gather={gather} />
    <VoilePanel x={PANEL_WIDTH} side={-1} phase={2.1} gather={gather} />
  </group>
}
