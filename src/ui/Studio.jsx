import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { PADS, PIANO, beatLength, makeTake, noteName, quantize, takeLength, takeStore, toggleStep } from '../audio/takes'
import { playTake, playDrum, playPiano, renderTakeWav } from '../audio/drums'
import { isBlackKey } from '../game/pianoKeys'
import { midiToTake, takeToMidi } from '../audio/midi'
import { mugoOutbox } from '../game/mugoBridge'
import { celebrate } from '../game/celebrate'

const STEPS_PER_BEAT = 4 // grid resolution: 1/16 notes

// Which lanes a project shows: drum lanes when it has drums (or is a drum project), and
// piano rows spanning the notes used (at least two octaves, C3–C5 for an empty piano project).
function lanesFor(take) {
  const piano = take.events.filter(event => event.pad === PIANO)
  const hasDrums = take.events.some(event => event.pad !== PIANO)
  const showPiano = piano.length > 0 || take.kind === 'piano'
  const showDrums = hasDrums || !showPiano
  let rows = []
  if (showPiano) {
    const notes = piano.map(event => event.note)
    let low = Math.min(48, ...notes), high = Math.max(72, ...notes)
    if (notes.length) { low = Math.min(...notes) - 3; high = Math.max(...notes) + 3; while (high - low < 24) { low--; high++ } }
    for (let note = high; note >= low; note--) rows.push({ id: `n${note}`, pad: PIANO, note, label: noteName(note), black: isBlackKey(note) })
  }
  return [...(showDrums ? PADS.map(pad => ({ id: pad.id, pad: pad.id, label: pad.label })) : []), ...rows]
}

// CRT "Studio": opens takes recorded at the drum kit as editable music projects.
export default function Studio({ onHit, onOpenInMugo }) {
  const takes = useSyncExternalStore(takeStore.subscribe, takeStore.getAll)
  const [selectedId, setSelectedId] = useState(() => takes[0]?.id || null)
  const take = takes.find(item => item.id === selectedId) || takes[0] || null
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const playheadRef = useRef(null)
  // Playhead moves via the DOM, not React state, so playback doesn't re-render the grid each frame.
  const setPosition = value => { if (playheadRef.current) playheadRef.current.style.left = `calc(var(--label) + (100% - var(--label)) * ${value})` }
  const [busy, setBusy] = useState('')
  const stopRef = useRef(null)

  const stop = () => { stopRef.current?.(); stopRef.current = null; setPlaying(false); setPosition(0) }
  useEffect(() => stop, [])
  useEffect(() => { stop() }, [take?.id])

  const start = async current => {
    setPlaying(true)
    const stopper = await playTake(current, { loop, onHit, onPosition: setPosition, onEnd: () => { stopRef.current = null; setPlaying(false); setPosition(0) } })
    stopRef.current = stopper
  }
  const play = () => {
    if (stopRef.current) return stop()
    if (take?.events.length) start(take)
  }
  const edit = patch => takeStore.update(take.id, patch)
  // Edits (and loop toggles) restart a running take so you hear the change immediately.
  const playingTakeRef = useRef(take)
  useEffect(() => {
    const previous = playingTakeRef.current
    playingTakeRef.current = take
    if (!stopRef.current || previous?.id !== take?.id) return
    stopRef.current(); stopRef.current = null
    if (take.events.length) start(take); else { setPlaying(false); setPosition(0) }
  }, [take, loop])

  const newProject = kind => {
    const created = takeStore.add({ ...makeTake({ name: `${kind === 'piano' ? 'Piano' : 'Drums'} ${takes.length + 1}`, bpm: 90, bars: 2 }), kind })
    setSelectedId(created.id)
  }
  const download = (blob, extension) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${take.name.replace(/[^\w\- \u4e00-\u9fa5]+/g, '').trim() || 'moonroom-take'}.${extension}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 5000)
  }
  const [notice, setNotice] = useState('')
  const exportMidi = () => { download(new Blob([takeToMidi(take)], { type: 'audio/midi' }), 'mid'); setNotice('已导出 MIDI。在 Mugo 的「乐谱库 → 导入 MIDI 文件…」里打开它。') }
  const importMidi = async file => {
    try {
      const created = takeStore.add(midiToTake(await file.arrayBuffer(), file.name.replace(/\.(mid|midi)$/i, '')))
      setSelectedId(created.id)
      setNotice(`已导入「${created.name}」：${created.events.length} 个音符，${created.bpm} BPM。`)
    } catch (error) { setNotice(error.message || '无法读取这个 MIDI 文件。') }
  }
  const exportWav = async () => {
    setBusy('Rendering…')
    try {
      download(await renderTakeWav(take), 'wav')
    } finally { setBusy('') }
  }

  return <section className="desktop-window studio" role="dialog" aria-label="Studio" data-testid="studio-window"
    onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) importMidi(file) }}>
    <aside className="studio-list">
      <div className="studio-new"><button className="win-button" onClick={() => newProject('drums')}>+ Drums</button><button className="win-button" onClick={() => newProject('piano')}>+ Piano</button></div>
      <label className="win-button studio-import">⤒ 导入 MIDI<input id="studio-midi" type="file" accept=".mid,.midi,audio/midi" onChange={event => { const file = event.target.files[0]; if (file) importMidi(file); event.target.value = '' }}/></label>
      {notice && <p className="studio-notice" role="status">{notice}</p>}
      {takes.length === 0 && <p className="studio-empty">还没有工程。<br/>坐到鼓凳按 R 录一段，或点上面新建。</p>}
      {takes.map(item => <button key={item.id} className={`studio-item ${item.id === take?.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}>
        <strong>{item.name}</strong><small>{item.bpm} BPM · {Math.round(takeLength(item) / (4 * beatLength(item.bpm)))} bars · {item.events.length} hits</small>
      </button>)}
    </aside>
    {take ? <ProjectView key={take.id} take={take} playing={playing} playheadRef={playheadRef} loop={loop} busy={busy}
      onPlay={play} onLoop={() => setLoop(value => !value)} onEdit={edit} onExport={exportWav} onExportMidi={exportMidi} onOpenInMugo={() => { mugoOutbox.put(take); onOpenInMugo?.() }}
      onDelete={() => { stop(); takeStore.remove(take.id); setSelectedId(null) }}/>
      : <div className="studio-main studio-empty">选择或新建一个工程</div>}
  </section>
}

function ProjectView({ take, playing, playheadRef, loop, busy, onPlay, onLoop, onEdit, onExport, onExportMidi, onOpenInMugo, onDelete }) {
  const length = takeLength(take)
  const step = beatLength(take.bpm) / STEPS_PER_BEAT
  const steps = Math.round(length / step)
  const bars = Math.round(length / (4 * beatLength(take.bpm)))
  const [name, setName] = useState(take.name)

  const lanes = useMemo(() => lanesFor(take), [take])
  const audition = lane => lane.pad === PIANO ? playPiano(lane.note).then(voice => setTimeout(voice.release, 350)) : playDrum(lane.pad)
  const onGridClick = (lane, event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const index = Math.min(steps - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * steps)))
    const next = toggleStep(take, lane.pad, index, STEPS_PER_BEAT, lane.note)
    if (next.events.length > take.events.length) audition(lane)
    onEdit({ events: next.events })
  }
  // Changing tempo keeps the musical position of every hit (times scale with the beat).
  const setBpm = bpm => {
    bpm = Math.max(50, Math.min(180, Math.round(bpm) || take.bpm))
    const scale = take.bpm / bpm
    onEdit({ bpm, events: take.events.map(event => ({ ...event, t: event.t * scale })), original: undefined })
  }

  return <div className="studio-main">
    <div className="studio-toolbar">
      <input className="studio-name" value={name} onChange={event => setName(event.target.value)} onBlur={() => onEdit({ name: name.trim() || take.name })} aria-label="Project name"/>
      <label>BPM <input type="number" min="50" max="180" value={take.bpm} onChange={event => setBpm(Number(event.target.value))}/></label>
      <label>Bars <input type="number" min="1" max="16" value={bars} onChange={event => onEdit({ bars: Math.max(1, Math.min(16, Number(event.target.value) || 1)) })}/></label>
    </div>
    <div className="studio-toolbar">
      <button className="win-button" onClick={onPlay} disabled={!take.events.length} data-testid="studio-play">{playing ? '■ Stop' : '▶ Play'}</button>
      <button className={`win-button ${loop ? 'pressed' : ''}`} onClick={onLoop}>⟳ Loop</button>
      <button className="win-button" onClick={() => onEdit(quantize(take, STEPS_PER_BEAT))} disabled={!take.events.length}>Quantize 1/16</button>
      {take.original && <button className="win-button" onClick={() => onEdit({ events: take.original, original: undefined })}>Undo quantize</button>}
      <button className="win-button" onClick={onExport} disabled={!take.events.length || Boolean(busy)}>{busy || '⤓ Export WAV'}</button>
      <button className="win-button" onClick={onOpenInMugo} disabled={!take.events.length} data-testid="studio-open-mugo">↗ 在 Mugo 打开</button>
      <button className="win-button" onClick={onExportMidi} disabled={!take.events.length} data-testid="studio-midi-export">⤓ MIDI</button>
      <button className={`win-button ${take.pressed ? 'pressed' : ''}`} onClick={() => { if (!take.pressed) celebrate(`《${take.name}》压成了唱片`); onEdit({ pressed: !take.pressed }) }} disabled={!take.events.length} data-testid="studio-press">{take.pressed ? '◉ 已压成唱片' : '◎ 压成唱片'}</button>
      <button className="win-button danger" onClick={onDelete}>Delete</button>
    </div>
    <div className="studio-grid" style={{ '--steps': steps, '--beats': steps / STEPS_PER_BEAT, '--bars': bars }}>
      {lanes.map(lane => <div key={lane.id} className={`studio-lane ${lane.pad === PIANO ? 'piano' : ''} ${lane.black ? 'black' : ''} ${lane.note % 12 === 0 ? 'c' : ''}`}>
        <span className="lane-label" onClick={() => audition(lane)}>{lane.label}</span>
        <div className="lane-track" onClick={event => onGridClick(lane, event)}>
          {take.events.filter(event => event.pad === lane.pad && event.note === lane.note).map((event, i) =>
            <b key={i} style={{ left: `${event.t / length * 100}%`, width: `${Math.max(event.d || 0, step) / length * 100}%` }}/>)}
        </div>
      </div>)}
      <div ref={playheadRef} className="playhead" style={{ display: playing ? 'block' : 'none', left: 'var(--label)' }}/>
    </div>
    <small className="studio-hint">点格子添加或删除鼓点 · 点左侧名字试听 · 播放时房间里的鼓也会跟着动</small>
  </div>
}
