import { DIARY } from './diary'

export default function DiaryPage({ book, onNext, onClose }) {
  const entry = DIARY[book.page]
  return <div className="diary-page" data-testid="diary-page" onClick={event => event.stopPropagation()} style={{ '--cover': '#5c365c' }}>
    <div className="diary-date">{entry.date}</div>
    <p>{entry.text}</p>
    <div className="diary-actions"><button onClick={onNext}>翻到下一页 (E)</button><button onClick={onClose}>放回去 (Esc)</button></div>
  </div>
}
