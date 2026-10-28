import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { activity, energy, loudness } from '../audio/musicBus'
import { INTERACTIONS } from '../config/scene'

// 眠眠 sleeps at the foot of the bed: ears twitch to piano, a loud stretch of drumming wakes it
// for a yawn and a new curl, then it dozes off again. 云团 pads over to sit beside the sofa
// whenever music has been playing, nodding on the beat, and wanders home when it goes quiet.
const FOX_SCALE = 1.15 // model is ~0.75 m tall; room furniture runs ~1.7x real scale
// The sleeper keeps its curled model; waking is shown by lifting the head and opening its eyes.
const awakeUrl = () => '/assets/models/collectibles/fox-sleep.glb'
const SLEEPER = { position: [6.0, 0, 6.7], rotation: -1.4 }
const LISTENER = { home: [3.25, 0, 4.45], homeYaw: -1.15, spot: [3.15, 0, 2.35], spotYaw: -2.2 }

// Cute Blender fox (scripts/build_cute_fox.py). Both poses share node names, so the same
// refs drive breathing (Fox_Body), the head (Fox_Head), ears, eyes and tail.
function FoxModel({ url, body, head, ears, eyes, closed, tail }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true } })
    return copy
  }, [scene])
  useLayoutEffect(() => {
    const get = name => clone.getObjectByName(name)
    body.current = get('Fox_Body'); head.current = get('Fox_Head')
    ears.current = [get('Ear_L'), get('Ear_R')]
    eyes.current = get('Eyes_Open'); if (closed) closed.current = get('Eyes_Closed')
    if (tail) tail.current = get('Fox_Tail')
    // Remember the authored pose so animation adds offsets instead of overwriting it.
    clone.traverse(node => { node.userData.rest = { position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() } })
  }, [clone, body, head, ears, eyes, closed, tail])
  return <primitive object={clone}/>
}
useGLTF.preload('/assets/models/collectibles/fox-sit.glb')
useGLTF.preload('/assets/models/collectibles/fox-sleep.glb')
const rest = node => node?.userData.rest

function SleepingFox({ pet }) {
  const root = useRef(), body = useRef(), head = useRef(), ears = useRef([]), eyes = useRef(), closed = useRef(), tail = useRef()
  const state = useRef({ phase: 'sleep', since: 0, cooldown: 0, yaw: SLEEPER.rotation, curl: 0, lastPet: 0 })
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, s = state.current
    if (pet?.name === '眠眠' && pet.id !== s.lastPet) { s.lastPet = pet.id; s.phase = 'wake'; s.since = 0 }
    s.since += dt; s.cooldown = Math.max(0, s.cooldown - dt)
    if (s.phase === 'sleep' && s.cooldown === 0 && loudness() > 5.5) { s.phase = 'wake'; s.since = 0 }
    if (s.phase === 'wake' && s.since > 4.2) { s.phase = 'sleep'; s.since = 0; s.cooldown = 18; s.curl = (s.curl + 1) % 3 }
    const awake = s.phase === 'wake' ? Math.min(1, s.since * 2.5) * Math.min(1, (4.2 - s.since) * 1.5) : 0
    const yawn = s.phase === 'wake' ? Math.max(0, Math.sin(Math.min(1, (s.since - .6) / 1.4) * Math.PI)) : 0
    // New curl after waking: turn a little and settle.
    const targetYaw = SLEEPER.rotation + [0, .55, -.4][s.curl]
    s.yaw += (targetYaw - s.yaw) * (1 - Math.exp(-dt * (s.phase === 'wake' ? 0 : 1.2)))
    if (root.current) root.current.rotation.y = s.yaw
    if (rest(body.current)) body.current.scale.y = rest(body.current).scale.y * (1 + Math.sin(t * 1.7) * .03 * (1 - awake))
    const h = rest(head.current)
    if (h) { head.current.rotation.x = h.rotation.x - awake * .5 - yawn * .3; head.current.position.y = h.position.y + awake * .08; head.current.scale.y = h.scale.y * (1 + yawn * .1) }
    // Ears: a twitch on each piano note even while asleep; perked when awake.
    const twitch = energy('piano', 9) * .5 + energy('hat', 12) * .15
    ears.current.forEach((ear, i) => { if (rest(ear)) ear.rotation.x = rest(ear).rotation.x - twitch * (i ? 1 : .6) + awake * .2 })
    const tl = rest(tail.current)
    if (tl) tail.current.rotation.z = tl.rotation.z + Math.sin(t * .9) * .04 + awake * Math.sin(t * 6) * .15
    if (eyes.current) eyes.current.visible = awake > .5 && yawn < .5
    if (closed.current) closed.current.visible = !(awake > .5 && yawn < .5)
  })
  return <group ref={root} position={SLEEPER.position} scale={FOX_SCALE}><FoxModel url={awakeUrl(state)} body={body} head={head} ears={ears} eyes={eyes} closed={closed} tail={tail}/></group>
}

function ListeningFox({ pet }) {
  const root = useRef(), body = useRef(), head = useRef(), ears = useRef([]), eyes = useRef(), tail = useRef()
  const state = useRef({ pos: new THREE.Vector3(...LISTENER.home), yaw: LISTENER.homeYaw, listening: false, quiet: 0, lastPet: 0, petTime: -100 })
  const target = useRef(new THREE.Vector3())
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, s = state.current
    if (pet?.name === '云团' && pet.id !== s.lastPet) { s.lastPet = pet.id; s.petTime = t }
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
    INTERACTIONS.foxListening.position[0] = s.pos.x
    INTERACTIONS.foxListening.position[2] = s.pos.z
    if (rest(body.current)) body.current.scale.y = rest(body.current).scale.y * (1 + Math.sin(t * 1.7 + 1.8) * .025)
    // Nod on the beat while listening, a little head tilt, and a happy tail swish.
    const beat = Math.max(energy('kick', 7), energy('snare', 7) * .7, energy('piano', 6) * .6)
    const h = rest(head.current)
    if (h) { head.current.rotation.x = h.rotation.x + (s.listening && !walking ? beat * .25 : 0) - Math.max(0, 1 - (t - s.petTime) / 2) * .18; head.current.rotation.y = h.rotation.y + (s.listening ? Math.sin(t * .7) * .18 : 0) }
    ears.current.forEach(ear => { if (rest(ear)) ear.rotation.x = rest(ear).rotation.x - energy('any', 6) * .25 })
    const tl = rest(tail.current)
    if (tl) tail.current.rotation.z = tl.rotation.z + Math.sin(t * (s.listening ? 3.2 : 1.1)) * (s.listening ? .18 : .06) + Math.max(0, 1 - (t - s.petTime) / 2) * Math.sin(t * 15) * .26
    if (eyes.current) eyes.current.scale.z = Math.sin(t * 1.35 + 1.8) < .985 ? 1 : .1 // blink
  })
  return <group ref={root} position={LISTENER.home} scale={FOX_SCALE}><FoxModel url="/assets/models/collectibles/fox-sit.glb" body={body} head={head} ears={ears} eyes={eyes} tail={tail}/></group>
}

export default function Foxes({ pet }) { return <><SleepingFox pet={pet}/><ListeningFox pet={pet}/></> }
