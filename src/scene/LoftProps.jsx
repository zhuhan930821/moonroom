import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox as SoftBox } from '@react-three/drei'
import * as THREE from 'three'
import { LOFT_Y, MAT, REHEARSAL, ROPE, SKYLIGHT, TELESCOPE, climbState } from '../game/loft'

// Props for the loft (src/game/loft.js): the knotted climbing rope, a brass telescope at the
// window end, a stargazing mat under a skylight, and the band's little rehearsal corner.

const HEMP = '#c9a06a', BRASS = '#c9a46a', WOOD = '#8a5a3c'

function Rope({ climbing }) {
  const group = useRef()
  const len = ROPE.top - .2, knots = Math.floor((len - .4) / .42)
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime, pull = climbing ? .5 + climbState.current.progress : .15
    group.current.rotation.z = Math.sin(t * 1.3) * .012 * pull
    group.current.rotation.x = Math.sin(t * .9 + 1) * .008 * pull
  })
  return <group position={[ROPE.x, ROPE.top, ROPE.z]}>
    {/* a small iron hook and plate on the ceiling beam */}
    <mesh position-y={.06}><cylinderGeometry args={[.09, .09, .03, 16]}/><meshStandardMaterial color="#3a3036" metalness={.7} roughness={.4}/></mesh>
    <mesh position-y={-.03} rotation-x={Math.PI / 2}><torusGeometry args={[.05, .012, 8, 18]}/><meshStandardMaterial color="#3a3036" metalness={.7} roughness={.4}/></mesh>
    <group ref={group}>
      <mesh position-y={-len / 2 - .05} castShadow><cylinderGeometry args={[.026, .026, len, 10]}/><meshStandardMaterial color={HEMP} roughness={.95}/></mesh>
      {Array.from({ length: knots }, (_, i) => <mesh key={i} position-y={-.6 - i * .42} scale={[1, .8, 1]} castShadow><sphereGeometry args={[.055, 12, 10]}/><meshStandardMaterial color="#b88d58" roughness={.95}/></mesh>)}
      {/* frayed end and a loose coil on the floor */}
      <mesh position-y={-len - .08}><coneGeometry args={[.045, .14, 8]}/><meshStandardMaterial color="#d8b47e" roughness={1}/></mesh>
    </group>
    <mesh position={[.18, -ROPE.top + .03, .05]} rotation-x={-Math.PI / 2}><torusGeometry args={[.16, .028, 8, 24]}/><meshStandardMaterial color={HEMP} roughness={.95}/></mesh>
  </group>
}

function Telescope() {
  const [x, z] = TELESCOPE.position
  const dir = useMemo(() => new THREE.Vector3(TELESCOPE.aim[0] - x, TELESCOPE.aim[1] - LOFT_Y - 1.3, TELESCOPE.aim[2] - z).normalize(), [x, z])
  const yaw = Math.atan2(dir.x, dir.z), pitch = Math.asin(dir.y)
  return <group position={[x, LOFT_Y, z]}>
    {/* tripod */}
    {[0, 1, 2].map(i => { const a = i * Math.PI * 2 / 3; return <mesh key={i} position={[Math.sin(a) * .2, .58, Math.cos(a) * .2]} rotation={[Math.cos(a) * -.33, 0, Math.sin(a) * .33]} castShadow><cylinderGeometry args={[.016, .02, 1.2, 8]}/><meshStandardMaterial color={WOOD} roughness={.6}/></mesh> })}
    <mesh position-y={1.18}><cylinderGeometry args={[.05, .06, .08, 14]}/><meshStandardMaterial color={BRASS} metalness={.8} roughness={.3}/></mesh>
    {/* brass tube pointing out of the window */}
    <group position-y={1.3} rotation={[0, yaw, 0]}>
      <group rotation-x={-pitch + Math.PI / 2}>
        <mesh position-y={.18} castShadow><cylinderGeometry args={[.065, .05, .95, 20]}/><meshStandardMaterial color={BRASS} metalness={.85} roughness={.25}/></mesh>
        <mesh position-y={.66}><cylinderGeometry args={[.078, .072, .1, 20]}/><meshStandardMaterial color="#2b2430" metalness={.4} roughness={.4}/></mesh>
        <mesh position-y={-.34}><cylinderGeometry args={[.024, .03, .12, 12]}/><meshStandardMaterial color="#2b2430"/></mesh>
        {[-.1, .32].map(y => <mesh key={y} position-y={y} rotation-x={Math.PI / 2}><torusGeometry args={[.064, .008, 6, 20]}/><meshStandardMaterial color="#e2c48a" metalness={.9} roughness={.2}/></mesh>)}
      </group>
    </group>
  </group>
}

// A framed skylight in the ceiling: deep night sky with twinkling stars and the odd falling star.
function Skylight() {
  const [x, z] = SKYLIGHT.position, [w, d] = SKYLIGHT.size
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main(){
        vec2 uv = vUv * vec2(${(w / d).toFixed(3)}, 1.);
        vec3 col = mix(vec3(.05,.05,.18), vec3(.16,.1,.32), vUv.y);
        col += vec3(.35,.22,.5) * smoothstep(.35, 0., abs(vUv.y - .3 - vUv.x * .4)) * .35; // a faint milky band
        for (int l = 0; l < 3; l++) {
          float s = 26. + float(l) * 22.;
          vec2 g = floor(uv * s), f = fract(uv * s) - .5;
          float h = hash(g + float(l) * 7.);
          if (h > .9) {
            float tw = .55 + .45 * sin(uTime * (1.5 + h * 3.) + h * 40.);
            col += vec3(1., .95, .85) * smoothstep(.12, 0., length(f)) * tw * (1. - float(l) * .25);
          }
        }
        float cycle = mod(uTime, 7.), k = cycle / 1.2;          // a falling star every 7 s
        if (k < 1.) {
          vec2 a = vec2(.15 + mod(floor(uTime / 7.) * .37, .5), .9), b = a + vec2(.55, -.5);
          vec2 p = mix(a, b, k), dir = normalize(b - a);
          vec2 rel = vUv - p; float along = dot(rel, -dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
          col += vec3(1., .92, .8) * smoothstep(.004, 0., across) * smoothstep(.18, 0., along) * step(0., along) * (1. - k);
        }
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  }), [w, d])
  useFrame(({ clock }) => { material.uniforms.uTime.value = clock.elapsedTime })
  return <group position={[x, 7.95, z]}>
    <mesh rotation-x={Math.PI / 2} material={material}><planeGeometry args={[w, d]}/></mesh>
    {[[0, d / 2 + .05, w + .2, .1], [0, -d / 2 - .05, w + .2, .1], [w / 2 + .05, 0, .1, d], [-w / 2 - .05, 0, .1, d]].map(([px, pz, sx, sz], i) =>
      <mesh key={i} position={[px, -.04, pz]}><boxGeometry args={[sx, .12, sz]}/><meshStandardMaterial color="#5a3a2a" roughness={.7}/></mesh>)}
    <mesh position-y={-.02}><boxGeometry args={[.05, .05, d]}/><meshStandardMaterial color="#5a3a2a"/></mesh>
    <pointLight position-y={-.6} color="#8fa8ff" intensity={2.2} distance={4.5} decay={2}/>
  </group>
}

function Mat() {
  const [x, z] = MAT.position
  return <group position={[x, LOFT_Y, z]}>
    <SoftBox args={[1.25, .1, 2.05]} radius={.045} smoothness={4} position-y={.05} receiveShadow><meshStandardMaterial color="#5b4a7a" roughness={1}/></SoftBox>
    <SoftBox args={[1.15, .03, 1.95]} radius={.012} position-y={.105}><meshStandardMaterial color="#e9dcf0" roughness={1}/></SoftBox>
    {[[-.28, .9], [.3, .92]].map(([px, pz], i) => <SoftBox key={i} args={[.5, .16, .34]} radius={.07} smoothness={4} position={[px, .2, pz]} rotation-y={(i - .5) * .25} castShadow><meshStandardMaterial color={['#f3c9d6', '#c8b4e2'][i]} roughness={1}/></SoftBox>)}
    {/* a folded star blanket at the foot */}
    <SoftBox args={[1.05, .07, .42]} radius={.03} position={[0, .15, -.72]}><meshStandardMaterial color="#3a3a7a" roughness={1}/></SoftBox>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-.4 + i * .16, .19, -.72 + (i % 2) * .1]} rotation-x={-Math.PI / 2}><circleGeometry args={[.018, 5]}/><meshBasicMaterial color="#e8c070"/></mesh>)}
  </group>
}

// The band corner: a mic on a stand, a small amp, floor cushions and a cork board of notes.
function Rehearsal() {
  const [x, z] = REHEARSAL.position
  const notes = ['#fff3c4', '#ffd6e0', '#d9ecff', '#e6ffd9', '#fff3c4']
  return <group position={[0, LOFT_Y, 0]}>
    <group position={[x + .95, 0, z]}>
      <mesh position-y={.012}><cylinderGeometry args={[.16, .18, .025, 18]}/><meshStandardMaterial color="#2b2430" metalness={.6}/></mesh>
      <mesh position-y={.75}><cylinderGeometry args={[.012, .012, 1.5, 8]}/><meshStandardMaterial color="#2b2430" metalness={.7} roughness={.3}/></mesh>
      <mesh position={[0, 1.5, .04]} rotation-x={.5}><capsuleGeometry args={[.035, .08, 6, 12]}/><meshStandardMaterial color="#b8b4c0" metalness={.8} roughness={.3}/></mesh>
    </group>
    <group position={[-9.25, 0, 6.95]} rotation-y={Math.PI / 2 - .3}>
      <SoftBox args={[.6, .5, .32]} radius={.03} position-y={.25} castShadow><meshStandardMaterial color="#2a2428" roughness={.7}/></SoftBox>
      <mesh position={[0, .24, .165]}><planeGeometry args={[.5, .34]}/><meshStandardMaterial color="#6a5a50" roughness={1}/></mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[-.14 + i * .14, .44, .165]} rotation-x={Math.PI / 2}><cylinderGeometry args={[.016, .016, .02, 10]}/><meshStandardMaterial color="#e8d0a0" metalness={.6}/></mesh>)}
    </group>
    {[[-8.6, 5.5, '#f2a8c4'], [-8.9, 6.4, '#c8b4e2'], [-7.9, 6.9, '#f3c9a4']].map(([cx, cz, color], i) =>
      <mesh key={i} position={[cx, .1, cz]} scale={[1, .4, 1]} castShadow><sphereGeometry args={[.32, 18, 12]}/><meshStandardMaterial color={color} roughness={1}/></mesh>)}
    {/* cork board on the wall with the setlist and notes */}
    <group position={[-9.86, 1.55, 6.15]} rotation-y={Math.PI / 2}>
      <mesh><boxGeometry args={[1.3, .85, .03]}/><meshStandardMaterial color="#b98d5e" roughness={1}/></mesh>
      <mesh position-z={.016}><planeGeometry args={[1.2, .75]}/><meshStandardMaterial color="#c9a074" roughness={1}/></mesh>
      {notes.map((c, i) => <mesh key={i} position={[-.42 + (i % 3) * .42, .17 - Math.floor(i / 3) * .34, .02]} rotation-z={(i % 2 ? 1 : -1) * .06}><planeGeometry args={[.3, .26]}/><meshStandardMaterial color={c} roughness={1}/></mesh>)}
      {notes.map((_, i) => <mesh key={`p${i}`} position={[-.42 + (i % 3) * .42, .27 - Math.floor(i / 3) * .34, .03]}><sphereGeometry args={[.014, 8, 6]}/><meshStandardMaterial color={['#e05a6a', '#5a8ae0', '#e0b04a'][i % 3]}/></mesh>)}
    </group>
  </group>
}

export default function LoftProps({ mode }) {
  return <group name="LoftProps">
    <Rope climbing={mode === 'climb'}/>
    <Telescope/>
    <Skylight/>
    <Mat/>
    <Rehearsal/>
  </group>
}
