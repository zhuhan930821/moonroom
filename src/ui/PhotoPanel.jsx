import { useRef, useState, useSyncExternalStore } from 'react'
import { BUILTIN_IDS, MAX_HUNG, MAX_UPLOADS, fileToUpload, photoWall } from '../game/photoWall'
import { builtinThumb } from '../scene/photoArt'
import { activity } from '../game/activity'

// Pick which photos hang on the wall; add your own from the device.
export default function PhotoPanel() {
  const wall = useSyncExternalStore(photoWall.subscribe, photoWall.get)
  const input = useRef(null)
  const [note, setNote] = useState('')
  const all = [...wall.uploads.map(u => ({ id: u.id, src: u.src, own: true, name: u.name })), ...BUILTIN_IDS.map(id => ({ id, src: builtinThumb(id) }))]
  const full = wall.hung.length >= MAX_HUNG

  const pick = async event => {
    const files = [...event.target.files]
    event.target.value = ''
    let added = 0
    for (const file of files) {
      if (photoWall.get().uploads.length >= MAX_UPLOADS) { setNote(`最多存 ${MAX_UPLOADS} 张自己的照片`); break }
      try { photoWall.add(await fileToUpload(file)); added++; activity.log('photoUpload') } catch (error) { setNote(error.message) }
    }
    if (added) setNote(photoWall.saveError() || `挂上了 ${added} 张`)
  }

  return <div className="mode-panel photo-panel" data-testid="photo-controls" onClick={event => event.stopPropagation()}>
    <span>PHOTO WALL</span>
    <div className="photo-actions">
      <button onClick={() => input.current?.click()}>＋ 从相册添加</button>
      <button onClick={photoWall.shuffle} disabled={!wall.hung.length}>换个排法</button>
      <button onClick={photoWall.reset}>恢复默认</button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={pick}/>
    </div>
    <div className="photo-grid">{all.map(photo => {
      const order = wall.hung.indexOf(photo.id)
      return <div key={photo.id} className={`photo-tile ${order >= 0 ? 'on' : ''}`} title={photo.name || ''}>
        <button disabled={order < 0 && full} onClick={() => photoWall.toggle(photo.id)} aria-label={order >= 0 ? '取下' : '挂上'}>
          <img src={photo.src} alt=""/>{order >= 0 && <b>{order + 1}</b>}
        </button>
        {photo.own && <i role="button" aria-label="删除这张照片" onClick={() => photoWall.remove(photo.id)}>×</i>}
      </div>
    })}</div>
    <small>{note || `点照片挂上 / 取下 · 去任意门后按 F 拍风景 · 已挂 ${wall.hung.length} / ${MAX_HUNG} · 照片只存在这台设备上`}{' · Esc 离开'}</small>
  </div>
}
