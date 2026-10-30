import { useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { band } from '../game/band'
import { chooseShot } from '../game/padMaps'
import { sincePlayed } from '../audio/musicBus'
import { Guitar } from './ReferenceDecor'
import LiveHouse from './LiveHouse'
import { FLAGS } from '../config/flags'

// The little stage in the left corner: the drums and piano already live there, the guitar comes
// over on a stand between them, and each instrument gets a spotlight that flares when it plays.
export const STAGE = {
  drums: { focus: [-7.1, .9, -2.8], light: [-7.1, 0, -2.4] },
  guitar: { focus: [-7.3, .75, .05], light: [-7.3, 0, .05], stand: [-7.3, 0, .05] },
  piano: { focus: [-8.7, 1.0, 2.6], light: [-8.2, 0, 2.6] },
}
// Camera shots for the auto director (position, look-at).
export const SHOTS = {
  wide: { position: [-.6, 2.7, -.4], lookAt: [-7.6, 1.45, -.6] }, // high enough to catch the mirror ball
  drums: { position: [-4.4, 1.85, -1.2], lookAt: [-7.2, .95, -2.9] },
  guitar: { position: [-5.2, 1.35, .75], lookAt: [-7.3, .8, .05] },
  piano: { position: [-6.1, 1.9, 1.5], lookAt: [-8.8, 1.0, 2.7] },
}
const COLORS = { drums: '#ff8fb8', guitar: '#ffc46b', piano: '#9fc4ff' }

function Spotlight({ part }) {
  const cone = useRef(), pool = useRef(), lamp = useRef()
  const [x, , z] = STAGE[part].light
  useFrame(() => {
    const k = .25 + Math.exp(-sincePlayed(part) * 2.2) * .9
    if (cone.current) cone.current.opacity = .06 + k * .1
    if (pool.current) pool.current.opacity = .18 + k * .4
    if (lamp.current) lamp.current.intensity = 1 + k * 5
  })
  return <group position={[x, 0, z]}>
    <mesh position-y={2.1} renderOrder={2}><coneGeometry args={[.95, 4.2, 28, 1, true]}/><meshBasicMaterial ref={cone} color={COLORS[part]} transparent opacity={.1} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}/></mesh>
    <mesh position-y={.012} rotation-x={-Math.PI / 2}><circleGeometry args={[.95, 32]}/><meshBasicMaterial ref={pool} color={COLORS[part]} transparent opacity={.3} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
    <pointLight ref={lamp} position-y={2.4} color={COLORS[part]} intensity={2} distance={4} decay={2}/>
  </group>
}

// A row of little floor lights curving round the front of the stage.
function StageEdge() {
  const points = useMemo(() => Array.from({ length: 15 }, (_, i) => { const a = -1.05 + i * .15; return [-9.3 + Math.cos(a) * 3.6, .03, -.1 + Math.sin(a) * 3.6] }), [])
  return <group>{points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[.035, 8, 6]}/><meshBasicMaterial color={new THREE.Color('#ffd9a0').multiplyScalar(2)} toneMapped={false}/></mesh>)}</group>
}

function GuitarOnStand({ tone, strumId }) {
  const [x, , z] = STAGE.guitar.stand
  return <group position={[x, 0, z]}>
    <group rotation-y={Math.PI}><Guitar position={[0, .1, 0]} red={tone === 'electric'} active strumId={strumId}/></group>
    {/* a simple A-frame stand and a small round riser */}
    {[-1, 1].map(s => <mesh key={s} position={[.12, .22, s * .12]} rotation={[s * .35, 0, -.25]}><cylinderGeometry args={[.012, .012, .5, 6]}/><meshStandardMaterial color="#2a2428" metalness={.6}/></mesh>)}
    <mesh position-y={.03}><cylinderGeometry args={[.62, .66, .06, 32]}/><meshStandardMaterial color="#6a4632" roughness={.7}/></mesh>
  </group>
}

// Auto director: wide when several play (or nobody), close-up on a solo; dolly between wide and
// close, hard cut between two close-ups, slow drift so the frame never sits dead still.
function Director() {
  const { camera } = useThree()
  const shot = useRef({ name: 'wide', since: 0 }), target = useRef(new THREE.Vector3()), look = useRef(new THREE.PerspectiveCamera()) // a camera, so lookAt aims its -z the way the real camera looks
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime, dt = Math.min(delta, .05)
    const ages = { drums: sincePlayed('drums'), guitar: sincePlayed('guitar'), piano: sincePlayed('piano') }
    const next = band.get().phase === 'playing' ? chooseShot(ages, shot.current.name, t - shot.current.since) : 'wide'
    const cut = next !== shot.current.name && next !== 'wide' && shot.current.name !== 'wide'
    if (next !== shot.current.name) shot.current = { name: next, since: t }
    const s = SHOTS[next], drift = next === 'wide' ? .45 : .12
    target.current.set(s.position[0] + Math.sin(t * .23) * drift, s.position[1] + Math.sin(t * .31) * drift * .3, s.position[2] + Math.cos(t * .19) * drift)
    look.current.position.copy(target.current); look.current.lookAt(...s.lookAt)
    const k = cut ? 1 : 1 - Math.exp(-dt * 1.7)
    camera.position.lerp(target.current, k)
    camera.quaternion.slerp(look.current.quaternion, k)
  })
  return null
}

export default function BandStage({ guitarTone, guitarHit }) {
  const phase = useSyncExternalStore(band.subscribe, () => band.get().phase)
  if (phase === 'off' && !(FLAGS.capture && FLAGS.captureMode === 'band')) return null
  return <group name="BandStage">
    {Object.keys(STAGE).map(part => <Spotlight key={part} part={part}/>)}
    <StageEdge/>
    <GuitarOnStand tone={guitarTone} strumId={guitarHit}/>
    <LiveHouse/>
    <Director/>
  </group>
}
