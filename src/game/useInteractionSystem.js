import { useCallback, useEffect, useRef, useState } from 'react'
import { FOX_HINTS, INTERACTIONS } from '../config/scene'
import { nearestInteraction } from './collision'
import { playDrum, prepareAudio, setAmbientPlaying, setMasterVolume } from '../audio/drums'

export function useInteractionSystem(root) {
  const [started, setStarted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [mode, setMode] = useState('explore')
  const [near, setNear] = useState(null)
  const [foxName, setFoxName] = useState(null)
  const [hit, setHit] = useState({ name: null, id: 0 })
  const [ambient, setAmbient] = useState(false)
  const [volume, setVolume] = useState(.42)
  const [audioError, setAudioError] = useState('')
  const modeRef = useRef(mode)
  const nearRef = useRef(near)
  const lastHit = useRef(0)
  modeRef.current = mode
  nearRef.current = near

  const requestLock = useCallback(() => {
    if (modeRef.current === 'explore') root.current?.requestPointerLock?.()
  }, [root])

  const start = useCallback(() => {
    setStarted(true)
    requestLock()
    prepareAudio().catch(error => setAudioError(error.message))
    setAmbientPlaying(true).then(setAmbient).catch(error => setAudioError(error.message))
  }, [requestLock])

  // Screenshot QA needs the room visible without attempting pointer lock or
  // starting audio in a browser that has no user gesture.
  const startPreview = useCallback(() => setStarted(true), [])

  const updatePosition = useCallback(position => {
    if (modeRef.current !== 'explore') return
    const closest = nearestInteraction(position, INTERACTIONS)
    setNear(old => old === closest ? old : closest)
    const fox = FOX_HINTS.find(item => Math.hypot(position.x-item.position[0],position.z-item.position[2]) < item.radius)
    setFoxName(old => old === (fox?.name || null) ? old : fox?.name || null)
  }, [])

  const enter = useCallback(nextMode => {
    if(nextMode==='drums') setHit(old=>({name:null,id:old.id}))
    setMode(nextMode)
    document.exitPointerLock?.()
  }, [])

  const leave = useCallback(() => {
    setMode('explore')
    setNear(null)
  }, [])

  const strike = useCallback(async name => {
    if (modeRef.current !== 'drums') return
    // Keep a very short guard against browser key-repeat flooding.
    if (performance.now() - lastHit.current < 35) return
    lastHit.current = performance.now()
    try {
      await playDrum(name)
      setHit(old => ({ name, id: old.id + 1 }))
    } catch (error) { setAudioError(error.message) }
  }, [])

  const toggleAmbient = useCallback(() => {
    setAmbientPlaying(!ambient).then(setAmbient).catch(error => setAudioError(error.message))
  }, [ambient])

  const changeVolume = useCallback(value => {
    setVolume(value)
    setMasterVolume(value)
  }, [])

  useEffect(() => {
    const onLockChange = () => setLocked(document.pointerLockElement === root.current)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => document.removeEventListener('pointerlockchange', onLockChange)
  }, [root])

  useEffect(() => {
    const onKey = event => {
      if (!started || (event.repeat && event.code === 'KeyE')) return
      const current = modeRef.current
      if (event.code === 'Escape') {
        if (current !== 'explore') { event.preventDefault(); leave() }
        return
      }
      if (current === 'drums') {
        const note = { KeyJ: 'kick', Digit1: 'kick', KeyK: 'snare', Digit2: 'snare', KeyL: 'hihat', Digit3: 'hihat' }[event.code]
        if (note) { event.preventDefault(); strike(note) }
        return
      }
      if (current === 'beanbag') {
        if (event.code === 'KeyE') { event.preventDefault(); leave() }
        if (event.code === 'KeyM') { event.preventDefault(); toggleAmbient() }
        return
      }
      if (current === 'computer') return
      if (event.code === 'KeyE' && nearRef.current) {
        event.preventDefault()
        enter(nearRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enter, leave, strike, toggleAmbient, started])

  return { started, locked, mode, near, foxName, hit, ambient, volume, audioError, start, startPreview, requestLock, updatePosition, enter, leave, strike, toggleAmbient, changeVolume }
}
