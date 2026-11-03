import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { climbState, pull, slide } from '../game/loft'
import { activity } from '../game/activity'
import { MEMORIES, sasaBand } from '../game/sasaBand'
import { BLINDFOLD_STORY, BREATH, NEEDED, WINDOW, blindfoldProgress, cueTimes, judge } from '../game/blindfold'
import { createRehearsal } from '../audio/blindfold'

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
export function RehearsalPanel({ onClose, onBlindfold }) {
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
    <div className="personal-actions"><button onClick={onBlindfold} data-testid="open-blindfold">闭眼排练</button>{band.discovered && <button onClick={() => setAlbum(0)} data-testid="open-album">翻看相册</button>}<button onClick={onClose}>离开</button></div>
  </section>
}

// ---------- blindfold rehearsal (闭眼排练): listen for Sasa's breath, come in with her ----------
const BF_LINES = { early: '太早了，再等等她', late: '晚了一点', stray: '先听她换气', lock: '合上了' }
export function BlindfoldPanel({ onClose }) {
  const [phase, setPhase] = useState('intro')     // intro | playing | done
  const [locks, setLocks] = useState(0)
  const [flash, setFlash] = useState(null)        // { id, result }
  const [breath, setBreath] = useState(0)         // 0–1, how far into her current breath
  const [page, setPage] = useState(0)
  const take = useRef(null)
  const progress = useRef(blindfoldProgress.get())
  const finish = won => {
    const t = take.current; if (!t) return
    take.current = null
    setTimeout(() => t.audio.stop(), won ? 2600 : 300)
    if (won) { blindfoldProgress.save({ unlocked: true, best: Math.max(progress.current.best, NEEDED) }); progress.current = blindfoldProgress.get(); activity.log('blindfold') }
    setPhase('done')
  }
  const press = () => {
    const t = take.current
    if (!t) return
    const r = judge(t.audio.now(), t.cues, t.used)
    if (r.result === 'lock') { t.used.add(r.cue); t.audio.lock(); t.locks += 1; setLocks(t.locks); if (t.locks >= NEEDED) finish(true) }
    else if (r.cue >= 0) t.used.add(r.cue)
    setFlash({ id: Date.now(), result: r.result })
  }
  const start = async () => {
    const audio = await createRehearsal()
    const cues = cueTimes(audio.now())
    audio.schedule(cues)
    take.current = { audio, cues, used: new Set(), locks: 0 }
    if (new URLSearchParams(location.search).has('capture')) window.__moonroomBlindfold = take // screenshot QA reads the cue times
    setLocks(0); setFlash(null); setPhase('playing')
  }
  useEffect(() => {
    if (phase !== 'playing') return
    let raf
    const tick = () => {
      const t = take.current
      if (!t) return
      const now = t.audio.now()
      const next = t.cues.find((c, i) => !t.used.has(i) && c > now - WINDOW)
      setBreath(next == null ? 0 : Math.max(0, Math.min(1, 1 - (next - now) / BREATH)))
      if (now > t.cues[t.cues.length - 1] + 1.2) { finish(false); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onKey = e => { if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); press() } }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) }
  }, [phase])
  useEffect(() => () => { take.current?.audio.stop(); take.current = null }, [])
  const won = locks >= NEEDED
  if (phase === 'done' && won && page > 0) {
    const s = BLINDFOLD_STORY[page - 1]
    return <section className="personal-panel rehearsal-panel bf-story" data-testid="blindfold-story" onClick={e => e.stopPropagation()}>
      <button className="personal-close" onClick={onClose} aria-label="离开">×</button>
      <span className="eyebrow">同一扇窗 · {page} / {BLINDFOLD_STORY.length}</span><h2>{s.title}</h2>
      <div className="bf-text">{s.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div>
      <div className="personal-actions">{page > 1 && <button onClick={() => setPage(page - 1)}>◀ 上一节</button>}{page < BLINDFOLD_STORY.length ? <button onClick={() => setPage(page + 1)}>下一节 ▶</button> : <button onClick={onClose}>合上本子</button>}</div>
    </section>
  }
  return <div className={`blindfold ${phase}`} data-testid="blindfold" onPointerDown={e => { if (phase === 'playing' && !e.target.closest('button')) { e.preventDefault(); press() } }} style={{ '--breath': breath }}>
    <div className="bf-dark"/>
    <div className="bf-lights">{['#ff8fc8', '#ffb36b', '#a9c8ff'].map((c, i) => <i key={i} style={{ '--c': c, '--on': i < locks ? 1 : 0 }}/>)}</div>
    {phase === 'intro' && <div className="bf-card">
      <span>闭眼排练</span>
      <p>沈聿递来一条淡紫色的丝巾：「蒙上。今天不准看。」</p>
      <p className="bf-how">黑暗里，林澈在弹 F、G、F。每次 Sasa 开口之前，你会听到她吸一口气。<br/>在她<b>开口唱的那一刻</b>按下：空格 / 点屏幕。合上三次。<br/><small>建议戴耳机，把声音开大一点。</small></p>
      <div className="bf-actions"><button onClick={start} data-testid="blindfold-start">蒙上眼睛</button>{progress.current.unlocked && <button onClick={() => { setLocks(NEEDED); setPhase('done'); setPage(1) }}>读那一章</button>}<button onClick={onClose}>算了</button></div>
    </div>}
    {phase === 'playing' && <>
      {flash && <div key={flash.id} className={`bf-flash ${flash.result}`}>{BF_LINES[flash.result]}</div>}
      <div className="bf-hint">听她换气 · 空格 / 点屏幕 · {locks} / {NEEDED}</div>
      <button className="bf-quit" onClick={() => { take.current?.audio.stop(); take.current = null; onClose() }}>摘下丝巾</button>
    </>}
    {phase === 'done' && <div className="bf-card">
      {won ? <><span>锁住了</span><p>三个人在同一个瞬间停住，又在同一个瞬间落下。谁都不想先把丝巾摘下来。</p>
        <div className="bf-actions"><button onClick={() => setPage(1)} data-testid="blindfold-read">读《同一扇窗》</button><button onClick={onClose}>摘下丝巾</button></div></>
        : <><span>还没合上</span><p>{locks ? `合上了 ${locks} 次。` : ''}再听一次她换气的声音，等她，而不是等拍子。</p>
        <div className="bf-actions"><button onClick={start}>再来一次</button><button onClick={onClose}>摘下丝巾</button></div></>}
    </div>}
  </div>
}
