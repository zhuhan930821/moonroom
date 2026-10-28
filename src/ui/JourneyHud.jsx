import { useEffect, useState, useSyncExternalStore } from 'react'
import { journey } from '../game/journey'

export default function JourneyHud() {
  const state = useSyncExternalStore(journey.subscribe, journey.get)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (state.phase !== 'travel') return
    const timer = setInterval(() => setProgress(journey.progress()), 250)
    return () => clearInterval(timer)
  }, [state.phase])
  if (state.phase === 'idle') return state.keepsake ? <div className="voyage-keepsake">✦ 月亮河车站 · 车票已收藏</div> : null
  if (state.phase === 'ticket') return <aside className="voyage-hud" data-testid="voyage-hud">
    <small>MOON RIVER · 车票已领取</small>
    <p>坐到房间左侧的音乐键盘前，弹奏三声，让房间启航。</p>
    <span>启航音符 {state.notes} / 3</span>
  </aside>
  if (state.phase === 'travel') return <aside className="voyage-hud" data-testid="voyage-hud">
    <small>航行中 · 月亮河车站</small>
    <p>房间正在穿过云海。你仍可以自由走动，到窗边看看。</p>
    <div className="voyage-track"><i style={{ width: `${Math.round(progress * 100)}%` }}/></div>
  </aside>
  return <aside className="voyage-hud arrived" data-testid="voyage-hud">
    <small>已抵达 · 月亮河车站</small>
    <p>月光停在窗外，车站送来一枚小小的月河车票。</p>
    {state.keepsake ? <span>✦ 纪念物已保存，下次打开房间仍在</span> : <button onClick={event => { event.stopPropagation(); journey.collect() }}>收下纪念车票</button>}
  </aside>
}
