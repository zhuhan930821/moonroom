import { useEffect, useState } from 'react'
import Studio from './Studio'

const content = {
  Diary: { title: 'Diary — 17 October', body: '窗外的岛屿今晚比昨天近一些。月光落在桌上，狐狸们都睡着了。也许明天我会沿着那条发光的轨道走一走。' },
  Music: { title: 'Music Player', body: 'MOONROOM RADIO · A soft place to return to.' },
  Dreams: { title: 'Dreams', body: '01 / The castle in the clouds\n02 / The train made of starlight\n03 / A room that remembers you' },
}

const ICONS = { Diary: '📓', Music: '♫', Dreams: '✦', Studio: '🎚' }

export default function Desktop({ ambient, onToggleAmbient, onHit }) {
  const [open, setOpen] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { const timer = setTimeout(() => setReady(true), 550); return () => clearTimeout(timer) }, [])
  return <div className={`desktop-shell ${ready ? 'ready' : ''} ${open === 'Studio' ? 'studio-open' : ''}`} data-testid="crt-desktop" onClick={event => event.stopPropagation()}>
    <div className="desktop-title">Moonroom 98 <span>☾　a gentle place</span></div>
    <div className="desktop-icons">
      {Object.keys(ICONS).map(name => <button key={name} className="desktop-icon" onClick={() => setOpen(name)} data-testid={`icon-${name.toLowerCase()}`}><span>{ICONS[name]}</span>{name}</button>)}
    </div>
    {open === 'Studio' && <><Studio onHit={onHit}/><button className="studio-close" onClick={() => setOpen(null)} aria-label="Close Studio">×</button></>}
    {open && open !== 'Studio' && <section className="desktop-window" role="dialog" aria-label={content[open].title} data-testid="desktop-window">
      <div className="window-bar"><strong>{content[open].title}</strong><button onClick={() => setOpen(null)} aria-label="Close window">×</button></div>
      <div className="window-body"><p>{content[open].body}</p>{open === 'Music' && <button className="win-button" onClick={onToggleAmbient}>{ambient ? '❚❚ Pause ambient' : '▶ Play ambient'}</button>}</div>
    </section>}
    <div className="taskbar"><span>☾ Start</span><span>11:17 PM</span></div>
  </div>
}
