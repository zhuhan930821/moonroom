import { useEffect, useState } from 'react'
import { PADS } from '../audio/takes'
import { DRUM_KEYS } from '../game/useInteractionSystem'

const KEY_LABEL = Object.fromEntries(Object.entries(DRUM_KEYS).filter(([code]) => code.startsWith('Key') || code === 'Semicolon').map(([code, pad]) => [pad, code === 'Semicolon' ? ';' : code.slice(3)]))
const ORDER = ['kick', 'snare', 'hihat', 'hihatOpen', 'tom1', 'tom2', 'floor', 'crash', 'ride']
const LABEL = Object.fromEntries(PADS.map(pad => [pad.id, pad.label]))

function Elapsed({ since }) {
  const [, tick] = useState(0)
  useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 200); return () => clearInterval(timer) }, [])
  const seconds = Math.max(0, (performance.now() - since) / 1000)
  return <>{Math.floor(seconds / 60)}:{String(Math.floor(seconds % 60)).padStart(2, '0')}</>
}

export default function DrumPanel({ game }) {
  const [recordStartedAt, setRecordStartedAt] = useState(0)
  const [flashClock, setFlashClock] = useState(0)
  const [pick, setPick] = useState(game.drumTakes[0]?.id)
  useEffect(() => { if (!game.drumTakes.some(take => take.id === pick)) setPick(game.drumTakes[0]?.id) }, [game.drumTakes, pick])
  useEffect(() => { if (game.recording) setRecordStartedAt(performance.now()) }, [Boolean(game.recording)])
  useEffect(() => { const timer = setInterval(() => setFlashClock(performance.now()), 50); return () => clearInterval(timer) }, [])
  const activePads = new Set((game.hit.events || []).filter(event => flashClock - event.at < 180).map(event => event.name))
  return <div className={`mode-panel drum-panel ${game.challenge ? 'in-challenge' : ''}`} data-testid="drum-controls" data-recording={game.recording ? '1' : '0'} onClick={event => event.stopPropagation()} onMouseDown={event => event.preventDefault() /* keep focus off buttons so Space/keys stay drum controls */}>
    <span>DRUM SESSION</span>
    <div className="pad-keys">{ORDER.map(pad => <button key={pad} className={activePads.has(pad) ? 'hit' : ''} data-pad={pad} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); game.strike(pad) }}><kbd>{KEY_LABEL[pad]}</kbd>{LABEL[pad]}</button>)}</div>
    <div className="transport">
      <button className={game.recording ? 'rec on' : 'rec'} onClick={game.toggleRecording} data-testid="record-toggle">{game.recording ? <>● REC <Elapsed since={recordStartedAt}/> · {game.recording.hits.length} hits</> : '● Record (R)'}</button>
      <button onClick={game.togglePlayLast} disabled={!game.lastTake && !game.playingTake}>{game.playingTake ? '■ Stop' : `▶ ${game.lastTake ? game.lastTake.name : 'No takes yet'} (Space)`}</button>
      <button className={game.metronome ? 'on' : ''} onClick={game.toggleMetronome}>♩ {game.bpm} BPM (M)</button>
      <span className="bpm"><button onClick={() => game.changeBpm(-5)} aria-label="Slower">[</button><button onClick={() => game.changeBpm(5)} aria-label="Faster">]</button></span>
    </div>
    <div className="transport challenge-row">
      {game.drumTakes.length
        ? <><select id="challenge-take" value={pick} onChange={event => setPick(event.target.value)} aria-label="挑战谱面">{game.drumTakes.map(take => <option key={take.id} value={take.id}>{take.name}</option>)}</select>
          <button className="challenge" onClick={() => game.startChallenge(pick)} data-testid="challenge-start">★ 节奏挑战 (G)</button></>
        : <small>录一段鼓之后，就能拿它来玩节奏挑战</small>}
    </div>
    <small>也可以用鼠标点鼓面 · 录音会保存到电脑的 Studio · Esc 离开鼓凳</small>
  </div>
}
