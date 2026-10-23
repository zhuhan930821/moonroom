import { useState } from 'react'
import { worldState } from './worldState'
import { takeStore } from '../audio/takes'
import { roomState } from '../game/roomState'

// What the door is told about you: a few true facts from the room, woven in by the dreamer.
function roomContext() {
  const takes = takeStore.getAll(), souvenirs = worldState.get().souvenirs, room = roomState.get()
  const time = room.time < .5 ? '深夜' : room.time < 1.5 ? '黎明' : '白天'
  return [`房间里现在是${time}`,
    takes[0] && `最近录的曲子叫《${takes[0].name}》，${takes[0].bpm} BPM`,
    souvenirs.length && `纪念品架上已经有：${souvenirs.slice(0, 4).map(s => s.name).join('、')}`,
  ].filter(Boolean).join('；')
}

export default function PortalPanel({ onDone }) {
  const [wish, setWish] = useState('')
  const [busy, setBusy] = useState(false)
  const visitedSea = worldState.get().souvenirs.some(s => s.worldId === 'idsea')
  const go = async destination => {
    setBusy(true)
    await worldState.open({ wish, context: roomContext(), destination })
    onDone()
  }
  return <div className="mode-panel portal-panel" data-testid="portal-panel" onClick={event => event.stopPropagation()}>
    <span>ANYWHERE DOOR</span>
    <p>门后是一个只存在一次的世界。你想去什么样的地方？</p>
    <textarea id="portal-wish" value={wish} onChange={event => setWish(event.target.value)} placeholder="可以不写。比如：下着橘子味雨的海边小镇" rows={2} maxLength={200} disabled={busy}/>
    <div className="transport">
      <button onClick={() => go('new')} disabled={busy} data-testid="portal-go">{busy ? '正在开门……' : '推开门'}</button>
      <button onClick={() => go('idsea')} disabled={busy} data-testid="portal-idsea">去 Id 之海{visitedSea ? '' : ' ✦'}</button>
    </div>
    <small>每次推门都会生成一个新世界 · 找到发光的纪念品带回来 · Esc 关上门</small>
  </div>
}
