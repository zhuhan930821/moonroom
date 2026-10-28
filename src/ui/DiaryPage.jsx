import { useEffect, useMemo } from 'react'
import { activity, dayKey } from '../game/activity'
import { diaryPages } from './diaryWriter'

// Bookshelf diary: pages the room wrote about your days (newest first), then the authored ones.
export const currentDiaryPages = () => diaryPages(activity.get(), dayKey())

export default function DiaryPage({ book, onNext, onClose }) {
  const pages = useMemo(currentDiaryPages, [book.page])
  const entry = pages[book.page % pages.length]
  // Reading the newest finished day clears the "new page" hint.
  useEffect(() => { if (entry.fresh) activity.markSeen(entry.key) }, [entry])
  return <div className="diary-page" data-testid="diary-page" onClick={event => event.stopPropagation()} style={{ '--cover': '#5c365c' }}>
    <div className="diary-date">{entry.date}{entry.today && <em className="diary-tag">今天 · 还没写完</em>}{entry.fresh && <em className="diary-tag new">新的一页</em>}</div>
    <p>{entry.text}</p>
    <div className="diary-actions"><button onClick={onNext}>翻到下一页 (E)</button><button onClick={onClose}>放回去 (Esc)</button></div>
  </div>
}
