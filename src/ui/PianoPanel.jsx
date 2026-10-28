import { noteName } from '../audio/takes'
import { useSyncExternalStore } from 'react'
import { journey } from '../game/journey'

export default function PianoPanel({ game }) {
  const voyage = useSyncExternalStore(journey.subscribe, journey.get)
  const held = [...game.pianoNotes].sort((a, b) => a - b).map(noteName).join(' ')
  return <div className="mode-panel drum-panel piano-panel" data-testid="piano-controls" data-recording={game.recording ? '1' : '0'}
    onClick={event => event.stopPropagation()} onMouseDown={event => event.preventDefault() /* keep keys as notes, not button focus */}>
    <span>PIANO · {noteName(game.pianoBase)}–{noteName(game.pianoBase + 28)}</span>
    {voyage.phase === 'ticket' && <div className="voyage-piano-prompt">月亮河车票正在等待琴声 · {voyage.notes}/3</div>}
    <div className="piano-rows">
      <div><kbd>Z</kbd>…<kbd>/</kbd> 下排从 {noteName(game.pianoBase)}　<kbd>Q</kbd>…<kbd>P</kbd> 上排从 {noteName(game.pianoBase + 12)}　黑键在 <kbd>S</kbd><kbd>D</kbd> / <kbd>2</kbd><kbd>3</kbd> 行</div>
      <div className="held">{held || '也可以用鼠标按琴键'}</div>
    </div>
    <div className="transport">
      <button className={game.recording ? 'rec on' : 'rec'} onClick={game.toggleRecording} data-testid="piano-record">{game.recording ? `● REC · ${game.recording.hits.length} notes (Enter)` : '● Record (Enter)'}</button>
      <button onClick={game.togglePlayLast} disabled={!game.lastTake && !game.playingTake}>{game.playingTake ? '■ Stop' : `▶ ${game.lastTake ? game.lastTake.name : 'No takes yet'} (Space)`}</button>
      <button className={game.metronome ? 'on' : ''} onClick={game.toggleMetronome}>♩ {game.bpm} BPM (\)</button>
      {game.milo.visiting && <button className={game.milo.jam ? 'on' : ''} onClick={game.toggleMiloJam} data-testid="milo-jam">🥁 Milo 伴奏 {game.milo.jam ? '开' : '关'}</button>}
      <span className="bpm"><button onClick={() => game.shiftOctave(-1)} aria-label="Octave down">− 8va</button><button onClick={() => game.shiftOctave(1)} aria-label="Octave up">+ 8va</button></span>
    </div>
    <small>- / = 换八度 · [ ] 调速度 · 录音会保存到电脑的 Studio · Esc 离开</small>
  </div>
}
