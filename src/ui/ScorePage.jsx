const SCORES = [
  { title: '月亮河', subtitle: '给窗外的光 · Andante, 4/4', cover: '#6a5b91', notes: [0,2,4,2,1,0,-1,0,2,4,5,4,2,1,0,0] },
  { title: '云上的城堡', subtitle: '夜间练习曲 · Moderato, 4/4', cover: '#a06d88', notes: [4,5,7,5,4,2,1,2,4,2,0,1,2,4,2,0] },
  { title: '狐狸睡着以后', subtitle: '一首安静的小曲 · Lento, 4/4', cover: '#b39865', notes: [2,1,0,-1,0,2,1,0,-1,-2,-1,0,2,1,0,0] },
]

function Staff({ notes }) {
  const top = 32
  return <svg className="score-staff" viewBox="0 0 620 116" role="img" aria-label="四小节高音谱，十六个四分音符">
    {[0,1,2,3,4].map(i => <line key={i} x1="36" x2="602" y1={top+i*13} y2={top+i*13} stroke="#756578" strokeWidth="1"/>)}
    <text x="37" y="84" fontSize="65" fill="#4d3a56">𝄞</text>
    <text x="96" y="58" fontSize="18" fill="#4d3a56">4</text><text x="96" y="81" fontSize="18" fill="#4d3a56">4</text>
    {notes.map((step, i) => {
      const x = 128 + i*29.2 + Math.floor(i/4)*5
      const y = 84 - step*6.5
      return <g key={i}>
        <ellipse cx={x} cy={y} rx="6.3" ry="4.3" transform={`rotate(-21 ${x} ${y})`} fill="#503c58"/>
        <line x1={x+5.4} x2={x+5.4} y1={y-1} y2={y-36} stroke="#503c58" strokeWidth="1.6"/>
      </g>
    })}
    {[0,1,2,3].map(i => <line key={i} x1={240+i*122} x2={240+i*122} y1="31" y2="85" stroke="#756578" strokeWidth="1.2"/>)}
  </svg>
}

export default function ScorePage({ page, onNext, onClose }) {
  const score = SCORES[page % SCORES.length]
  return <section className="score-page" data-testid="score-page" onClick={event => event.stopPropagation()} style={{ '--score-cover': score.cover }} aria-label={`${score.title} 乐谱`}>
    <div className="score-spine" aria-hidden="true"/>
    <div className="score-paper">
      <small>MOONROOM · MUSIC LIBRARY　/　{page + 1} OF {SCORES.length}</small>
      <h2>{score.title}</h2>
      <p>{score.subtitle}</p>
      <Staff notes={score.notes}/>
      <Staff notes={[...score.notes.slice(8),...score.notes.slice(0,8)]}/>
      <div className="score-actions"><button onClick={onNext}>下一首 · E</button><button onClick={onClose}>放回书架 · Esc</button></div>
    </div>
  </section>
}
