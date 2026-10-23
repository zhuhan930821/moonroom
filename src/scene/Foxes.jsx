import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { activity, energy, loudness } from '../audio/musicBus'

// 眠眠 sleeps at the foot of the bed: ears twitch to piano, a loud stretch of drumming wakes it
// for a yawn and a new curl, then it dozes off again. 云团 pads over to sit beside the sofa
// whenever music has been playing, nodding on the beat, and wanders home when it goes quiet.
const SLEEPER = { position: [6.0, 0, 6.7], rotation: -1.4 }
const LISTENER = { home: [3.25, 0, 4.45], homeYaw: -1.15, spot: [3.15, 0, 2.35], spotYaw: -2.2 }

function FoxBody({ body, head, ears, eyes, closed }) {
  return <group ref={body}>
    <mesh castShadow position={[0, .32, 0]} scale={[.62, .38, .92]}><sphereGeometry args={[1, 24, 16]}/><meshStandardMaterial color="#c77654" roughness={.95}/></mesh>
    <mesh castShadow position={[0, .45, -.74]} rotation-x={-.45} scale={[.34, .34, .72]}><sphereGeometry args={[1, 20, 14]}/><meshStandardMaterial color="#d79165" roughness={.95}/></mesh>
    <group ref={head} position={[0, .54, .66]}>
      <mesh castShadow scale={[.49, .44, .42]}><sphereGeometry args={[1, 24, 16]}/><meshStandardMaterial color="#d88b60" roughness={.96}/></mesh>
      {[-.28, .28].map((x, i) => <mesh key={x} ref={el => { ears.current[i] = el }} castShadow position={[x, .45, -.08]} rotation-z={x < 0 ? .22 : -.22}><coneGeometry args={[.21, .42, 3]}/><meshStandardMaterial color="#af5e4c" roughness={.9}/></mesh>)}
      <mesh position={[0, -.11, .35]} scale={[.27, .19, .13]}><sphereGeometry args={[1, 16, 10]}/><meshStandardMaterial color="#f1ddc6"/></mesh>
      <mesh position={[0, -.11, .48]} scale={[.07, .055, .045]}><sphereGeometry args={[1, 12, 8]}/><meshStandardMaterial color="#382a32"/></mesh>
      <group ref={eyes}>{[-.21, .21].map(x => <mesh key={x} position={[x, .1, .35]} scale={[.04, .06, .035]}><sphereGeometry args={[1, 10, 8]}/><meshStandardMaterial color="#332432"/></mesh>)}</group>
      {closed && <group ref={closed}>{[-.21, .21].map(x => <mesh key={x} position={[x, .1, .37]} rotation-z={Math.PI / 2} scale={[.012, .05, .01]}><capsuleGeometry args={[1, 1, 4, 6]}/><meshStandardMaterial color="#5a3a36"/></mesh>)}</group>}
    </group>
  </group>
}

function SleepingFox() {
  const root = useRef(), body = useRef(), head = useRef(), ears = useRef([]), eyes = useRef(), closed = useRef()
  const state = useRef({ phase: 'sleep', since: 0, cooldown: 0, yaw: SLEEPER.rotation, curl: 0 })
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, s = state.current
    s.since += dt; s.cooldown = Math.max(0, s.cooldown - dt)
    if (s.phase === 'sleep' && s.cooldown === 0 && loudness() > 5.5) { s.phase = 'wake'; s.since = 0 }
    if (s.phase === 'wake' && s.since > 4.2) { s.phase = 'sleep'; s.since = 0; s.cooldown = 18; s.curl = (s.curl + 1) % 3 }
    const awake = s.phase === 'wake' ? Math.min(1, s.since * 2.5) * Math.min(1, (4.2 - s.since) * 1.5) : 0
    const yawn = s.phase === 'wake' ? Math.max(0, Math.sin(Math.min(1, (s.since - .6) / 1.4) * Math.PI)) : 0
    // New curl after waking: turn a little and settle.
    const targetYaw = SLEEPER.rotation + [0, .55, -.4][s.curl]
    s.yaw += (targetYaw - s.yaw) * (1 - Math.exp(-dt * (s.phase === 'wake' ? 0 : 1.2)))
    if (root.current) root.current.rotation.y = s.yaw
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 1.7) * .022 * (1 - awake)
    if (head.current) { head.current.rotation.x = -awake * .45 - yawn * .25; head.current.position.y = .54 + awake * .12; head.current.scale.y = 1 + yawn * .12 }
    // Ears: a twitch on each piano note even while asleep; perked when awake.
    const twitch = energy('piano', 9) * .5 + energy('hat', 12) * .15
    ears.current.forEach((ear, i) => { if (ear) ear.rotation.x = -twitch * (i ? 1 : .6) - awake * .25 })
    if (eyes.current) eyes.current.visible = awake > .5 && yawn < .5
    if (closed.current) closed.current.visible = !(awake > .5 && yawn < .5)
  })
  return <group ref={root} position={SLEEPER.position} scale={.54}><FoxBody body={body} head={head} ears={ears} eyes={eyes} closed={closed}/></group>
}

function ListeningFox() {
  const root = useRef(), body = useRef(), head = useRef(), ears = useRef([]), eyes = useRef()
  const state = useRef({ pos: new THREE.Vector3(...LISTENER.home), yaw: LISTENER.homeYaw, listening: false, quiet: 0 })
  const target = useRef(new THREE.Vector3())
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, s = state.current
    const playing = activity(6) > .5
    s.quiet = playing ? 0 : s.quiet + dt
    if (playing) s.listening = true
    if (s.quiet > 10) s.listening = false
    target.current.set(...(s.listening ? LISTENER.spot : LISTENER.home))
    const away = target.current.clone().sub(s.pos); away.y = 0
    const walking = away.length() > .05
    if (walking) {
      const step = Math.min(away.length(), dt * .7)
      s.pos.addScaledVector(away.normalize(), step)
      const heading = Math.atan2(away.x, away.z)
      s.yaw += Math.atan2(Math.sin(heading - s.yaw), Math.cos(heading - s.yaw)) * (1 - Math.exp(-dt * 5))
    } else {
      const rest = s.listening ? LISTENER.spotYaw : LISTENER.homeYaw
      s.yaw += Math.atan2(Math.sin(rest - s.yaw), Math.cos(rest - s.yaw)) * (1 - Math.exp(-dt * 2))
    }
    if (root.current) { root.current.position.copy(s.pos); root.current.position.y = walking ? Math.abs(Math.sin(t * 9)) * .05 : 0; root.current.rotation.y = s.yaw }
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 1.7 + 1.8) * .022
    // Nod on the beat while listening.
    const beat = Math.max(energy('kick', 7), energy('snare', 7) * .7, energy('piano', 6) * .6)
    if (head.current) head.current.rotation.x = s.listening && !walking ? beat * .22 - .05 : 0
    ears.current.forEach(ear => { if (ear) ear.rotation.x = -energy('any', 6) * .25 })
    if (eyes.current) eyes.current.visible = Math.sin(t * 1.35 + 1.8) < .99
  })
  return <group ref={root} position={LISTENER.home} scale={.54}><FoxBody body={body} head={head} ears={ears} eyes={eyes}/></group>
}

export default function Foxes() { return <><SleepingFox/><ListeningFox/></> }
