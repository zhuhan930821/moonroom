import { useEffect, useState, useSyncExternalStore } from 'react'
import { worldPhysics, worldState } from '../worlds/worldState'
import { LENGTH } from './StrollWorld'

// Street overlay: title card, coin purse + walk progress, shop prompts, and the shop counter.
export default function StrollHud({ playerPosition, mode }) {
  const state = useSyncExternalStore(worldState.subscribe, worldState.get)
  const world = state.world
  const [near, setNear] = useState(null) // { kind: 'shop', shop } | { kind: 'door' }
  const [shop, setShop] = useState(null)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const p = playerPosition(), spots = worldPhysics.spots
      if (!p || !spots?.shops) return
      setProgress(Math.min(1, Math.max(0, -p.z / LENGTH)))
      const s = spots.shops.find(s => Math.abs(p.z - s.z) < s.w / 2 + .4 && p.x * s.side > 2.6)
      const door = spots.doors.find(([x, , z]) => Math.hypot(p.x - x, p.z - z) < 2.4)
      setNear(old => { const next = s ? { kind: 'shop', shop: s } : door ? { kind: 'door' } : null; return old?.kind === next?.kind && old?.shop === next?.shop ? old : next })
    }, 120)
    return () => clearInterval(timer)
  }, [playerPosition])

  useEffect(() => {
    const onKey = event => {
      if (mode !== 'explore' || event.repeat || event.target?.closest?.('input, textarea')) return
      if (event.code === 'Escape' && shop) { setShop(null); return }
      if (event.code !== 'KeyE' || shop) return
      if (near?.kind === 'shop') { setShop(near.shop); document.exitPointerLock?.() }
      if (near?.kind === 'door') worldState.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [near, shop, mode])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t) }, [toast])
  if (!world) return null

  const buy = good => {
    const result = worldState.buy(world, shop, good)
    setToast(result.ok ? `买下了「${good.name}」 · 回家后它会出现在纪念品架上` : result.reason)
  }
  const prompt = shop ? null : near?.kind === 'shop' ? `进「${near.shop.name}」看看` : near?.kind === 'door' ? '回到房间' : null
  const bought = world.shops.reduce((n, s) => n + s.goods.filter(g => worldState.owns(world, g)).length, 0)
  return <>
    <div className="world-card" key={state.visits} data-testid="world-card">
      <small>ANYWHERE DOOR · STROLL</small><h2>{world.name}</h2>{world.legend && <p>{world.legend}</p>}{state.note && <em>{state.note}</em>}
    </div>
    <div className="stroll-bar" data-testid="stroll-bar">
      <span className="coins">◉ {state.coins}<small>月光币</small></span>
      <span className="track"><i style={{ width: `${progress * 100}%` }}/></span>
      <span className="bought">{bought ? `已买 ${bought} 件` : `${world.shops.length} 家店`}</span>
    </div>
    <div className={`prompt ${prompt ? 'show' : ''}`}>{prompt && <><kbd>E</kbd><span>{prompt}</span></>}</div>
    {toast && <div className="world-toast" role="status">{toast}</div>}
    {shop && <div className="shop-panel" data-testid="shop-panel" onClick={event => event.stopPropagation()} style={{ '--sign': shop.sign }}>
      <header><strong>{shop.name}</strong><small>店主：{shop.keeper}</small><button onClick={() => setShop(null)} aria-label="离开小店">×</button></header>
      <div className="goods">{shop.goods.map(g => { const owned = worldState.owns(world, g)
        return <article key={g.id}>
          <i style={{ background: g.color }}/>
          <div><b>{g.name}</b>{g.story && <p>{g.story}</p>}</div>
          <button disabled={owned || state.coins < g.price} onClick={() => buy(g)} data-testid="shop-buy">{owned ? '已买' : `◉ ${g.price}`}</button>
        </article> })}</div>
      <footer>你有 ◉ {state.coins} 月光币 · 街上飘着的光点可以捡 · Esc 离开</footer>
    </div>}
  </>
}
