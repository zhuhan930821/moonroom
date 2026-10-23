import { useSyncExternalStore } from 'react'
import { worldState } from './worldState'

export default function SouvenirPanel({ onRevisit }) {
  const { souvenirs } = useSyncExternalStore(worldState.subscribe, worldState.get)
  return <div className="mode-panel souvenir-panel" data-testid="souvenir-panel" onClick={event => event.stopPropagation()}>
    <span>SOUVENIRS · {souvenirs.length}</span>
    {souvenirs.length === 0 ? <p>架子还空着。推开旁边的任意门，从门后的世界带点什么回来。</p>
      : <div className="souvenir-list">{souvenirs.map(item => <article key={item.id}>
        <i style={{ background: item.color }}/>
        <div><strong>{item.name}</strong><small>来自「{item.worldName}」 · {new Date(item.at).toLocaleDateString('zh-CN')}</small>{item.story && <p>{item.story}</p>}</div>
        <button onClick={() => onRevisit(item)}>重返</button>
      </article>)}</div>}
    <small>Esc 离开</small>
  </div>
}
