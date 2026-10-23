import { useEffect, useState, useSyncExternalStore } from 'react'
import { worldPhysics, worldState } from '../worlds/worldState'
import { LENGTH } from './layout'

// Street overlay: title card, purse + walk progress, and what you can do where you stand:
// look at a good on a shop counter (and buy it), talk to the keeper (the whole shop's list),
// pick up something left in a home, or take a door home.
export default function StrollHud({ playerPosition, mode }) {
  const state = useSyncExternalStore(worldState.subscribe, worldState.get)
  const world = state.world
  const [near, setNear] = useState(null)
  const [open, setOpen] = useState(null) // { kind: 'good', item } | { kind: 'shop', shop }
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      const p = playerPosition(), spots = worldPhysics.spots
      if (!p || !spots?.interact) return
      setProgress(Math.min(1, Math.max(0, -p.z / LENGTH)))
      let best = null, bestD = Infinity
      for (const it of spots.interact) {
        const d = Math.hypot(p.x - it.pos[0], p.z - it.pos[1])
        if (d < it.radius && d < bestD && !(it.kind === 'found' && worldState.owns(worldState.get().world, it.good))) { best = it; bestD = d }
      }
      if (!best && spots.doors.some(([x, , z]) => Math.hypot(p.x - x, p.z - z) < 2.4)) best = { kind: 'door' }
      setNear(old => old === best || (old?.kind === 'door' && best?.kind === 'door') ? old : best)
    }, 120)
    return () => clearInterval(timer)
  }, [playerPosition])

  const shopOf = item => world.shops[item.shop]
  const buy = (shop, good) => {
    const result = worldState.buy(world, shop, good)
    setToast(result.ok ? (good.price ? `买下了「${good.name}」 · 回家后它会出现在纪念品架上` : `收下了「${good.name}」 · 它会出现在纪念品架上`) : result.reason)
    return result.ok
  }

  useEffect(() => {
    const onKey = event => {
      if (mode !== 'explore' || event.repeat || event.target?.closest?.('input, textarea')) return
      if (open) {
        if (event.code === 'Escape' || event.code === 'KeyE') { event.preventDefault(); setOpen(null) }
        if (event.code === 'Enter' && open.kind === 'good') { event.preventDefault(); if (buy(shopOf(open.item), open.item.good)) setOpen(null) }
        return
      }
      if (event.code !== 'KeyE' || !near) return
      if (near.kind === 'good') { setOpen({ kind: 'good', item: near }); document.exitPointerLock?.() }
      if (near.kind === 'keeper') { setOpen({ kind: 'shop', shop: shopOf(near) }); document.exitPointerLock?.() }
      if (near.kind === 'found') buy({ name: '别人的家' }, near.good)
      if (near.kind === 'door') worldState.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t) }, [toast])
  if (!world) return null

  const label = it => {
    if (it.kind === 'good') return `看看「${it.good.name}」 · ${worldState.owns(world, it.good) ? '已买' : `◉ ${it.good.price}`}`
    if (it.kind === 'keeper') return `和${shopOf(it).keeper}说话`
    if (it.kind === 'found') return `拿起「${it.good.name}」`
    return '回到房间'
  }
  const prompt = !open && near ? label(near) : null
  const bought = state.souvenirs.filter(s => s.worldId === `w${world.seed}`).length
  return <>
    <div className="world-card" key={state.visits} data-testid="world-card">
      <small>ANYWHERE DOOR · STROLL</small><h2>{world.name}</h2>{world.legend && <p>{world.legend}</p>}{state.note && <em>{state.note}</em>}
    </div>
    <div className="stroll-bar" data-testid="stroll-bar">
      <span className="coins">◉ {state.coins}<small>月光币</small></span>
      <span className="track"><i style={{ width: `${progress * 100}%` }}/></span>
      <span className="bought">{bought ? `带走 ${bought} 件` : `${world.shops.length} 家店 · 门开着的房子可以进`}</span>
    </div>
    <div className={`prompt ${prompt ? 'show' : ''}`} data-testid="stroll-prompt">{prompt && <><kbd>E</kbd><span>{prompt}</span></>}</div>
    {toast && <div className="world-toast" role="status">{toast}</div>}
    {open?.kind === 'good' && (() => { const { good } = open.item, shop = shopOf(open.item), owned = worldState.owns(world, good)
      return <div className="shop-panel good-card" data-testid="good-card" onClick={event => event.stopPropagation()} style={{ '--sign': shop.sign }}>
        <header><strong>{good.name}</strong><small>{shop.name} · {shop.keeper}</small><button onClick={() => setOpen(null)} aria-label="放下">×</button></header>
        {good.story && <p className="good-story">“{good.story}”</p>}
        <footer className="good-actions">
          <span>你有 ◉ {state.coins}</span>
          <button disabled={owned || state.coins < good.price} onClick={() => { if (buy(shop, good)) setOpen(null) }} data-testid="good-buy">{owned ? '已经买过了' : `◉ ${good.price} 买下 (Enter)`}</button>
        </footer>
      </div> })()}
    {open?.kind === 'shop' && <div className="shop-panel" data-testid="shop-panel" onClick={event => event.stopPropagation()} style={{ '--sign': open.shop.sign }}>
      <header><strong>{open.shop.name}</strong><small>店主：{open.shop.keeper}</small><button onClick={() => setOpen(null)} aria-label="离开">×</button></header>
      <div className="goods">{open.shop.goods.map(g => { const owned = worldState.owns(world, g)
        return <article key={g.id}>
          <i style={{ background: g.color }}/>
          <div><b>{g.name}</b>{g.story && <p>{g.story}</p>}</div>
          <button disabled={owned || state.coins < g.price} onClick={() => buy(open.shop, g)} data-testid="shop-buy">{owned ? '已买' : `◉ ${g.price}`}</button>
        </article> })}</div>
      <footer>你有 ◉ {state.coins} 月光币 · 街上和别人家里都有月光币 · Esc 离开</footer>
    </div>}
  </>
}
