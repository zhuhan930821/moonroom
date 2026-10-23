// Renderers for café, library (+ guestbook panel), street musician and the cat.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { render } from '../registry'
import { DEPTH, FLOOR_H, LENGTH } from '../constants'
import { HangingLamp, Keeper, Part, Shell, ShelfUnit } from '../interiors'
import { aisles } from './library'
import { pageFor, readBook, writeBook } from './guestbook'
import { audioGraph } from '../../audio/drums'
import { rng } from '../../worlds/spec'

const woodOf = p => new THREE.Color(p.roof).lerp(new THREE.Color('#6a4a3a'), .5).getStyle()

// ---------- café ----------
render('room', 'cafe', function Cafe({ b, world, night, layout }) {
  const p = world.palette, s = b.side, w = b.w, wood = woodOf(p)
  const menu = layout.interact.find(it => it.kind === 'order' && Math.abs(it.pos[1] - b.z) < .01)?.menu
  const tz = [-1, 1].map(k => k * (w / 4 + .25))
  return <Shell b={b} holes={[{ z: 0, w: 1.5, y0: 0, y1: 2.4 }, ...tz.map(z => ({ z, w: Math.min(2, w / 4 + .2), y0: .8, y1: 2.4 }))]} palette={p} floorColor={wood}>
    {/* window tables with chairs facing the street */}
    {tz.map((z, i) => <group key={i}>
      <Part side={s} u0={.8} u1={1.6} y0={.75} y1={.8} z0={z - .4} z1={z + .4} color="#f4ece0"/>
      <Part side={s} u0={1.15} u1={1.25} y0={0} y1={.75} z0={z - .05} z1={z + .05} color="#3a3036"/>
      <Part side={s} u0={2.0} u1={2.45} y0={.42} y1={.48} z0={z - .25} z1={z + .25} color={p.accent}/>
      <Part side={s} u0={2.4} u1={2.47} y0={.48} y1={1.1} z0={z - .25} z1={z + .25} color={p.accent}/>
      <mesh position={[s * (1.2 - DEPTH / 2), .86, z + .15]}><cylinderGeometry args={[.05, .04, .1, 12]}/><meshStandardMaterial color="#ffffff"/></mesh>
      <mesh position={[s * (1.2 - DEPTH / 2), 1.0, z - .15]}><sphereGeometry args={[.06, 10, 8]}/><meshBasicMaterial color={new THREE.Color(p.light).multiplyScalar(2)} toneMapped={false}/></mesh>
    </group>)}
    {/* counter, coffee machine, menu board, keeper */}
    <Part side={s} u0={4.6} u1={5.3} y0={0} y1={1.05} z0={-w / 2 + .3} z1={w / 2 - .3} color={wood}/>
    <Part side={s} u0={4.5} u1={5.4} y0={1.05} y1={1.1} z0={-w / 2 + .3} z1={w / 2 - .3} color="#e8dcc8"/>
    <Part side={s} u0={4.8} u1={5.2} y0={1.1} y1={1.6} z0={-.9} z1={-.3} color="#c8c0b8"/>
    <mesh position={[s * (4.75 - DEPTH / 2), 1.45, -.6]}><sphereGeometry args={[.05, 8, 6]}/><meshBasicMaterial color="#ff6a4a" toneMapped={false}/></mesh>
    <mesh position={[s * (DEPTH - .22 - DEPTH / 2), 2.1, 0]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[2.2, 1.1]}/><meshStandardMaterial color="#2a2a2e" roughness={.9}/></mesh>
    {menu?.goods.map((g, i) => <mesh key={g.id} position={[s * (DEPTH - .23 - DEPTH / 2), 2.4 - i * .3, -.6]} rotation-y={-s * Math.PI / 2}>
      <planeGeometry args={[.9, .06]}/><meshBasicMaterial color={g.color} toneMapped={false}/></mesh>)}
    {menu && <Keeper text={menu.keeper} apron={p.accent} position={[s * (6.1 - DEPTH / 2), 0, .6]} facing={-s * Math.PI / 2}/>}
    {[-1, 0, 1].map(k => <HangingLamp key={k} side={s} u={3} z={k * w / 3.2} color={p.light} intensity={night ? 4 : 2}/>)}
    <Part side={s} u0={.5} u1={3.6} y0={.04} y1={.055} z0={-1} z1={1} color={p.wallC} castShadow={false}/>
  </Shell>
})

// ---------- library ----------
render('room', 'library', function Library({ b, world, night }) {
  const p = world.palette, s = b.side, w = b.w, wood = woodOf(p)
  return <Shell b={b} holes={[{ z: 0, w: 1.5, y0: 0, y1: 2.5 }]} palette={p} floorColor={wood}>
    <ShelfUnit side={s} u={DEPTH - .45} z0={-w / 2 + .3} z1={w / 2 - .3} rows={3} seed={world.seed + 91} palette={p} wood={wood}/>
    {aisles({ z: 0, w }).map(([u0, u1, z0, z1], i) => <group key={i}>
      <Part side={s} u0={u0} u1={u1} y0={0} y1={2.5} z0={z0} z1={z1} color={wood}/>
      <ShelfUnit side={s} u={u0 - .02} z0={z0 + .1} z1={z1 - .1} rows={3} seed={world.seed + i * 13} palette={p} wood={wood}/>
    </group>)}
    {/* the lectern with the guestbook, open, a little lamp beside it */}
    <group position={[s * (1.25 - DEPTH / 2), 0, w / 4]}>
      <mesh position-y={.55}><boxGeometry args={[.5, 1.1, .5]}/><meshStandardMaterial color={wood}/></mesh>
      <mesh position-y={1.16} rotation-z={s * .25}><boxGeometry args={[.55, .05, .7]}/><meshStandardMaterial color="#f6eedc"/></mesh>
      <mesh position={[0, 1.2, 0]} rotation-z={s * .25}><boxGeometry args={[.02, .03, .66]}/><meshStandardMaterial color={p.roof}/></mesh>
      <pointLight position-y={1.8} color={p.light} intensity={night ? 3 : 1.5} distance={3} decay={2}/>
    </group>
    {/* reading nook: armchair + rug */}
    <Part side={s} u0={1.4} u1={2.2} y0={0} y1={.45} z0={-w / 2 + .5} z1={-w / 2 + 1.3} color={p.wallB}/>
    <Part side={s} u0={2.0} u1={2.2} y0={.45} y1={1.1} z0={-w / 2 + .5} z1={-w / 2 + 1.3} color={p.wallB}/>
    <Part side={s} u0={.6} u1={2.6} y0={.04} y1={.055} z0={-w / 2 + .4} z1={-w / 2 + 2.2} color={p.accent} castShadow={false}/>
    <HangingLamp side={s} u={2.2} z={0} color={p.light} intensity={night ? 7 : 4}/>
    <HangingLamp side={s} u={4.2} z={-w / 4} color={p.light} intensity={night ? 4 : 2}/>
  </Shell>
})

function Guestbook({ data, ctx, close }) {
  const [text, setText] = useState('')
  const [mine, setMine] = useState(readBook)
  const page = pageFor(ctx.world.seed, mine)
  const signedHere = mine.some(e => e.street === ctx.world.name)
  const sign = () => {
    const entry = writeBook({ text, street: ctx.world.name })
    if (!entry) return
    setMine(readBook()); setText('')
    if (!signedHere) { ctx.addCoins(2); ctx.toast('你在留言簿上写了一句。图书管理员悄悄塞给你两枚月光币。') }
    else ctx.toast('你又写了一句。')
  }
  return <div className="shop-panel guestbook" data-testid="guestbook" onClick={event => event.stopPropagation()} style={{ '--sign': ctx.world.palette.accent }}>
    <header><strong>留言簿</strong><small>{ctx.world.name} · 图书馆</small><button onClick={close} aria-label="合上">×</button></header>
    <div className="entries">
      {page.strangers.map((e, i) => <p key={`s${i}`}>“{e.text}”<small>—— {e.name}</small></p>)}
      {page.mine.map((e, i) => <p key={`m${i}`} className="mine">“{e.text}”<small>—— 你，在「{e.street}」</small></p>)}
    </div>
    <textarea id="guestbook-text" value={text} onChange={event => setText(event.target.value)} maxLength={140} rows={2} placeholder="留下一句话。以后在别的街上，你也会读到它。"/>
    <footer className="good-actions"><span>{signedHere ? '你在这条街留过言' : '第一次在这条街留言，有小惊喜'}</span><button onClick={sign} disabled={!text.trim()} data-testid="guestbook-sign">留下</button></footer>
  </div>
}
render('panel', 'guestbook', Guestbook)

// ---------- street musician ----------
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], pentatonic: [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10] }
render('prop', 'musician', function Musician({ x, z, side, player, live, world }) {
  const { camera } = useThree()
  const bus = useRef(null), squeeze = useRef()
  useEffect(() => { // a little busking tune; volume follows how close you are
    const { ctx, master } = audioGraph()
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master); bus.current = out
    const scale = SCALES[world.music.scale] || SCALES.pentatonic, f = n => 440 * 2 ** ((n - 69) / 12)
    const beat = 60 / (world.music.tempo + 12), r = rng(world.seed + 5)
    const phrase = Array.from({ length: 16 }, () => scale[Math.floor(r() * scale.length)] + (r() < .25 ? 12 : 0))
    let next = ctx.currentTime + .2, step = 0
    const timer = setInterval(() => {
      while (next < ctx.currentTime + .3) {
        const excited = performance.now() / 1000 - live.excited < 8
        const note = 60 + world.music.root + phrase[step % 16] + (excited && step % 4 === 0 ? 12 : 0)
        const osc = ctx.createOscillator(), env = ctx.createGain()
        osc.type = 'sawtooth'; osc.frequency.value = f(note)
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400
        env.gain.setValueAtTime(0, next); env.gain.linearRampToValueAtTime(.05, next + .03); env.gain.exponentialRampToValueAtTime(.0001, next + beat * .95)
        osc.connect(lp).connect(env).connect(out); osc.start(next); osc.stop(next + beat)
        if (step % 4 === 0) { const bass = ctx.createOscillator(), bg = ctx.createGain(); bass.type = 'triangle'; bass.frequency.value = f(36 + world.music.root + phrase[step % 16] % 12)
          bg.gain.setValueAtTime(.08, next); bg.gain.exponentialRampToValueAtTime(.0001, next + beat * 3.5); bass.connect(bg).connect(out); bass.start(next); bass.stop(next + beat * 4) }
        next += beat * (excited ? .5 : 1); step++
      }
    }, 50)
    return () => { clearInterval(timer); out.gain.setTargetAtTime(0, ctx.currentTime, .2); setTimeout(() => out.disconnect(), 800) }
  }, [world, live])
  useFrame(({ clock }) => {
    const d = Math.hypot(camera.position.x - x, camera.position.z - z)
    if (bus.current) bus.current.gain.value = Math.max(0, 1 - d / 22) ** 2
    if (squeeze.current) squeeze.current.scale.z = 1 + Math.sin(clock.elapsedTime * 4) * .25
  })
  return <group position={[x, 0, z]}>
    <Keeper text={player} apron={world.palette.accent} position={[0, 0, 0]} facing={-side * Math.PI / 2}/>
    <group ref={squeeze} position={[-side * .45, .75, 0]}>
      <mesh><boxGeometry args={[.22, .34, .3]}/><meshStandardMaterial color="#8a2a3a" roughness={.5}/></mesh>
      <mesh scale={[1, 1, .9]}><boxGeometry args={[.18, .3, .34]}/><meshStandardMaterial color="#f4ece0"/></mesh>
    </group>
    <mesh position={[-side * .9, .06, .5]} rotation-x={-Math.PI / 2}><circleGeometry args={[.28, 20]}/><meshStandardMaterial color="#3a2a30" side={THREE.DoubleSide}/></mesh>
    {Array.from({ length: Math.min(8, live.tips + 3) }, (_, i) => <mesh key={i} position={[-side * .9 + Math.cos(i * 2.3) * .14, .08, .5 + Math.sin(i * 2.3) * .14]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[.05, 12]}/><meshBasicMaterial color="#ffd46a"/></mesh>)}
  </group>
})

// ---------- 小满 the cat ----------
const COATS = [['#f4a860', '#ffffff'], ['#3a3438', '#ffffff'], ['#d8d0c8', '#9a8a80']]
render('prop', 'cat', function Cat({ coat, live }) {
  const { camera } = useThree()
  const root = useRef(), body = useRef(), tail = useRef(), head = useRef()
  const brain = useRef({ target: [...live.pos], wait: 2, yaw: 0, sit: 1 })
  const [fur, belly] = COATS[coat]
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, b = brain.current, [x, z] = live.pos
    const px = camera.position.x, pz = camera.position.z, near = Math.hypot(px - x, pz - z)
    b.wait -= dt
    if (b.wait <= 0) { // pick something to do: amble, come say hi, or sit
      const roll = Math.random()
      if (roll < .4 && near < 16) b.target = [THREE.MathUtils.clamp(px + (Math.random() - .5) * 2, -4.2, 4.2), pz - 1.2]
      else if (roll < .8) b.target = [THREE.MathUtils.clamp(x + (Math.random() - .5) * 8, -4.2, 4.2), THREE.MathUtils.clamp(z + (Math.random() - .5) * 14, -LENGTH + 4, 6)]
      b.wait = 3 + Math.random() * 5
    }
    const dx = b.target[0] - x, dz = b.target[1] - z, dist = Math.hypot(dx, dz)
    const petted = performance.now() / 1000 - (live.petted || -99) < 3
    const walking = dist > .25 && !petted
    if (walking) { const step = Math.min(dist, dt * 1.3); live.pos[0] += dx / dist * step; live.pos[1] += dz / dist * step; b.yaw = Math.atan2(dx, dz) }
    b.sit += ((walking ? 0 : 1) - b.sit) * (1 - Math.exp(-dt * 4))
    if (root.current) { root.current.position.set(live.pos[0], 0, live.pos[1]); root.current.rotation.y += Math.atan2(Math.sin(b.yaw - root.current.rotation.y), Math.cos(b.yaw - root.current.rotation.y)) * (1 - Math.exp(-dt * 6)) }
    if (body.current) { body.current.rotation.x = -b.sit * .5; body.current.position.y = .28 + Math.abs(Math.sin(t * 9)) * .03 * (1 - b.sit) }
    if (tail.current) tail.current.rotation.z = Math.sin(t * (petted ? 9 : 2)) * (petted ? .5 : .3)
    if (head.current) head.current.rotation.z = petted ? Math.sin(t * 6) * .15 : 0
  })
  const furM = <meshStandardMaterial color={fur} roughness={.9}/>
  return <group ref={root} scale={.9}>
    <group ref={body}>
      <mesh scale={[.55, .5, .9]}><sphereGeometry args={[.32, 16, 12]}/>{furM}</mesh>
      <mesh position={[0, -.05, .12]} scale={[.42, .38, .5]}><sphereGeometry args={[.3, 12, 10]}/><meshStandardMaterial color={belly} roughness={.9}/></mesh>
      <group ref={head} position={[0, .2, .3]}>
        <mesh><sphereGeometry args={[.19, 16, 12]}/>{furM}</mesh>
        {[-1, 1].map(k => <mesh key={k} position={[k * .1, .16, 0]} rotation-z={-k * .25}><coneGeometry args={[.07, .13, 8]}/>{furM}</mesh>)}
        {[-1, 1].map(k => <mesh key={`e${k}`} position={[k * .07, .03, .16]}><sphereGeometry args={[.028, 8, 6]}/><meshStandardMaterial color="#2a2a20" roughness={.2}/></mesh>)}
        <mesh position={[0, -.03, .18]}><sphereGeometry args={[.02, 8, 6]}/><meshStandardMaterial color="#ff9aa8"/></mesh>
        <mesh position={[0, -.1, .1]} rotation-x={.2}><torusGeometry args={[.11, .015, 6, 16]}/><meshStandardMaterial color="#d83a4a"/></mesh>
        <mesh position={[0, -.2, .17]}><sphereGeometry args={[.025, 8, 6]}/><meshStandardMaterial color="#ffd46a" metalness={.8} roughness={.3}/></mesh>
      </group>
      <group ref={tail} position={[0, .05, -.28]}>
        <mesh position={[0, .2, -.06]} rotation-x={-.4}><capsuleGeometry args={[.04, .4, 4, 8]}/>{furM}</mesh>
      </group>
    </group>
  </group>
})
