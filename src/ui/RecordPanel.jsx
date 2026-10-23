import { recordColor } from '../scene/RecordPlayer'
import { beatLength, takeLength } from '../audio/takes'

export default function RecordPanel({ game }) {
  const bars = take => Math.round(takeLength(take) / (4 * beatLength(take.bpm)))
  return <div className="mode-panel record-panel" data-testid="record-controls" onClick={event => event.stopPropagation()}>
    <span>RECORD CRATE</span>
    {game.records.length === 0
      ? <p className="record-empty">唱片箱还是空的。<br/>在电脑的 Studio 里打开一个工程，点「压成唱片」。</p>
      : <div className="record-list">{game.records.map(take => <button key={take.id} className={game.vinyl?.id === take.id ? 'on' : ''}
          onClick={() => game.vinyl?.id === take.id ? game.stopVinyl() : game.playVinyl(take.id)}>
          <i style={{ background: `#${recordColor(take.id).getHexString()}` }}/>
          <strong>{take.name}</strong><small>{take.bpm} BPM · {bars(take)} 小节</small>
          <em>{game.vinyl?.id === take.id ? '■ 停止' : '▶ 播放'}</em>
        </button>)}</div>}
    <small>唱片会一直循环播放，走开也不会停 · Esc 离开</small>
  </div>
}
