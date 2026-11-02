import { useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { DUO_SCENES, LOFT_CHAT, LOFT_TOGETHER, MEMBERS, TOGETHER_CHAT, sasaBand } from '../game/sasaBand'
import { LOFT_Y, REHEARSAL, loft } from '../game/loft'
import { sincePlayed } from '../audio/musicBus'

// Sasa's band as Hogwarts-style ghosts: pearly, see-through full-length figures with a cold rim
// of light, feet that fray into drifting smoke just above the floor, and a slow glide around
// their own instrument (through furniture, as ghosts do). Come close and the one nearest stops,
// turns to you and the colour seeps back into them while they talk. Play their instrument and
// the standing figure melts into their playing pose. They always turn to face you, so the
// cut-out is never seen edge-on.
const FLOAT = .14         // hover above the floor
const FIGURE_H = 2.2      // head to toe (the room's furniture runs ~1.5x real scale)
const PLAY_H = 1.15       // the playing art is a closer, waist-up shot
const NEAR = 2.4          // talk range
const LINE_SECONDS = 6.5
const WANDER = .75        // how far a ghost drifts from its spot
const MAX_TURN = 1.05     // a profile pose turns at most ~60° away from you, so it never goes edge-on
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a))

// Where each ghost is right now (Talk measures distance to these, not to the fixed spots).
const live = Object.fromEntries(MEMBERS.map(m => [m.id, new THREE.Vector3(m.position[0], 0, m.position[1])]))
// Loft scene: 'rehearse' (all three in the band corner) or 'together' (the pair on the mat).
const scene = { phase: 'rehearse', since: 0, duo: 0 }
const duoPos = new THREE.Vector3() // where the pair's moment is drawn (for the hearts and the talk)

function ghostMaterial(map, tint, { bottom = [.0, .1], side = .02 } = {}) {
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  const { width, height } = map.image
  mat.userData.uniforms = {
    uShow: { value: 0 }, uGlow: { value: 0 }, uAwake: { value: 0 }, uTime: { value: 0 }, uFade: { value: 1 }, uBlush: { value: 0 },
    uTint: { value: new THREE.Color(tint) }, uTexel: { value: new THREE.Vector2(1 / width, 1 / height) },
  }
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, mat.userData.uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uShow, uGlow, uAwake, uTime, uFade, uBlush; uniform vec3 uTint; uniform vec2 uTexel;
        float gRim, gHalo; vec2 gUv;`)
      // Resample the portrait through a gentle shimmer, and read the alpha around each pixel
      // for the inner rim (edge of the figure) and the outer halo (just outside it).
      .replace('#include <map_fragment>', `
        gUv = vMapUv;
        vec2 wuv = vMapUv;
        wuv.x += (sin(wuv.y * 22. + uTime * 2.3) * .0035 + sin(wuv.y * 57. - uTime * 3.1) * .0015) * (1. - uAwake * .7);
        vec4 tex = texture2D(map, wuv);
        vec2 o = uTexel * 5.;
        float aN = texture2D(map, wuv + vec2(0., o.y)).a, aS = texture2D(map, wuv - vec2(0., o.y)).a;
        float aE = texture2D(map, wuv + vec2(o.x, 0.)).a, aW = texture2D(map, wuv - vec2(o.x, 0.)).a;
        gRim = clamp(tex.a - min(min(aN, aS), min(aE, aW)), 0., 1.);
        gHalo = clamp(max(max(aN, aS), max(aE, aW)) - tex.a, 0., 1.);
        diffuseColor *= tex;`)
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        vec2 uvp = gUv;
        // smoky lower body: layered moving waves fray the bottom edge upward
        float n = sin(uvp.x * 9. + uTime * .7) * .5 + sin(uvp.x * 23. - uTime * 1.1 + uvp.y * 7.) * .3 + sin(uvp.x * 47. + uTime * 1.9 - uvp.y * 13.) * .2;
        float smoke = smoothstep(${bottom[0].toFixed(3)} + n * .04, ${bottom[1].toFixed(3)} + n * .05, uvp.y);
        float edge = smoke * smoothstep(0., ${side.toFixed(3)}, uvp.x) * smoothstep(1., ${(1 - side).toFixed(3)}, uvp.x) * uFade;
        float sweep = uShow * 1.3 - .1;
        float hidden = smoothstep(sweep - .15, sweep, uvp.y);
        // pearly silver-blue ghost, with just a breath of their own colour; full colour when awake
        vec3 col = diffuseColor.rgb;
        float lum = dot(col, vec3(.299, .587, .114));
        vec3 pearl = mix(vec3(.72, .84, 1.), uTint, .22);
        vec3 ghost = pearl * (.14 + lum * 2.2) + pearl * gRim * 1.3; // keep the face readable: dark stays dim
        float flicker = .93 + .07 * sin(uTime * 11.3 + sin(uTime * 2.7) * 3.);
        diffuseColor.rgb = mix(ghost, col * (1. + uGlow * .3), uAwake * .85) + pearl * gHalo * .9 * (1. - uAwake * .5);
        // blush: a warm rose glow seeps in, strongest round the face and the rim
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, .92, .98) + vec3(.22, .06, .12) * (gRim + smoothstep(.6, .85, uvp.y) * .5), uBlush * .8);
        float a = diffuseColor.a * mix(.56, .93, uAwake) * flicker + gHalo * .32 * (1. - uAwake * .5);
        diffuseColor.a = clamp(a, 0., 1.) * edge * (1. - hidden);`)
  }
  return mat
}

// Faint ectoplasm: pale specks drifting up and away from each ghost.
function Wisps({ tint, count = 18 }) {
  const ref = useRef()
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => [Math.sin(i * 12.9898) * .5 + .5, Math.sin(i * 78.233) * .5 + .5, Math.sin(i * 39.425) * .5 + .5]), [count])
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  const color = useMemo(() => new THREE.Color('#cfe0ff').lerp(new THREE.Color(tint), .2), [tint])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    seeds.forEach(([a, b, c], i) => {
      const life = (t * (.06 + c * .06) + a) % 1
      positions[i * 3] = Math.sin(a * 40 + t * .3) * (.2 + b * .3) + life * (b - .5) * .4
      positions[i * 3 + 1] = .6 + life * 1.7
      positions[i * 3 + 2] = Math.cos(b * 40 + t * .25) * (.15 + a * .2)
    })
    if (ref.current) ref.current.geometry.attributes.position.needsUpdate = true
  })
  return <points ref={ref}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
    <pointsMaterial color={color} size={.028} transparent opacity={.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
  </points>
}

function Ghost({ member, map, playMap, on, index }) {
  const root = useRef(), turn = useRef(), lamp = useRef(), playMesh = useRef()
  const h = FIGURE_H, w = h * map.image.width / map.image.height
  const ph = PLAY_H, pw = ph * playMap.image.width / playMap.image.height
  const material = useMemo(() => ghostMaterial(map, member.tint), [map, member.tint])
  const playMaterial = useMemo(() => ghostMaterial(playMap, member.tint, { bottom: [.0, .3], side: .1 }), [playMap, member.tint])
  // the playing shot hangs where the standing figure's head and chest are
  const playY = h / 2 - ph / 2 + .02
  const s = useRef({ show: 0, yaw: 0, awake: 0, home: 0, play: 0, loft: 0, together: 0, drift: new THREE.Vector2() })
  useFrame(({ camera, clock }, dt) => {
    const st = s.current, t = clock.elapsedTime
    st.show += ((on ? 1 : 0) - st.show) * (1 - Math.exp(-dt * (on ? 1.1 : 2.2)))
    const glow = Math.exp(-sincePlayed(member.part) * 2.6)
    const talking = sasaBand.get().talk?.id === member.id
    st.awake += ((talking ? 1 : glow > .2 ? .8 : 0) - st.awake) * (1 - Math.exp(-dt * 1.6))
    // glide on a slow loop round their spot; settle back home while awake
    st.home += ((st.awake > .05 ? 1 : 0) - st.home) * (1 - Math.exp(-dt * .8))
    const p = index * 2.1
    st.drift.set(Math.sin(t * .13 + p) * WANDER + Math.sin(t * .31 + p * 2) * .2, Math.cos(t * .11 + p) * WANDER * .6)
    const [x0, z0] = member.position
    let x = x0 + st.drift.x * (1 - st.home), z = z0 + st.drift.y * (1 - st.home)
    // playing: glide to their seat at the instrument
    if (member.seat) { x += (member.seat[0] - x) * st.play; z += (member.seat[1] - z) * st.play }
    // You're on the loft: they drift up to the band corner (and back down when you leave).
    st.loft += ((loft.get().onLoft ? 1 : 0) - st.loft) * (1 - Math.exp(-dt * .7))
    const paired = !!member.togetherSpot
    st.together += (((paired && st.loft > .5 && scene.phase === 'together') ? 1 : 0) - st.together) * (1 - Math.exp(-dt * .5))
    if (st.loft > .001) {
      const [sx, sz] = member.loftSpot, [tx, tz] = member.togetherSpot || member.loftSpot
      const lx = sx + (tx - sx) * st.together, lz = sz + (tz - sz) * st.together
      const drift = .25 * (1 - st.together * .8)
      x += (lx + st.drift.x * drift - x) * st.loft; z += (lz + st.drift.y * drift - z) * st.loft
    }
    // sitting on the mat: settle lower, so the smoky hem pools on the cushions
    const y = st.loft * LOFT_Y - st.together * .55
    live[member.id].set(x, y, z)
    st.play += ((glow > .25 ? 1 : 0) - st.play) * (1 - Math.exp(-dt * (glow > .25 ? 4 : 1.2)))
    for (const [m, fade] of [[material, 1 - st.play], [playMaterial, st.play]]) {
      const u = m.userData.uniforms
      // the pair's single figures dissolve while their drawn-together moment (Duo) shows
      u.uShow.value = st.show * (1 - st.together * .98); u.uGlow.value = glow; u.uAwake.value = Math.max(st.awake, st.together * .45); u.uTime.value = t; u.uFade.value = fade; u.uBlush.value = st.together
    }
    if (root.current) { root.current.visible = st.show > .005; root.current.position.set(x, y, z) }
    if (turn.current) {
      const face = Math.atan2(camera.position.x - x, camera.position.z - z)
      let want = face, mirror = 1
      if (member.faces && st.play > .01) {
        // Playing art is drawn in profile with the instrument on the image's right: point the
        // image's right at the real instrument, showing the front to you (mirrored if needed).
        let yaw = Math.atan2(-(member.faces[1] - z), member.faces[0] - x)
        if (Math.cos(yaw - face) < 0) { yaw += Math.PI; mirror = -1 }
        // Full turn (maxTurn) when you're close — sitting at their instrument — easing back to
        // MAX_TURN from further away, where a square profile would read as a sliver.
        const near = 1 - Math.min(1, Math.max(0, (Math.hypot(camera.position.x - x, camera.position.z - z) - 1.8) / 1.4))
        const limit = MAX_TURN + ((member.maxTurn ?? MAX_TURN) - MAX_TURN) * near
        want = face + Math.max(-limit, Math.min(limit, wrap(yaw - face))) * st.play
      }
      if (playMesh.current) playMesh.current.scale.x = mirror
      // together: each turns a little toward the other and leans in
      want += (member.lean || 0) * -.38 * st.together
      st.yaw += wrap(want - st.yaw) * (1 - Math.exp(-dt * (1.2 + st.awake * 2)))
      turn.current.rotation.set(0, st.yaw, Math.sin(t * .4 + p) * .03 * (1 - st.awake) + (member.lean || 0) * -.11 * st.together)
      turn.current.position.y = FLOAT + h / 2 + Math.sin(t * .7 + p) * .07 - (1 - st.show) * .35 + glow * Math.abs(Math.sin(t * 9)) * .03
      turn.current.scale.setScalar(1 + Math.sin(t * 1.1 + p) * .008 + glow * .015)
    }
    if (lamp.current) lamp.current.intensity = (.5 + st.awake * .8 + glow * 1.5) * st.show
  })
  return <group ref={root} position={[member.position[0], 0, member.position[1]]} visible={false}>
    <group ref={turn}>
      <mesh material={material} renderOrder={3}><planeGeometry args={[w, h]}/></mesh>
      <mesh ref={playMesh} material={playMaterial} position-y={playY} renderOrder={4}><planeGeometry args={[pw, ph]}/></mesh>
    </group>
    {on && <Wisps tint={member.tint}/>}
    <pointLight ref={lamp} position={[0, 1.7, .3]} color="#cfe0ff" intensity={0} distance={2.6} decay={2}/>
  </group>
}

// Runs the loft scene: rehearsal in the band corner, then a while on the mat for the pair.
function LoftDirector() {
  useFrame((_, dt) => {
    const onLoft = loft.get().onLoft && sasaBand.get().on
    if (!onLoft) { scene.phase = 'rehearse'; scene.since = 0; return }
    scene.since += dt
    if (scene.since > LOFT_TOGETHER[scene.phase]) {
      if (scene.phase === 'together') scene.duo = (scene.duo + 1) % DUO_SCENES.length
      scene.phase = scene.phase === 'rehearse' ? 'together' : 'rehearse'; scene.since = 0
    }
  })
  return null
}

// The pair's moment, drawn together (DUO_SCENES): the same ghost treatment, warmly blushing,
// turned toward you, with little hearts rising off it. Their single figures dissolve meanwhile.
function Duo({ maps }) {
  const plane = useRef(), turn = useRef(), hearts = useRef(), amount = useRef(0), shown = useRef(-1)
  const materials = useMemo(() => maps.map(map => ghostMaterial(map, '#ffb8d8', { bottom: [.0, .12], side: .03 })), [maps])
  const heartShape = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, -.5); s.bezierCurveTo(-.9, .1, -.5, .9, 0, .45); s.bezierCurveTo(.5, .9, .9, .1, 0, -.5); return new THREE.ShapeGeometry(s, 8) }, [])
  const heartMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc4dc', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }), [])
  useFrame(({ clock, camera }, dt) => {
    const on = loft.get().onLoft && sasaBand.get().on && scene.phase === 'together' && scene.since > 2.5
    amount.current += ((on ? 1 : 0) - amount.current) * (1 - Math.exp(-dt * (on ? .7 : 1.4)))
    if (amount.current < .003) shown.current = scene.duo // switch pictures only while hidden
    const k = amount.current, t = clock.elapsedTime, d = DUO_SCENES[shown.current < 0 ? scene.duo : shown.current]
    const i = DUO_SCENES.indexOf(d), mat = materials[i], map = maps[i]
    duoPos.set(d.spot[0], LOFT_Y, d.spot[1])
    if (plane.current) {
      plane.current.visible = k > .003
      plane.current.material = mat
      const h = d.height, w = h * map.image.width / map.image.height
      plane.current.scale.set(w, h, 1)
      plane.current.position.y = d.lift + h / 2 + Math.sin(t * .6) * .03
    }
    if (turn.current) { turn.current.position.copy(duoPos); turn.current.rotation.y = Math.atan2(camera.position.x - duoPos.x, camera.position.z - duoPos.z) }
    const talk = sasaBand.get().talk, pairTalking = talk && LOFT_TOGETHER.pair.includes(talk.id)
    const u = mat.userData.uniforms
    u.uShow.value = k; u.uTime.value = t; u.uBlush.value = 1; u.uGlow.value = 0; u.uFade.value = 1
    u.uAwake.value += ((pairTalking ? .78 : .5) - u.uAwake.value) * (1 - Math.exp(-dt * 1.5))
    if (hearts.current) hearts.current.children.forEach((heart, n) => {
      const life = (t * .2 + n / 6) % 1
      heart.position.set(duoPos.x + Math.sin(n * 2.4 + t * .6) * .35, LOFT_Y + d.lift + d.height * .75 + life * 1.0, duoPos.z + Math.cos(n * 1.7) * .2)
      heart.scale.setScalar(.045 + Math.sin(life * Math.PI) * .03)
      heart.quaternion.copy(camera.quaternion)
      heart.visible = k > .02
    })
    heartMat.opacity = k * .75 * (.75 + Math.sin(t * 1.7) * .25)
  })
  return <group>
    <group ref={turn}><mesh ref={plane} renderOrder={3} visible={false}><planeGeometry args={[1, 1]}/></mesh></group>
    <group ref={hearts}>{Array.from({ length: 6 }, (_, n) => <mesh key={n} geometry={heartShape} material={heartMat}/>)}</group>
  </group>
}

// Picks who talks: the nearest ghost in range. Their card quote first, then the other lines in
// turn; their "playing" line while their instrument is being played.
function Talk() {
  const s = useRef({ id: null, since: 0, index: 0, chat: 0, chatSince: 0 })
  useFrame(({ camera }, dt) => {
    const { on } = sasaBand.get()
    const st = s.current
    // On the mat, the pair (and a grumbling Shen Yu) take over the lines.
    if (on && loft.get().onLoft && scene.phase === 'together' && Math.hypot(camera.position.x - duoPos.x, camera.position.z - duoPos.z) < 4) {
      st.chatSince += dt
      if (st.togetherLine == null) { st.togetherLine = 0; st.chatSince = 0 }
      if (st.chatSince > 4.8) { st.chatSince = 0; st.togetherLine = (st.togetherLine + 1) % TOGETHER_CHAT.length }
      const [id, line] = TOGETHER_CHAT[st.togetherLine], m = MEMBERS.find(x => x.id === id)
      st.id = null
      sasaBand.say({ id, name: m.name, role: m.role, tint: m.tint, line })
      return
    }
    st.togetherLine = null
    // Up in the band corner: they talk to each other (and about you), one line at a time.
    if (on && loft.get().onLoft && scene.phase === 'rehearse' && Math.hypot(camera.position.x - REHEARSAL.position[0], camera.position.z - REHEARSAL.position[1]) < 3.4) {
      st.chatSince += dt
      if (st.chatSince > 4.6) { st.chatSince = 0; st.chat = (st.chat + 1) % LOFT_CHAT.length }
      const [id, line] = LOFT_CHAT[st.chat], m = MEMBERS.find(x => x.id === id)
      st.id = null
      sasaBand.say({ id, name: m.name, role: m.role, tint: m.tint, line })
      return
    }
    let best = null, bestD = NEAR
    // only ghosts on your own level (floor or loft) can hear you
    if (on) for (const m of MEMBERS) { const p = live[m.id], d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z); if (Math.abs(camera.position.y - p.y - 1.68) < 1.8 && d < bestD) { best = m; bestD = d } }
    if (!best) { st.id = null; if (sasaBand.get().talk) sasaBand.say(null); return } // also clears loft lines once you walk away
    if (best.id !== st.id) { st.id = best.id; st.since = 0; st.index = 0 }
    st.since += dt
    if (st.since > LINE_SECONDS) { st.since = 0; st.index += 1 }
    const pool = [best.quote, ...best.lines]
    const line = sincePlayed(best.part) < 1.2 ? best.playing : pool[st.index % pool.length]
    sasaBand.say({ id: best.id, name: best.name, role: best.role, tint: best.tint, line })
  })
  return null
}

export default function SasaBand() {
  const on = useSyncExternalStore(sasaBand.subscribe, () => sasaBand.get().on)
  const maps = useTexture([...MEMBERS.map(m => m.image), ...MEMBERS.map(m => m.play), ...DUO_SCENES.map(d => d.image)])
  maps.forEach(map => { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4 })
  return <group name="SasaBand">
    {MEMBERS.map((m, i) => <Ghost key={m.id} member={m} map={maps[i]} playMap={maps[i + MEMBERS.length]} on={on} index={i}/>)}
    <LoftDirector/>
    <Duo maps={maps.slice(MEMBERS.length * 2)}/>
    <Talk/>
  </group>
}
