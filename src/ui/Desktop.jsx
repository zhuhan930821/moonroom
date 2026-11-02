import { useEffect, useState, useSyncExternalStore } from 'react'
import Studio from './Studio'
import { personalSpace } from '../game/personalSpace'
import { currentDiaryPages } from './DiaryPage'

// Moonroom 98: the CRT's desktop. Diary, Notes and Dreams show what you've actually done in the
// room (the bookshelf diary pages, your desk note, the dreams from the bed); Start opens a menu.
const TITLES = { Diary: 'Diary', Notes: 'Notes', Dreams: 'Dreams', Music: 'Music Player' }
const ICONS = { Diary: '📓', Notes: '✎', Dreams: '✦', Music: '♫', Studio: '🎚' }

function DiaryWindow() {
  const pages = currentDiaryPages()
  const [i, setI] = useState(0)
  const page = pages[i % pages.length]
  return <>
    <p className="win-date">{page.date}{page.today ? ' · 今天，还没写完' : ''}</p>
    <p>{page.text}</p>
    <div className="win-row"><button className="win-button" onClick={() => setI(n => (n - 1 + pages.length) % pages.length)}>◀ 上一页</button><span>{i % pages.length + 1} / {pages.length}</span><button className="win-button" onClick={() => setI(n => (n + 1) % pages.length)}>下一页 ▶</button></div>
  </>
}
function NotesWindow() {
  const { note } = useSyncExternalStore(personalSpace.subscribe, personalSpace.get)
  return note.trim() ? <><p className="win-note">{note}</p><p className="win-hint">坐到书桌前的椅子上可以接着写。</p></>
    : <p className="win-hint">还没有写下笔记。坐到书桌前的椅子上（「坐下写点什么」），写完点「保存笔记」，就会出现在这里。</p>
}
function DreamsWindow() {
  const { dreams } = useSyncExternalStore(personalSpace.subscribe, personalSpace.get)
  if (!dreams.length) return <p className="win-hint">还没有记下的梦。去床上躺下，点「做一个梦」。</p>
  return <ol className="win-dreams">{dreams.map((d, i) => <li key={i}><b>{d.title}</b><small>{d.date}</small><span>{d.text}</span></li>)}</ol>
}

export default function Desktop({ ambient, onToggleAmbient, onHit, onOpenInMugo, onExit }) {
  const [open, setOpen] = useState(null)
  const [menu, setMenu] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 20000); return () => clearInterval(t) }, [])
  const launch = name => { setMenu(false); setOpen(name) }
  const [ready, setReady] = useState(false)
  useEffect(() => { const timer = setTimeout(() => setReady(true), 550); return () => clearTimeout(timer) }, [])
  return <div className={`desktop-shell ${ready ? 'ready' : ''} ${open === 'Studio' ? 'studio-open' : ''}`} data-testid="crt-desktop" onClick={event => event.stopPropagation()}>
    <div className="desktop-title">Moonroom 98 <span>☾　a gentle place</span></div>
    <div className="desktop-icons">
      {Object.keys(ICONS).map(name => <button key={name} className="desktop-icon" onClick={() => setOpen(name)} data-testid={`icon-${name.toLowerCase()}`}><span>{ICONS[name]}</span>{name}</button>)}
    </div>
    {open === 'Studio' && <><Studio onHit={onHit} onOpenInMugo={onOpenInMugo}/><button className="studio-close" onClick={() => setOpen(null)} aria-label="Close Studio">×</button></>}
    {open && open !== 'Studio' && <section className="desktop-window" role="dialog" aria-label={TITLES[open]} data-testid="desktop-window">
      <div className="window-bar"><strong>{TITLES[open]}</strong><button onClick={() => setOpen(null)} aria-label="Close window">×</button></div>
      <div className="window-body">
        {open === 'Diary' && <DiaryWindow/>}
        {open === 'Notes' && <NotesWindow/>}
        {open === 'Dreams' && <DreamsWindow/>}
        {open === 'Music' && <><p>MOONROOM RADIO · lofi 钢琴，慢慢的。</p><button className="win-button" onClick={onToggleAmbient}>{ambient ? '❚❚ Pause' : '▶ Play'}</button></>}
      </div>
    </section>}
    {menu && <div className="start-menu" data-testid="start-menu">
      <div className="start-side">Moonroom<b>98</b></div>
      <div className="start-items">
        {Object.keys(ICONS).map(name => <button key={name} onClick={() => launch(name)}><span>{ICONS[name]}</span>{name}</button>)}
        <hr/>
        <button onClick={() => { setMenu(false); onExit?.() }}><span>⏻</span>关机 · 回到房间</button>
      </div>
    </div>}
    <div className="taskbar"><button className={`start-button ${menu ? 'pressed' : ''}`} onClick={() => setMenu(v => !v)} data-testid="start-button">☾ Start</button><span>{clock.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></div>
  </div>
}
