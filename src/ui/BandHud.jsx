import { useEffect, useRef, useSyncExternalStore } from 'react'
import { band } from '../game/band'
import { gamepads } from '../game/gamepad'
import { BAND_PARTS, PAD_HELP, PART_NAMES } from '../game/padMaps'
import { sincePlayed } from '../audio/musicBus'
import { GUITARS, guitarStore, prepareGuitar } from '../audio/guitar'
import { CHORD_NAMES, chordNotes } from '../game/guitarChords'

const ICONS = { drums: '🥁', guitar: '🎸', piano: '🎹' }
const playerLabel = pad => `手柄 ${pad + 1}`

function Lobby({ seats, pads }) {
  const seated = Object.values(seats).filter(p => p != null).length
  return <section className="band-lobby" data-testid="band-lobby" onClick={e => e.stopPropagation()}>
    <small>MOONROOM BAND</small>
    <h2>组一支乐队</h2>
    <div className="band-slots">{BAND_PARTS.map(part => <div key={part} className={`band-slot ${seats[part] != null ? 'on' : ''}`} data-part={part}>
      <i>{ICONS[part]}</i><b>{PART_NAMES[part]}</b><span>{seats[part] != null ? playerLabel(seats[part]) : '空位'}</span>
    </div>)}</div>
    <p>{pads.length === 0 ? '还没检测到手柄：用数据线或蓝牙连上，然后按手柄上任意一个键。' : `已连接 ${pads.length} 个手柄 · 每人按 A 加入，←/→ 换乐器，B 退出`}</p>
    <div className="band-start">{seated ? '按 Start 开始演奏' : '至少一个人加入才能开始'} · Esc 离开</div>
  </section>
}

function PlayerStrip({ part, pad }) {
  const el = useRef(null)
  const guitar = useSyncExternalStore(guitarStore.subscribe, () => `${GUITARS[guitarStore.get().guitar].name} · ${guitarStore.get().chord}`)
  useEffect(() => {
    let raf
    const tick = () => { if (el.current) el.current.style.setProperty('--hit', Math.exp(-sincePlayed(part) * 4).toFixed(3)); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [part])
  return <div ref={el} className={`band-strip ${pad == null ? 'empty' : ''}`} data-part={part}>
    <header><i>{ICONS[part]}</i><b>{PART_NAMES[part]}</b><span>{pad == null ? '空位' : playerLabel(pad)}</span>{part === 'guitar' && pad != null && <em>{guitar}</em>}</header>
    <small>{pad == null ? '按 Back 回到大厅让朋友加入' : PAD_HELP[part].replace(/ · B (起身|放下)$/, '')}</small>
  </div>
}

export default function BandHud() {
  const { phase, seats } = useSyncExternalStore(band.subscribe, band.get)
  const pads = useSyncExternalStore(gamepads.subscribe, gamepads.connected)
  useEffect(() => { if (phase !== 'off') prepareGuitar(CHORD_NAMES.map(chordNotes)).catch(() => {}) }, [phase])
  if (phase === 'off') return null
  if (phase === 'lobby') return <Lobby seats={seats} pads={pads}/>
  return <div className="band-hud" data-testid="band-hud">
    {BAND_PARTS.map(part => <PlayerStrip key={part} part={part} pad={seats[part]}/>)}
    <div className="band-exit">Back · 回到大厅　Esc · 结束乐队</div>
  </div>
}
