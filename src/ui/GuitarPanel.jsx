import { useEffect, useRef, useSyncExternalStore } from 'react'
import { CHORD_KEYS, CHORD_NAMES, STRING_KEYS, chordNotes } from '../game/guitarChords'
import { GUITARS, guitarStore, prepareGuitar } from '../audio/guitar'
import { muteAll, pickChord, pluckNow, strumNow, switchGuitar } from '../game/guitarActions'

const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e']

// Guitar mode: pick a chord (1–8), strum down (Space / J) or up (K), pluck strings (Z–N),
// mute (M), switch guitar (Tab). On touch: chord buttons plus a pad you swipe to strum.
export default function GuitarPanel() {
  const state = useSyncExternalStore(guitarStore.subscribe, () => `${guitarStore.get().guitar}|${guitarStore.get().chord}`)
  const [guitar, chord] = state.split('|')

  useEffect(() => { prepareGuitar(CHORD_NAMES.map(chordNotes)).catch(() => {}) }, [])

  const doStrum = strumNow, pick = pickChord

  useEffect(() => {
    const onKey = event => {
      if (event.metaKey || event.ctrlKey || event.target?.closest?.('input, textarea')) return
      const name = CHORD_KEYS[event.code]
      if (name) { event.preventDefault(); if (!event.repeat) pick(name); return }
      if (event.repeat) return
      if (event.code === 'Space') { event.preventDefault(); doStrum(event.shiftKey ? 'up' : 'down') }
      else if (event.code === 'KeyJ') { event.preventDefault(); doStrum('down') }
      else if (event.code === 'KeyK') { event.preventDefault(); doStrum('up') }
      else if (event.code === 'KeyM') { event.preventDefault(); muteAll() }
      else if (event.code === 'Tab') { event.preventDefault(); switchGuitar() }
      else if (STRING_KEYS[event.code] != null) { event.preventDefault(); pluckNow(STRING_KEYS[event.code]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Strum pad: every ~22px of travel strums in that direction, so swiping back and forth
  // keeps a rhythm going; a tap is a down strum.
  const pad = useRef(null)
  const onPointerDown = event => { event.currentTarget.setPointerCapture?.(event.pointerId); pad.current = { y: event.clientY, moved: false } }
  const onPointerMove = event => {
    const p = pad.current
    if (!p) return
    const dy = event.clientY - p.y
    if (Math.abs(dy) > 22) { doStrum(dy > 0 ? 'down' : 'up'); p.y = event.clientY; p.moved = true }
  }
  const onPointerUp = () => { if (pad.current && !pad.current.moved) doStrum('down'); pad.current = null }

  return <div className="mode-panel guitar-panel" data-testid="guitar-controls" onClick={event => event.stopPropagation()} onMouseDown={event => event.preventDefault()}>
    <span>GUITAR · {GUITARS[guitar].name}</span>
    <div className="guitar-chords">{CHORD_NAMES.map((name, i) => <button key={name} className={name === chord ? 'on' : ''} onClick={() => pick(name)}><kbd>{i + 1}</kbd>{name}</button>)}</div>
    <div className="guitar-strum" data-testid="guitar-strum" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { pad.current = null }}>
      {STRING_NAMES.map((s, i) => <i key={s} style={{ '--w': `${2.6 - i * .32}px` }}/>)}
      <b>{chord}</b><small>在这里上下划动扫弦 · 点一下向下扫</small>
    </div>
    <div className="guitar-actions">
      <button onClick={switchGuitar} data-testid="guitar-switch">⇄ 换成{guitar === 'acoustic' ? '电吉他' : '木吉他'} (Tab)</button>
      <button onClick={muteAll}>✋ 闷音 (M)</button>
    </div>
    <small className="guitar-keys"><kbd>Space</kbd>/<kbd>J</kbd> 下扫　<kbd>K</kbd> 上扫　<kbd>Z</kbd>…<kbd>N</kbd> 单弦　<kbd>1</kbd>–<kbd>8</kbd> 换和弦 · E / Esc 放下吉他</small>
  </div>
}
