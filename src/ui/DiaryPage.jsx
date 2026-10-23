import { DIARY } from './diary'
import { BOOK_COLORS } from '../scene/Furniture'

export default function DiaryPage({ book, onNext, onClose }) {
  const entry = DIARY[book.page]
  return <div className="diary-page" data-testid="diary-page" onClick={event => event.stopPropagation()} style={{ '--cover': BOOK_COLORS[book.index % 4] }}>
    <div className="diary-date">{entry.date}</div>
    <p>{entry.text}</p>
    <div className="diary-actions"><button onClick={onNext}>再抽一本 (E)</button><button onClick={onClose}>放回去 (Esc)</button></div>
  </div>
}
