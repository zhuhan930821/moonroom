import { useEffect, useRef, useState } from 'react'
import { grade, judge, startRun, sweep, WINDOW } from '../game/rhythm'

// Lanes follow keyboard columns (Y/H, U/J, I/K, O/L, ;) so screen position matches the hand.
const LANE_ORDER = ['crash', 'ride', 'tom1', 'kick', 'tom2', 'snare', 'floor', 'hihat', 'hihatOpen']
const KEY = { crash: 'Y', ride: 'H', tom1: 'U', kick: 'J', tom2: 'I', snare: 'K', floor: 'O', hihat: 'L', hihatOpen: ';' }
const COLOR = { kick: '#ffb36a', snare: '#f49ac1', hihat: '#a9e4ff', hihatOpen: '#c9b8ff', tom1: '#ffd58a', tom2: '#ffc48a', floor: '#f6a37a', crash: '#fff0b8', ride: '#d8f0ff' }
const APPROACH = 1.7 // seconds a note takes to fall from the moon to the hit line
const now = () => performance.now() / 1000

export default function RhythmOverlay({ challenge, subscribeStrikes, onRetry, onClose }) {
  const canvas = useRef(null)
  const run = useRef(null)
  const effects = useRef([])
  const [hud, setHud] = useState({ score: 0, combo: 0, last: '' })
  const [result, setResult] = useState(null)

  useEffect(() => {
    run.current = startRun(challenge.take, challenge.startAt)
    effects.current = []
    setResult(null); setHud({ score: 0, combo: 0, last: '' })
    const lanes = LANE_ORDER.filter(pad => run.current.notes.some(note => note.pad === pad))
    const unsubscribe = subscribeStrikes((pad, at) => {
      const outcome = judge(run.current, pad, at)
      if (outcome.result === 'stray') return
      effects.current.push({ pad, kind: outcome.result, at: now() })
      setHud({ score: Math.round(run.current.score), combo: run.current.combo, last: outcome.result })
    })
    let frame
    const draw = () => {
      const el = canvas.current
      if (!el) return
      const ctx = el.getContext('2d'), w = el.width = el.clientWidth * devicePixelRatio, h = el.height = el.clientHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      const W = el.clientWidth, H = el.clientHeight, hitY = H - 64, laneW = W / lanes.length, t = now()
      for (const missed of sweep(run.current, t)) { effects.current.push({ pad: missed.pad, kind: 'miss', at: t }); setHud(old => ({ ...old, combo: 0, last: 'miss' })) }
      // River lanes: dark to moonlit toward the hit line.
      lanes.forEach((pad, i) => {
        const x = i * laneW
        const g = ctx.createLinearGradient(0, 0, 0, hitY)
        g.addColorStop(0, 'rgba(120,200,230,0)'); g.addColorStop(1, 'rgba(120,200,230,.16)')
        ctx.fillStyle = g; ctx.fillRect(x + 3, 0, laneW - 6, hitY + 20)
        ctx.fillStyle = 'rgba(255,240,220,.85)'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'
        ctx.fillText(KEY[pad], x + laneW / 2, H - 22)
      })
      ctx.strokeStyle = 'rgba(255,230,200,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hitY); ctx.lineTo(W, hitY); ctx.stroke()
      // Count-in numbers.
      const toStart = challenge.startAt - t
      if (toStart > 0) { ctx.fillStyle = 'rgba(255,240,220,.9)'; ctx.font = '600 54px Georgia'; ctx.fillText(String(Math.ceil(toStart / (60 / challenge.take.bpm))), W / 2, H * .42) }
      for (const note of run.current.notes) {
        if (note.result === 'perfect' || note.result === 'good') continue
        const y = hitY - (note.t - t) / APPROACH * hitY
        if (y < -20 || y > H) continue
        const x = (lanes.indexOf(note.pad) + .5) * laneW
        ctx.globalAlpha = note.result === 'miss' ? .25 : 1
        ctx.fillStyle = COLOR[note.pad]; ctx.shadowColor = COLOR[note.pad]; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.ellipse(x, y, laneW * .32, 7, 0, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
      }
      // Hit effects: stars for perfect, a ring for good, a dim flash for a miss.
      effects.current = effects.current.filter(effect => t - effect.at < .6)
      for (const effect of effects.current) {
        const k = (t - effect.at) / .6, x = (lanes.indexOf(effect.pad) + .5) * laneW
        ctx.globalAlpha = 1 - k
        if (effect.kind === 'perfect') {
          ctx.fillStyle = '#fff3c4'
          for (let s = 0; s < 6; s++) { const a = s / 6 * Math.PI * 2 + effect.at; star(ctx, x + Math.cos(a) * k * 46, hitY + Math.sin(a) * k * 46, 6 * (1 - k) + 2) }
        } else if (effect.kind === 'good') {
          ctx.strokeStyle = '#ffd3a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, hitY, 10 + k * 26, 0, Math.PI * 2); ctx.stroke()
        } else { ctx.fillStyle = 'rgba(120,90,140,.6)'; ctx.fillRect(x - laneW / 2 + 3, hitY - 8, laneW - 6, 16) }
        ctx.globalAlpha = 1
      }
      if (t > run.current.end) { setResult({ ...grade(run.current), counts: { ...run.current.counts }, maxCombo: run.current.maxCombo, score: Math.round(run.current.score) }); return }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); unsubscribe() }
  }, [challenge, subscribeStrikes])

  return <div className="rhythm" data-testid="rhythm-overlay" onClick={event => event.stopPropagation()}>
    <div className="rhythm-head"><strong>{challenge.take.name}</strong><span>{hud.score.toLocaleString()}</span><em className={hud.last}>{hud.combo > 1 ? `${hud.combo} combo` : hud.last}</em></div>
    <canvas ref={canvas}/>
    {result && <div className="rhythm-result" data-testid="rhythm-result">
      <div className="stars">{'★'.repeat(result.stars)}<span>{'★'.repeat(3 - result.stars)}</span></div>
      <dl><dt>准确率</dt><dd>{Math.round(result.accuracy * 100)}%</dd><dt>最高连击</dt><dd>{result.maxCombo}</dd>
        <dt>Perfect / Good / Miss</dt><dd>{result.counts.perfect} / {result.counts.good} / {result.counts.miss}</dd></dl>
      <div className="rhythm-actions"><button onClick={onRetry}>再来一次 (G)</button><button onClick={onClose}>结束</button></div>
    </div>}
  </div>
}

function star(ctx, x, y, r) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
  ctx.closePath(); ctx.fill()
}
