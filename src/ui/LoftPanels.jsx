import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { climbState, pull, slide } from '../game/loft'
import { activity } from '../game/activity'
import { MEMORIES, sasaBand } from '../game/sasaBand'

// ---------- rope climb: alternate left / right hands ----------
const LEFT = ['KeyA', 'ArrowLeft', 'KeyJ'], RIGHT = ['KeyD', 'ArrowRight', 'KeyK']
export function ClimbPanel({ onArrive, onClose }) {
  const [view, setView] = useState(climbState.current)
  const [lastHand, setLastHand] = useState(null)
  const done = useRef(false)
  const grab = hand => {
    if (done.current) return
    climbState.current = pull(climbState.current, hand, performance.now() / 1000)
    setLastHand(hand); setView(climbState.current)
    if (climbState.current.progress >= 1) { done.current = true; setTimeout(onArrive, 350) }
  }
  useEffect(() => {
    let raf, last = performance.now()
    const tick = now => {
      climbState.current = slide(climbState.current, now / 1000, Math.min(.1, (now - last) / 1000)); last = now // clamp: a stalled frame must not dump you to the floor
      setView(climbState.current); raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onKey = event => {
      if (event.repeat) return
      if (LEFT.includes(event.code)) { event.preventDefault(); grab('left') }
      else if (RIGHT.includes(event.code)) { event.preventDefault(); grab('right') }
    }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) }
  }, [])
  const percent = Math.round(view.progress * 100)
  return <div className="climb-panel" data-testid="climb-panel" onClick={e => e.stopPropagation()}>
    <div className="climb-meter"><i style={{ height: `${percent}%` }}/><b>{percent}%</b></div>
    <div className="climb-body">
      <span>CLIMB THE ROPE</span>
      <p>{view.note || (view.progress < .05 ? '左右手交替，一下一下往上拉' : view.progress > .8 ? '快到了！' : '保持节奏…')}</p>
      <div className="climb-hands">
        <button className={lastHand === 'left' ? 'last' : ''} onPointerDown={e => { e.preventDefault(); grab('left') }} data-testid="climb-left">左手<small>A / ←</small></button>
        <button className={lastHand === 'right' ? 'last' : ''} onPointerDown={e => { e.preventDefault(); grab('right') }} data-testid="climb-right">右手<small>D / →</small></button>
      </div>
      <small>同一只手连拉会打滑 · 太急也拉不动 · 停下会慢慢滑下去 · <button className="climb-exit" onClick={onClose}>松手下去 (Esc)</button></small>
    </div>
  </div>
}

// ---------- telescope: a round lens view; catch a falling star to make a wish ----------
export function TelescopeView({ onClose }) {
  const [streak, setStreak] = useState(null)   // { id, x, y, angle }
  const [wished, setWished] = useState(null)
  const live = useRef(null)
  useEffect(() => {
    let timer
    const next = () => {
      timer = setTimeout(() => {
        const s = { id: Date.now(), x: 25 + Math.random() * 40, y: 22 + Math.random() * 30, angle: 18 + Math.random() * 22 }
        live.current = s; setStreak(s)
        setTimeout(() => { if (live.current === s) { live.current = null; setStreak(null) } }, 1700)
        next()
      }, 3500 + Math.random() * 5000)
    }
    next()
    const onDown = event => {
      if (!live.current || event.target.closest?.('button')) return
      live.current = null; setStreak(null)
      activity.log('wish')
      setWished({ id: Date.now() })
    }
    window.addEventListener('pointerdown', onDown)
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', onDown) }
  }, [])
  return <div className="telescope-view" data-testid="telescope-view">
    <div className="telescope-lens">{streak && <i key={streak.id} className="telescope-streak" style={{ left: `${streak.x}%`, top: `${streak.y}%`, '--a': `${streak.angle}deg` }}/>}</div>
    <div className="telescope-hint">{streak ? '✦ 流星！快点一下许愿' : wished ? '✦ 愿望收进了日记' : '拖动慢慢找 · 等一颗流星划过'}</div>
    <button className="telescope-exit" onClick={onClose}>离开望远镜 · E</button>
  </div>
}

// ---------- stargazing under the skylight ----------
const SKY_LINES = ['天窗外的星星一颗一颗亮起来，像有人在慢慢点灯。', '一颗流星划过去了。你想到的第一件事，就是愿望。', '云从天窗边上飘过，月光变成了淡淡的蓝色。', '听得见楼下的钢琴声，很轻，像在梦里。']
export function StargazePanel({ onClose }) {
  const [line, setLine] = useState(0)
  const [wish, setWish] = useState(false)
  useEffect(() => { const t = setInterval(() => setLine(i => (i + 1) % SKY_LINES.length), 7000); return () => clearInterval(t) }, [])
  return <section className="personal-panel dream-panel stargaze-panel" data-testid="stargaze-panel" onClick={e => e.stopPropagation()}>
    <button className="personal-close" onClick={onClose} aria-label="起来">×</button>
    <span className="eyebrow">STARGAZING</span><h2>躺在星星下面</h2>
    <p>{wish ? '愿望已经交给流星了。它会记得的。' : SKY_LINES[line]}</p>
    <div className="personal-actions"><button onClick={() => { setWish(true); activity.log('wish') }}>对流星许个愿</button><button onClick={onClose}>起来</button></div>
    <small>拖动可以看看四周</small>
  </section>
}

// ---------- the band's rehearsal corner ----------
export function RehearsalPanel({ onClose }) {
  const band = useSyncExternalStore(sasaBand.subscribe, sasaBand.get)
  const [album, setAlbum] = useState(null) // index of the photo being looked at
  if (album != null) {
    const m = MEMORIES[album], go = d => setAlbum((album + d + MEMORIES.length) % MEMORIES.length)
    return <section className="personal-panel rehearsal-panel album" data-testid="band-album" onClick={e => e.stopPropagation()}>
      <button className="personal-close" onClick={() => setAlbum(null)} aria-label="合上相册">×</button>
      <span className="eyebrow">BAND ALBUM · {album + 1} / {MEMORIES.length}</span>
      <img className="album-photo" src={m.image} alt={m.caption}/>
      <p>{m.caption}</p>
      <div className="personal-actions"><button onClick={() => go(-1)}>◀ 上一张</button><button onClick={() => go(1)}>下一张 ▶</button><button onClick={() => setAlbum(null)}>合上</button></div>
    </section>
  }
  return <section className="personal-panel rehearsal-panel" data-testid="rehearsal-panel" onClick={e => e.stopPropagation()}>
    <button className="personal-close" onClick={onClose} aria-label="离开">×</button>
    <span className="eyebrow">BAND ROOM</span><h2>阁楼排练间</h2>
    <ol className="setlist">
      <li>月亮河 <small>Sasa · 鼓起</small></li>
      <li>你没说出口的那部分 <small>沈聿 · 慢一点</small></li>
      <li>星星掉进咖啡里 <small>林澈 · 副歌换和弦？</small></li>
      <li>（还没有名字） <small>明天再写</small></li>
    </ol>
    <p>{!band.discovered ? '软木板角落贴着一张便签：「想见我们的话，打出她的名字。— S」'
      : band.on ? '他们都在。说话声、调音声，还有人在偷偷哼你刚才弹的那段。'
      : '今天这里很安静。设置里可以叫他们来。'}</p>
    <div className="personal-actions">{band.discovered && <button onClick={() => setAlbum(0)} data-testid="open-album">翻看相册</button>}<button onClick={onClose}>离开</button></div>
  </section>
}
