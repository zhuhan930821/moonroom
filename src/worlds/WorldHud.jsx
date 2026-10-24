import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { worldPhysics, worldState } from './worldState'
import { worldPrompt } from './worldPrompt'
import StrollHud from '../stroll/StrollHud'

// In-world overlay: arrival title card, "pick up" / "go home" prompts, and the E key handling
// for both (the room's interaction system stands down while you're away).
export default function WorldHud(props) {
  const kind = useSyncExternalStore(worldState.subscribe, () => worldState.get().world?.kind)
  useEffect(() => { if (!kind) worldPrompt.set(null) }, [kind])
  return kind === 'stroll' ? <><OpeningVeil/><StrollHud {...props}/></> : <RoamHud {...props}/>
}

function OpeningVeil() {
  const status = useSyncExternalStore(worldState.subscribe, () => worldState.get().status)
  return status === 'opening' ? <div className="world-veil"><div><small>ANYWHERE DOOR</small><p>门后的世界正在成形……</p></div></div> : null
}

function RoamHud({ playerPosition, mode }) {
  const state = useSyncExternalStore(worldState.subscribe, worldState.get)
  const promptRef = useRef(null)
  useEffect(() => { worldPrompt.set(promptRef.current) })
  promptRef.current = null // reset each render; set again below when a prompt shows
  const [near, setNear] = useState(null)
  const [toast, setToast] = useState('')
  const world = state.world
  useEffect(() => {
    if (!world) return
    const timer = setInterval(() => {
      const p = playerPosition(), spots = worldPhysics.spots
      if (!p || !spots) return
      const d = ([x, , z]) => Math.hypot(p.x - x, p.z - z)
      setNear(!state.carried && d(spots.souvenir) < 2.4 ? 'souvenir' : d(spots.door) < 2.2 ? 'door' : null)
    }, 120)
    return () => clearInterval(timer)
  }, [world, state.carried, playerPosition])
  useEffect(() => {
    if (!world) return
    const onKey = event => {
      if (event.code !== 'KeyE' || event.repeat || mode !== 'explore' || event.target?.closest?.('input, textarea')) return
      if (near === 'souvenir') { const item = worldState.pickUp(); if (item) setToast(`「${item.name}」放进了口袋 · 回到房间后它会出现在纪念品架上`) }
      if (near === 'door') worldState.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [world, near, mode])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t) }, [toast])

  if (state.status === 'opening') return <div className="world-veil" data-testid="world-opening"><div><small>ANYWHERE DOOR</small><p>门后的世界正在成形……</p></div></div>
  if (!world) return null
  const prompt = near === 'souvenir' ? `拾起「${world.souvenir.name}」` : near === 'door' ? '回到房间' : null
  promptRef.current = prompt
  return <>
    <div className="world-card" key={state.visits} data-testid="world-card">
      <small>{world.kind === 'idsea' ? 'ANYWHERE DOOR · 01' : `ANYWHERE DOOR · ${String(state.visits).padStart(2, '0')}`}</small>
      <h2>{world.name}</h2>
      {world.legend && <p>{world.legend}</p>}
      {state.note && <em>{state.note}</em>}
    </div>
    <div className="world-goal">{state.carried ? '纪念品已在口袋里 · 回到门边按 E 回房间' : `远处有一道光柱 · 去找「${world.souvenir.name}」`}</div>
    <div className={`prompt ${prompt ? 'show' : ''}`}>{prompt && <><kbd>E</kbd><span>{prompt}</span></>}</div>
    {toast && <div className="world-toast" role="status">{toast}</div>}
  </>
}
