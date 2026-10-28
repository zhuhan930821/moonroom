import { useEffect, useState, useSyncExternalStore } from 'react'
import { useThree } from '@react-three/fiber'
import { MAX_UPLOADS, photoCrop, photoWall } from '../game/photoWall'
import { worldState } from './worldState'
import { activity } from '../game/activity'

// A camera for the Anywhere Door: press F (or tap 📷) behind the door and the current view is
// developed straight onto the photo wall at home. The shutter is a window event so the DOM
// button and the key both reach the renderer inside <Canvas/>.
const SNAP = 'moonroom:snap', SNAPPED = 'moonroom:snapped'
const snapped = detail => window.dispatchEvent(new CustomEvent(SNAPPED, { detail }))

// Inside <Canvas/>: renders one fresh frame and copies it out (no preserveDrawingBuffer needed,
// since the copy happens in the same task as the render).
export function WorldShutter() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const snap = () => {
      const world = worldState.get().world
      if (!world) return
      if (photoWall.get().uploads.length >= MAX_UPLOADS) return snapped({ error: `照片墙的相册满了（${MAX_UPLOADS} 张），回房间删掉几张再拍` })
      gl.render(scene, camera)
      const from = gl.domElement, crop = photoCrop(from.width, from.height)
      const c = document.createElement('canvas'); c.width = crop.dw; c.height = crop.dh
      c.getContext('2d').drawImage(from, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.dw, crop.dh)
      const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      photoWall.add({ id, src: c.toDataURL('image/jpeg', .85), aspect: crop.aspect, name: world.name, at: Date.now() })
      activity.log('photo', world.name)
      snapped({ name: world.name, hung: photoWall.get().hung.includes(id), error: photoWall.saveError() })
    }
    window.addEventListener(SNAP, snap)
    return () => window.removeEventListener(SNAP, snap)
  }, [gl, scene, camera])
  return null
}

// DOM: the 📷 button, F key, shutter flash and "developed" toast. Only shown behind the door.
export function WorldCameraButton({ active }) {
  const inWorld = useSyncExternalStore(worldState.subscribe, () => worldState.get().status === 'inside')
  const [flash, setFlash] = useState(0)
  const [toast, setToast] = useState('')
  const on = inWorld && active
  useEffect(() => {
    if (!on) return
    const onKey = event => {
      if (event.code !== 'KeyF' || event.repeat || event.target?.closest?.('input, textarea')) return
      event.preventDefault(); window.dispatchEvent(new Event(SNAP))
    }
    const onSnapped = ({ detail }) => {
      if (!detail.error || detail.name) setFlash(n => n + 1)
      setToast(detail.error || (detail.hung ? `拍下了「${detail.name}」· 照片已经挂到房间的照片墙上` : `拍下了「${detail.name}」· 照片墙挂满了，回房间在照片墙前挑一挑`))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(SNAPPED, onSnapped)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(SNAPPED, onSnapped) }
  }, [on])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t) }, [toast])
  if (!on) return null
  return <>
    <button className="world-camera" data-testid="world-camera" aria-label="拍照" onClick={event => { event.stopPropagation(); window.dispatchEvent(new Event(SNAP)) }}>📷 <span>F · 拍照</span></button>
    {flash > 0 && <div key={flash} className="world-flash"/>}
    {toast && <div className="world-toast world-camera-toast" role="status">{toast}</div>}
  </>
}
