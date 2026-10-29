import { useRef } from 'react'
import { GUITAR_CHORDS, PICK_STRINGS } from '../audio/guitarChords'

export default function GuitarPanel({ game }) {
  const swipe = useRef(null)
  const onStart = event => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    swipe.current = { id: event.pointerId, y: event.clientY, sounded: false }
  }
  const onMove = event => {
    const gesture = swipe.current
    if (!gesture || gesture.id !== event.pointerId) return
    const distance = event.clientY - gesture.y
    if (Math.abs(distance) < 24) return
    game.strumGuitar(distance < 0)
    gesture.sounded = true
    gesture.y = event.clientY
  }
  const onEnd = event => {
    const gesture = swipe.current
    if (!gesture || gesture.id !== event.pointerId) return
    if (!gesture.sounded) game.strumGuitar(false)
    swipe.current = null
  }
  return <div className="mode-panel guitar-panel" data-testid="guitar-controls" data-recording={game.recording ? '1' : '0'} onClick={event => event.stopPropagation()}>
    <div className="guitar-title"><span>{game.guitarTone === 'electric' ? 'RED AMPLIFIED GUITAR' : 'ORANGE ACOUSTIC GUITAR'} · {GUITAR_CHORDS[game.guitarChord].name}</span><div className="guitar-tone"><button className={game.guitarTone === 'acoustic' ? 'on' : ''} onClick={() => game.setGuitarTone('acoustic')}>木吉他</button><button className={game.guitarTone === 'electric' ? 'on' : ''} onClick={() => game.setGuitarTone('electric')}>接音箱 · Tab</button></div></div>
      <div className="guitar-play-area"><div className="guitar-chords">{GUITAR_CHORDS.map((chord, index) =>
        <button key={chord.name} className={game.guitarChord === index ? 'on' : ''}
        onPointerDown={() => game.holdGuitarChord(index)} onPointerUp={game.releaseGuitarChord} onPointerCancel={game.releaseGuitarChord}
        onClick={() => game.setGuitarChord(index)}>{index + 1} · {chord.name}</button>)}</div>
      <div className="guitar-strings" role="button" aria-label="划过六根弦扫和弦" tabIndex={0} onPointerDown={onStart} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={() => { swipe.current = null; game.muteGuitar() }}>
        {[0, 1, 2, 3, 4, 5].map(index => <span key={index} className="guitar-string" style={{ '--string': index }}/>)}</div></div>
    <div className="guitar-actions">
      <button onClick={() => game.strumGuitar(false)}>↓ 扫弦 · Space</button>
      <button onClick={() => game.strumGuitar(true)}>↑ 反扫 · Shift+Space</button>
    </div>
    <div className="guitar-actions guitar-picks">{PICK_STRINGS.map((string, index) => <button key={string} onClick={() => game.pluckGuitar(string)}>{['J · 低音', 'K', 'L', '; · 高音'][index]}</button>)}</div>
    <div className="guitar-actions"><button onClick={game.releaseGuitarChord}>✋ 闷音 · M</button></div>
    <div className="guitar-actions">
      <button className={game.recording ? 'rec on' : 'rec'} data-testid="guitar-record" onClick={game.toggleRecording}>{game.recording ? `● REC · ${game.recording.hits.length} notes (Enter)` : '● 录音 (Enter)'}</button>
      <button onClick={game.togglePlayLast} disabled={!game.lastTake && !game.playingTake}>{game.playingTake ? '■ 停止' : `▶ ${game.lastTake ? game.lastTake.name : '暂无录音'}`}</button>
    </div>
    <small>1–8 换和弦 · 空格扫弦 · Shift+空格反扫 · J K L ; 分解 · M 闷音 · Tab 换琴 · 按住和弦键、松开闷音 · 手机反复划弦 · Esc 返回</small>
  </div>
}
