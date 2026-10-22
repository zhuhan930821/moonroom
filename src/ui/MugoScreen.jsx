import { useState } from 'react'
import { FLAGS } from '../config/flags'

// The desk laptop + companion monitor open Mugo Moc (the DrumApp music-block studio) in a
// framed "monitor". Keyboard focus moves into the iframe, so exit is an on-screen button.
export default function MugoScreen({ onExit }) {
  const [loaded, setLoaded] = useState(false)
  return <div className="mugo-shell" data-testid="mugo-screen" onClick={event => event.stopPropagation()}>
    <div className="mugo-bar">
      <strong>Mugo Moc</strong><span>音乐积木工作室</span>
      <a href={FLAGS.mugoUrl} target="_blank" rel="noreferrer">在新标签页打开 ↗</a>
      <button onClick={onExit}>← 返回房间</button>
    </div>
    <iframe title="Mugo Moc" src={FLAGS.mugoUrl} onLoad={() => setLoaded(true)} allow="autoplay; microphone; fullscreen; clipboard-write"/>
    {!loaded && <div className="mugo-wait">正在打开 Mugo… <small>如果一直是空白：检查网络，或点右上角在新标签页打开；本地开发可用 <code>?mugoUrl=http://localhost:5173/</code>。</small></div>}
  </div>
}
