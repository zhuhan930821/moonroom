import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { worldPhysics, worldState } from '../worlds/worldState'
import { LENGTH } from './constants'
import { get, renderer } from './registry'
import { seat } from './seat'
import { worldPrompt } from '../worlds/worldPrompt'
import { playerRig } from '../game/PlayerController'
import './content/render'
import { playChime } from '../audio/drums'
import './content/index.js'

// Street overlay: title card, purse + walk progress, and what you can do where you stand:
// look at a good on a shop counter (and buy it), talk to the keeper (the whole shop's list),
// pick up something left in a home, or take a door home.
export default function StrollHud({ playerPosition, mode }) {
  const state = useSyncExternalStore(worldState.subscribe, worldState.get)
  const world = state.world
  const [near, setNear] = useState(null)
  const [open, setOpen] = useState(null) // { kind: a registered panel id, data }
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState('')
  const ctxRef = useRef(null)
  const promptRef = useRef(null)
  useEffect(() => { worldPrompt.set(world ? promptRef.current : null) }) // after render: never update App mid-render

  useEffect(() => {
    const timer = setInterval(() => {
      const p = playerPosition(), spots = worldPhysics.spots
      if (!p || !spots?.interact) return
      setProgress(Math.min(1, Math.max(0, -p.z / LENGTH)))
      let best = null, bestD = Infinity
      for (const it of spots.interact) {
        const d = Math.hypot(p.x - it.pos[0], p.z - it.pos[1])
        if (d < it.radius && d < bestD && get('interaction', it.kind)?.label(it, ctxRef.current) != null) { best = it; bestD = d }
      }
      if (!best && spots.doors.some(([x, , z]) => Math.hypot(p.x - x, p.z - z) < 2.4)) best = { kind: 'door' }
      setNear(old => old === best || (old?.kind === 'door' && best?.kind === 'door') ? old : best)
    }, 120)
    return () => clearInterval(timer)
  }, [playerPosition])

  // What content interactions get to work with (see content/interactions.js).
  const ctx = {
    world, coins: state.coins, shop: i => world.shops[i], owns: good => worldState.owns(world, good),
    buy: (seller, good) => buy(seller, good), panel: (kind, data) => { setOpen({ kind, data }); document.exitPointerLock?.() },
    toast: setToast, addCoins: n => worldState.addCoins(n), chime: notes => playChime(notes), home: () => worldState.close(),
    sit: ({ x, z, yaw, drop = .6 }) => { const p = playerPosition(); seat.current = { x, z, drop }; playerRig.teleport?.({ position: [x, p?.y ?? 1.68, z], yaw, pitch: -.05 }) },
  }
  ctxRef.current = ctx
  const buy = (shop, good) => {
    const result = worldState.buy(world, shop, good)
    setToast(result.ok ? (good.price ? `买下了「${good.name}」 · 回家后它会出现在纪念品架上` : `收下了「${good.name}」 · 它会出现在纪念品架上`) : result.reason)
    return result.ok
  }

  useEffect(() => {
    const onKey = event => {
      if (mode !== 'explore' || event.repeat || event.target?.closest?.('input, textarea')) return
      if (open) {
        if (event.code === 'Escape' || (event.code === 'KeyE' && !event.target?.closest?.('textarea'))) { event.preventDefault(); setOpen(null) }
        const Panel = renderer('panel', open.kind)
        if (event.code === 'Enter' && Panel?.onEnter) { event.preventDefault(); Panel.onEnter(open.data, ctx, () => setOpen(null)) }
        return
      }
      if (event.code !== 'KeyE' || !near) return
      get('interaction', near.kind)?.use(near, ctx)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t) }, [toast])
  if (!world) return null

  const prompt = !open && near ? get('interaction', near.kind)?.label(near, ctx) : null
  promptRef.current = prompt || null
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
    {open && (() => { const Panel = renderer('panel', open.kind); return Panel ? <Panel data={open.data} ctx={ctx} close={() => setOpen(null)}/> : null })()}
  </>
}
