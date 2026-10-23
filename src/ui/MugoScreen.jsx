import { useEffect, useMemo, useRef, useState } from 'react'
import { FLAGS } from '../config/flags'
import { HELLO, OPEN_MIDI, READY, SONG_MIDI, mugoFrameUrl, mugoOutbox } from '../game/mugoBridge'
import { midiToTake, takeToMidi } from '../audio/midi'
import { takeStore } from '../audio/takes'
import { celebrate } from '../game/celebrate'

// The desk laptop + companion monitor open Mugo Moc (the DrumApp music-block studio) in a
// framed "monitor". Keyboard focus moves into the iframe, so exit is an on-screen button.
export default function MugoScreen({ onExit, milo, onInviteMilo }) {
  const [loaded, setLoaded] = useState(false)
  const [linked, setLinked] = useState(false)
  const [notice, setNotice] = useState('')
  const frame = useRef(null)
  const src = useMemo(() => mugoFrameUrl(FLAGS.mugoUrl), [])
  const origin = useMemo(() => new URL(src).origin, [src])

  useEffect(() => {
    const onMessage = event => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return
      const data = event.data || {}
      if (data.type === READY) {
        setLinked(true)
        event.source.postMessage({ type: HELLO }, origin)
        const take = mugoOutbox.take()
        if (take) {
          const midi = takeToMidi(take).buffer
          event.source.postMessage({ type: OPEN_MIDI, name: take.name, midi }, origin, [midi])
          setNotice(`已在 Mugo 打开《${take.name}》`)
        }
      }
      if (data.type === SONG_MIDI && data.midi) {
        try {
          const take = takeStore.add({ ...midiToTake(data.midi, String(data.name || 'Mugo').slice(0, 80)), pressed: true })
          setNotice(`收到《${take.name}》，已压成唱片放进唱片箱`)
          celebrate(`Mugo 送来了《${take.name}》`)
        } catch (error) { setNotice(error.message || 'Mugo 送来的 MIDI 打不开') }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [origin])

  return <div className="mugo-shell" data-testid="mugo-screen" data-linked={linked ? '1' : '0'} onClick={event => event.stopPropagation()}>
    <div className="mugo-bar">
      <strong>Mugo Moc</strong><span>{notice || (linked ? '已和房间连通' : '音乐积木工作室')}</span>
      <button className="milo-invite" onClick={onInviteMilo} data-testid="invite-milo">{milo?.visiting ? '送 Milo 回 Mugo' : '邀请 Milo 来串门'}</button>
      <a href={FLAGS.mugoUrl} target="_blank" rel="noreferrer">在新标签页打开 ↗</a>
      <button onClick={onExit}>← 返回房间</button>
    </div>
    <iframe ref={frame} title="Mugo Moc" src={src} onLoad={() => setLoaded(true)} allow="autoplay; microphone; fullscreen; clipboard-write"/>
    {!loaded && <div className="mugo-wait">正在打开 Mugo… <small>如果一直是空白：检查网络，或点右上角在新标签页打开；本地开发可用 <code>?mugoUrl=http://localhost:5173/</code>。</small></div>}
  </div>
}
