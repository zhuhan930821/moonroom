import { useState, useSyncExternalStore } from 'react'
import { personalSpace } from '../game/personalSpace'

const DREAMS = [
  ['月亮河', '你沿着发光的河岸走，水面倒映着第二轮月亮。远处的城堡亮起一扇窗，像在等你。'],
  ['云上的列车', '一列金色小火车缓缓穿过云海。车票上只写着：去一个想念的地方。'],
  ['狐狸的秘密', '小狐狸把一颗星星藏进你的手心。醒来后，掌心还留着温暖。'],
  ['没有尽头的花园', '藤蔓垂下柔软的影子。每一朵花都记得你说过的一句好话。'],
]

export function BedDreamPanel({ onClose }) {
  const space = useSyncExternalStore(personalSpace.subscribe, personalSpace.get)
  const [current, setCurrent] = useState(null)
  const dream = () => {
    const index = Math.floor(Math.random() * DREAMS.length)
    const entry = { title: DREAMS[index][0], text: DREAMS[index][1], date: new Date().toLocaleDateString('zh-CN') }
    setCurrent(entry)
    personalSpace.update({ dreams: [entry, ...personalSpace.get().dreams].slice(0, 20) })
  }
  return <section className="personal-panel dream-panel" data-testid="dream-panel">
    <button className="personal-close" onClick={onClose} aria-label="起床">×</button>
    <span className="eyebrow">MOON NEST</span><h2>在月光里休息</h2>
    <p>{current ? current.text : '闭上眼睛，听一会儿房间与云海的声音。'}</p>
    {current && <small>✦ {current.title}</small>}
    <div className="personal-actions"><button onClick={dream}>做一个梦</button><button onClick={onClose}>起床</button></div>
    {space.dreams.length > 0 && <small>已记住 {space.dreams.length} 个梦 · 仅保存在这台浏览器</small>}
  </section>
}

export function ChairNotePanel({ onClose }) {
  const space = useSyncExternalStore(personalSpace.subscribe, personalSpace.get)
  const [draft, setDraft] = useState(space.note)
  const [saved, setSaved] = useState(false)
  return <section className="personal-panel note-panel" data-testid="chair-panel">
    <button className="personal-close" onClick={onClose} aria-label="起身">×</button>
    <span className="eyebrow">DESK NOOK</span><h2>坐下来，写点什么</h2>
    <textarea aria-label="私人笔记" value={draft} maxLength={2000} onChange={e => { setDraft(e.target.value); setSaved(false) }} placeholder="今天的月光让你想起了什么？"/>
    <div className="personal-actions"><button onClick={() => setSaved(personalSpace.update({ note: draft }))}>保存笔记</button><button onClick={onClose}>起身</button></div>
    <small>{saved ? '已保存在这台浏览器' : '私人笔记不会上传'} · {draft.length}/2000</small>
  </section>
}
