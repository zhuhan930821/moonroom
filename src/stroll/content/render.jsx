// Renderers for registered content, keyed by the same ids as the data definitions.
//   render('style', id, Roof)  Roof({ w, top, depth, roof, roll, accent }) — local to the building
//   render('room', id, Room)   Room({ b, world, night, layout }) — draws the whole building
//   render('prop', id, Prop)   Prop({ x, z, ...params, world, night })
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { render } from '../registry'
import { GEO, canvasTexture, signTexture } from '../geometry'
import { DEPTH, FRONT } from '../constants'
import { HomeInterior, ShopInterior } from '../interiors'

// ---------- roofs ----------
const roofMat = roof => <meshStandardMaterial color={roof} roughness={.75}/>
const Gable = ({ w, top, depth, roof, roll }) => <mesh geometry={GEO.prism} position-y={top} scale={[depth + .6, 2.2 + roll * 1.2, w + .3]} castShadow>{roofMat(roof)}</mesh>
render('style', 'cottage', Gable)
render('style', 'candy', Gable)
render('style', 'gothic', ({ w, top, depth, roof, roll }) => <group>
  <mesh geometry={GEO.prism} position-y={top} scale={[depth + .4, 4 + roll * 2, w + .2]} castShadow>{roofMat(roof)}</mesh>
  {roll > .55 && <mesh geometry={GEO.cone4} position={[-.5, top + 3 + roll * 3, 0]} scale={[1.6, 7, 1.6]} castShadow>{roofMat(roof)}</mesh>}
</group>)
render('style', 'pagoda', ({ w, top, depth, roof, roll }) => <group>
  {[0, 1, 2].slice(0, 1 + Math.round(roll * 2)).map(i => <mesh key={i} geometry={GEO.cone4} position-y={top + .6 + i * 1.5} scale={[depth + 2 - i * 1.6, 1.3, w + 1.6 - i * 1.6]} castShadow>{roofMat(roof)}</mesh>)}
</group>)
render('style', 'seaside', ({ w, top, depth, roof, roll, accent }) => <group>
  <mesh geometry={GEO.box} position-y={top + .2} scale={[depth + .3, .4, w + .3]}>{roofMat(roof)}</mesh>
  {roll > .5 && <mesh geometry={GEO.box} position={[-1, top + 1.2, 0]} scale={[2, 1.6, 2]}><meshStandardMaterial color={accent} roughness={.6}/></mesh>}
</group>)
render('style', 'desert', ({ w, top, depth, roof, roll }) => <group>
  <mesh geometry={GEO.box} position-y={top + .2} scale={[depth + .2, .4, w + .2]}>{roofMat(roof)}</mesh>
  {roll > .45 && <mesh geometry={GEO.dome} position-y={top + .4} scale={Math.min(depth, w) * .8} castShadow>{roofMat(roof)}</mesh>}
</group>)
render('style', 'crystal', ({ w, top, depth, roof, roll }) => <mesh geometry={GEO.cone4} position-y={top + 2} scale={[depth, 4 + roll * 3, w]}>
  <meshStandardMaterial color={roof} emissive={roof} emissiveIntensity={.35} roughness={.1} transparent opacity={.85}/></mesh>)
render('style', 'mushroom', ({ w, top, depth, roof, roll }) => <mesh geometry={GEO.dome} position-y={top - .3} scale={[depth + 3, 3 + roll * 2, w + 3]} castShadow>{roofMat(roof)}</mesh>)

// ---------- rooms ----------
render('room', 'shop', function Shop({ b, world, night }) {
  const shop = world.shops[b.shop]
  const sign = useMemo(() => signTexture(shop.name, shop.sign), [shop])
  const front = -b.side * DEPTH / 2
  return <>
    <ShopInterior b={b} shop={shop} world={world} night={night}/>
    <group position={[b.side * (FRONT + DEPTH / 2), 0, b.z]}>
      <mesh position={[front - b.side * .9, 3.0, 0]} rotation-z={b.side * .35} scale={[2, .08, b.w - .6]} geometry={GEO.box}><meshStandardMaterial color={shop.sign} roughness={.7}/></mesh>
      <group position={[front - b.side * 1.2, 3.9, b.w / 2 - .4]}>
        <mesh geometry={GEO.box} position-x={b.side * .55} scale={[1.2, .06, .06]}><meshStandardMaterial color="#3a3036" metalness={.6}/></mesh>
        {[0, Math.PI].map(r => <mesh key={r} position={[0, -.55, 0]} rotation-y={r}><planeGeometry args={[1.8, .8]}/><meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={night ? .55 : .15}/></mesh>)}
      </group>
    </group>
  </>
})
render('room', 'home', ({ b, world, night, layout }) =>
  <HomeInterior b={b} world={world} night={night} found={layout.interact.find(i => i.kind === 'found' && i.building === b.id)}/>)

// ---------- props ----------
const DROP = canvasTexture(32, 32, (ctx, w) => { const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, w) })
render('prop', 'fountain', function Fountain({ x, z, world, night }) {
  const p = world.palette, jets = useRef(), water = useRef()
  const drops = useMemo(() => Array.from({ length: 120 }, (_, i) => ({ a: i * 2.4, s: .6 + (i % 7) * .08, t: (i % 17) / 17 })), [])
  const positions = useMemo(() => new Float32Array(drops.length * 3), [drops])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    drops.forEach((d, i) => { // little arcs from the spout falling into the basin
      const k = (t * .7 * d.s + d.t) % 1, r = k * 1.15
      positions[i * 3] = Math.cos(d.a) * r; positions[i * 3 + 1] = 2.0 + 1.6 * k - 3.3 * k * k; positions[i * 3 + 2] = Math.sin(d.a) * r
    })
    if (jets.current) jets.current.geometry.attributes.position.needsUpdate = true
    if (water.current) water.current.material.emissiveIntensity = (night ? .55 : .25) + Math.sin(t * 2) * .05
  })
  const stone = new THREE.Color(p.wallA).lerp(new THREE.Color('#a8a0a0'), .4)
  return <group position={[x, 0, z]}>
    <mesh position-y={.3} castShadow receiveShadow><cylinderGeometry args={[1.7, 1.8, .6, 40, 1, true]}/><meshStandardMaterial color={stone} side={THREE.DoubleSide} roughness={.8}/></mesh>
    <mesh position-y={.58} rotation-x={-Math.PI / 2}><ringGeometry args={[1.55, 1.8, 40]}/><meshStandardMaterial color={stone} roughness={.8}/></mesh>
    <mesh ref={water} position-y={.45} rotation-x={-Math.PI / 2}><circleGeometry args={[1.6, 40]}/>
      <meshStandardMaterial color={p.skyHorizon} emissive={p.accent} emissiveIntensity={.4} roughness={.05} metalness={.2}/></mesh>
    <mesh position-y={1.1}><cylinderGeometry args={[.14, .22, 1.3, 14]}/><meshStandardMaterial color={stone}/></mesh>
    <mesh position-y={1.8}><cylinderGeometry args={[.55, .25, .2, 24]}/><meshStandardMaterial color={stone}/></mesh>
    <mesh position-y={2.05}><sphereGeometry args={[.16, 14, 10]}/><meshBasicMaterial color={new THREE.Color(p.accent).multiplyScalar(1.6)} toneMapped={false}/></mesh>
    <points ref={jets}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
      <pointsMaterial map={DROP} color={new THREE.Color(p.light).lerp(new THREE.Color('#bfe8ff'), .5)} size={.12} transparent alphaTest={.05} opacity={.85} depthWrite={false}/></points>
    <pointLight position-y={1.6} color={p.accent} intensity={night ? 6 : 2} distance={6} decay={2}/>
  </group>
})

// ---------- HUD panels: render('panel', id, Panel({ data, ctx, close })); Panel.onEnter optional ----------
function GoodCard({ data, ctx, close }) {
  const { good } = data, shop = ctx.shop(data.shop), owned = ctx.owns(good)
  return <div className="shop-panel good-card" data-testid="good-card" onClick={event => event.stopPropagation()} style={{ '--sign': shop.sign }}>
    <header><strong>{good.name}</strong><small>{shop.name} · {shop.keeper}</small><button onClick={close} aria-label="放下">×</button></header>
    {good.story && <p className="good-story">“{good.story}”</p>}
    <footer className="good-actions">
      <span>你有 ◉ {ctx.coins}</span>
      <button disabled={owned || ctx.coins < good.price} onClick={() => { if (ctx.buy(shop, good)) close() }} data-testid="good-buy">{owned ? '已经买过了' : `◉ ${good.price} 买下 (Enter)`}</button>
    </footer>
  </div>
}
GoodCard.onEnter = (data, ctx, close) => { if (ctx.buy(ctx.shop(data.shop), data.good)) close() }
render('panel', 'good', GoodCard)

render('panel', 'shop', ({ data: shop, ctx, close }) => <div className="shop-panel" data-testid="shop-panel" onClick={event => event.stopPropagation()} style={{ '--sign': shop.sign }}>
  <header><strong>{shop.name}</strong><small>店主：{shop.keeper}</small><button onClick={close} aria-label="离开">×</button></header>
  <div className="goods">{shop.goods.map(g => { const owned = ctx.owns(g)
    return <article key={g.id}>
      <i style={{ background: g.color }}/>
      <div><b>{g.name}</b>{g.story && <p>{g.story}</p>}</div>
      <button disabled={owned || ctx.coins < g.price} onClick={() => ctx.buy(shop, g)} data-testid="shop-buy">{owned ? '已买' : `◉ ${g.price}`}</button>
    </article> })}</div>
  <footer>你有 ◉ {ctx.coins} 月光币 · 街上和别人家里都有月光币 · Esc 离开</footer>
</div>)
import './more.render.jsx'
