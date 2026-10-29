import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FOX_HINTS, INTERACTIONS } from '../config/scene'
import { nearestInteraction } from './collision'
import { countIn, startGroove, playDrum, playPiano, playTake, prepareAudio, preparePiano, setAmbientPlaying, setMasterVolume, startCrackle, startMetronome } from '../audio/drums'
import { finishRecording, takeStore } from '../audio/takes'
import { emitMusic } from '../audio/musicBus'
import { roomState } from './roomState'
import { activity } from './activity'
import { currentDiaryPages } from '../ui/DiaryPage'
import { worldPhysics } from '../worlds/worldState'
import { journey } from './journey'
import { appendDrumHit, initialDrumHit } from './drumHitState'

import { DRUM_KEYS } from './drumKeys'
// Recording timeline uses the page clock: the audio clock can run unevenly when no output
// device is active, and key-to-sound latency is the same either way.
const clock = () => performance.now() / 1000
import { DEFAULT_PIANO_BASE, PIANO_HIGH, PIANO_KEYS, PIANO_LOW } from './pianoKeys'
export { DRUM_KEYS }
const SESSIONS = ['drums', 'piano']

export function useInteractionSystem(root) {
  const [started, setStarted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [mode, setMode] = useState('explore')
  const [near, setNear] = useState(null)
  const [foxName, setFoxName] = useState(null)
  const [foxPet, setFoxPet] = useState(null)
  const [hit, setHit] = useState(initialDrumHit)
  const [ambient, setAmbient] = useState(false)
  const [volume, setVolume] = useState(.42)
  const [audioError, setAudioError] = useState('')
  // Drum session recorder: R record, Space play last take, M metronome, [ ] tempo.
  const [recording, setRecording] = useState(null) // { startedAt, hits } while recording
  const [metronome, setMetronome] = useState(false)
  const [bpm, setBpm] = useState(90)
  const [playingTake, setPlayingTake] = useState(false)
  const [lastTake, setLastTake] = useState(() => takeStore.getAll()[0] || null)
  const recordingRef = useRef(null)
  // Turntable: records are takes pressed in Studio; one can play (looping) while you roam.
  const takes = useSyncExternalStore(takeStore.subscribe, takeStore.getAll)
  const records = takes.filter(take => take.pressed)
  const [vinyl, setVinyl] = useState(null) // { id } while a record spins
  const stopVinylRef = useRef(null)
  const stopMetronome = useRef(null)
  const stopPlayback = useRef(null)
  recordingRef.current = recording
  const playerPositionRef = useRef(null)
  const playerPosition = useCallback(() => playerPositionRef.current, [])
  const modeRef = useRef(mode)
  const nearRef = useRef(near)
  const lastHit = useRef({}) // per pad, so kick + hi-hat together both sound
  // Rhythm challenge: strikes are forwarded to listeners (the overlay judges them).
  const strikeListeners = useRef(new Set())
  const subscribeStrikes = useCallback(listener => { strikeListeners.current.add(listener); return () => strikeListeners.current.delete(listener) }, [])
  const [challenge, setChallenge] = useState(null) // { take, startAt }
  // Milo (Mugo's drummer) visiting: he sits at the kit and jams while you play piano.
  const [milo, setMilo] = useState({ visiting: false, jam: true })
  const inviteMilo = useCallback(() => setMilo(old => ({ ...old, visiting: !old.visiting })), [])
  const toggleMiloJam = useCallback(() => setMilo(old => ({ ...old, jam: !old.jam })), [])
  const challengeRef = useRef(null)
  challengeRef.current = challenge
  // Piano session: octave base, notes currently held (for the 3D keys), and their releases.
  const [pianoBase, setPianoBase] = useState(DEFAULT_PIANO_BASE)
  const [pianoNotes, setPianoNotes] = useState(() => new Set())
  const heldKeys = useRef(new Map()) // key code / pointer id -> { note, release }
  const pianoBaseRef = useRef(pianoBase)
  pianoBaseRef.current = pianoBase
  modeRef.current = mode
  nearRef.current = near

  const requestLock = useCallback(() => {
    if (modeRef.current === 'explore') root.current?.requestPointerLock?.()
  }, [root])

  const start = useCallback((touch = false) => {
    setStarted(true)
    if (!touch) requestLock()
    prepareAudio().catch(error => setAudioError(error.message))
    setAmbientPlaying(true).then(setAmbient).catch(error => setAudioError(error.message))
  }, [requestLock])

  // Screenshot QA needs the room visible without attempting pointer lock or
  // starting audio in a browser that has no user gesture.
  const startPreview = useCallback(() => setStarted(true), [])

  const updatePosition = useCallback(position => {
    playerPositionRef.current = position
    if (worldPhysics.active) { setNear(old => old === null ? old : null); return } // away behind the Anywhere Door
    if (modeRef.current !== 'explore') return
    const closest = nearestInteraction(position, INTERACTIONS)
    setNear(old => old === closest ? old : closest)
    const fox = FOX_HINTS.find(item => Math.hypot(position.x-item.position[0],position.z-item.position[2]) < item.radius)
    setFoxName(old => old === (fox?.name || null) ? old : fox?.name || null)
  }, [])

  const enter = useCallback(nextMode => {
    // The diary remembers where you spent time (sofa, books, bed, desk, photo wall…).
    // Logged first: pulling a book counts today's page, so the page list must already include it.
    activity.log({ beanbag: 'rest', books: 'books', musicBooks: 'books', deskChair: 'desk', photos: 'photos', guitar: 'guitarPickUp' }[nextMode] || nextMode)
    if(nextMode==='drums') setHit(old=>({...old,name:null}))
    if(nextMode==='piano' || nextMode==='band') preparePiano().catch(error => setAudioError(error.message))
    if(nextMode==='band') prepareAudio().catch(error => setAudioError(error.message))
    if(nextMode==='musicBooks') setScorePage(0)
    if(nextMode==='books') {
      setActiveBookShelf(nearRef.current === 'booksLeft' ? 'left' : 'right')
      pullBook()
    }
    setMode(nextMode)
    document.exitPointerLock?.()
  }, [])

  const flashNote = useCallback((note, ms = 220) => {
    setPianoNotes(old => new Set(old).add(note))
    setTimeout(() => setPianoNotes(old => { const next = new Set(old); next.delete(note); return next }), ms)
  }, [])
  // Visual feedback for playback (Studio or Space): drums wobble, piano keys dip.
  const pulse = useCallback((name, note) => {
    emitMusic(name, note)
    if (name === 'piano') flashNote(note)
    else setHit(old => appendDrumHit(old, name))
  }, [flashNote])

  const stopTake = useCallback(() => { stopPlayback.current?.(); stopPlayback.current = null; setPlayingTake(false) }, [])

  const toggleMetronome = useCallback(() => setMetronome(on => !on), [])

  useEffect(() => {
    if (!metronome || !SESSIONS.includes(mode)) return
    stopMetronome.current = startMetronome(bpm)
    return () => { stopMetronome.current?.(); stopMetronome.current = null }
  }, [metronome, bpm, mode])

  const toggleRecording = useCallback(async () => {
    const current = recordingRef.current
    if (!current) {
      // Start the timeline at the key press; samples may still be loading, and hits played
      // meanwhile keep their key-press times.
      setRecording({ startedAt: clock(), hits: [] })
      stopTake()
      ;(modeRef.current === 'piano' ? preparePiano() : prepareAudio()).catch(error => setAudioError(error.message))
      return
    }
    setRecording(null)
    if (!current.hits.length) return
    const name = `${current.hits.some(hit => hit.pad === 'piano') ? 'Piano' : 'Drums'} ${takeStore.getAll().length + 1}`
    const take = takeStore.add(finishRecording({ startedAt: current.startedAt, hits: current.hits, bpm, name, now: Date.now() }))
    activity.log('take', take.name)
    setLastTake(take)
  }, [bpm, stopTake])

  const togglePlayLast = useCallback(async () => {
    if (stopPlayback.current) return stopTake()
    const take = takeStore.getAll()[0]
    if (!take) return
    setLastTake(take)
    setPlayingTake(true)
    stopPlayback.current = await playTake(take, { onHit: pulse, onEnd: () => { stopPlayback.current = null; setPlayingTake(false) } })
  }, [pulse, stopTake])

  const [book, setBook] = useState(null) // { index, page }
  const [scorePage, setScorePage] = useState(0)
  const [activeBookShelf, setActiveBookShelf] = useState('right')
  // Opens on an unread page, else the newest (the room's own pages come first); E turns pages.
  const pullBook = useCallback(() => setBook(old => {
    const pages = currentDiaryPages()
    if (old) return { index: 0, page: (old.page + 1) % pages.length }
    return { index: 0, page: Math.max(0, pages.findIndex(page => page.fresh)) } // an unread page first
  }), [])
  const vinylToken = useRef(0)
  const stopVinyl = useCallback(() => { vinylToken.current++; stopVinylRef.current?.(); stopVinylRef.current = null; setVinyl(null) }, [])
  const playVinyl = useCallback(async id => {
    stopVinyl()
    const take = takeStore.getAll().find(item => item.id === id)
    if (!take?.events.length) return
    const token = vinylToken.current
    setVinyl({ id })
    activity.log('vinyl', take.name)
    // Let the arm swing over before the needle drops; a stop or another record in the
    // meantime cancels this one.
    await new Promise(resolve => setTimeout(resolve, 900))
    if (token !== vinylToken.current) return
    const stopCrackle = startCrackle()
    const stopTakeLoop = await playTake(take, { loop: true, onHit: pulse })
    if (token !== vinylToken.current) { stopTakeLoop(); stopCrackle(); return }
    stopVinylRef.current = () => { stopTakeLoop(); stopCrackle() }
  }, [pulse, stopVinyl])
  // A record deleted or un-pressed in Studio stops spinning.
  useEffect(() => { if (vinyl && !records.some(take => take.id === vinyl.id)) stopVinyl() }, [vinyl, records, stopVinyl])

  const drumTakes = takes.filter(take => take.events.some(event => event.pad !== 'piano'))
  const startChallenge = useCallback(async takeId => {
    const take = takeStore.getAll().find(item => item.id === takeId) || takeStore.getAll().find(item => item.events.some(event => event.pad !== 'piano'))
    if (!take) return
    await prepareAudio()
    if (recordingRef.current) setRecording(null)
    stopTake(); setMetronome(false)
    const beat = 60 / take.bpm
    countIn(take.bpm, 4)
    setChallenge({ take, startAt: clock() + .05 + 4 * beat })
    activity.log('challenge')
  }, [stopTake])
  const endChallenge = useCallback(() => setChallenge(null), [])

  useEffect(() => {
    if (!milo.visiting || !milo.jam || mode !== 'piano') return
    const stop = startGroove(bpm, (pad, delay) => {
      const at = clock() + delay
      setTimeout(() => pulse(pad), delay * 1000)
      setRecording(current => current && at >= current.startedAt ? { ...current, hits: [...current.hits, { pad, at }] } : current)
    })
    return stop
  }, [milo.visiting, milo.jam, mode, bpm, pulse])

  const changeBpm = useCallback(delta => setBpm(value => Math.max(50, Math.min(180, value + delta))), [])

  const noteOn = useCallback(async (id, note) => {
    if ((modeRef.current !== 'piano' && modeRef.current !== 'band') || heldKeys.current.has(id)) return
    heldKeys.current.set(id, { note, release: null, at: clock() })
    journey.pianoNote()
    setPianoNotes(old => new Set(old).add(note))
    emitMusic('piano', note)
    activity.log('piano')
    try {
      const voice = await playPiano(note)
      const held = heldKeys.current.get(id)
      if (!held) { voice.release(); return } // key already lifted while samples loaded
      held.release = voice.release
      setRecording(current => current && held.at >= current.startedAt ? { ...current, hits: [...current.hits, { pad: 'piano', note, at: held.at }] } : current)
    } catch (error) { setAudioError(error.message) }
  }, [])

  const noteOff = useCallback(id => {
    const held = heldKeys.current.get(id)
    if (!held) return
    heldKeys.current.delete(id)
    setPianoNotes(old => { const next = new Set(old); next.delete(held.note); return next })
    if (!held.release) return
    held.release()
    const until = clock()
    setRecording(current => current ? { ...current, hits: current.hits.map(hit => hit.pad === 'piano' && hit.note === held.note && hit.at === held.at ? { ...hit, until } : hit) } : current)
  }, [])

  const releaseAllNotes = useCallback(() => { [...heldKeys.current.keys()].forEach(noteOff) }, [noteOff])
  const shiftOctave = useCallback(delta => setPianoBase(base => Math.max(PIANO_LOW, Math.min(PIANO_HIGH - 24, base + delta * 12))), [])

  const leave = useCallback(() => {
    releaseAllNotes()
    if (recordingRef.current) toggleRecording()
    stopTake()
    setMetronome(false)
    setBook(null)
    setChallenge(null)
    setMode('explore')
    setNear(null)
  }, [toggleRecording, stopTake, releaseAllNotes])

  const interact = useCallback(() => {
    if (modeRef.current !== 'explore' || !nearRef.current) return
    const item = nearRef.current
    const lamp = INTERACTIONS[item].lamp
    const fox = INTERACTIONS[item].fox
    if (item === 'moonTicket') { journey.takeTicket(); activity.log('moonTicket') }
    else if (fox) { setFoxPet(old => ({ name: fox, id: (old?.id || 0) + 1 })); activity.log('fox', fox) }
    else if (lamp) { roomState.toggleLamp(lamp); activity.log('lamp') }
    else enter(item === 'booksLeft' ? 'books' : item)
  }, [enter])

  const strike = useCallback(async name => {
    if (modeRef.current !== 'drums' && modeRef.current !== 'band') return
    // Short per-pad guard against double-fired input (key + click on the same pad).
    if (performance.now() - (lastHit.current[name] || 0) < 35) return
    lastHit.current[name] = performance.now()
    try {
      const at = clock()
      strikeListeners.current.forEach(listener => listener(name, at))
      await playDrum(name)
      activity.log('drums')
      setRecording(current => current && at >= current.startedAt ? { ...current, hits: [...current.hits, { pad: name, at }] } : current)
      pulse(name)
    } catch (error) { setAudioError(error.message) }
  }, [pulse])

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
      if (event.target?.closest?.('input, textarea')) return // typing in a panel isn't playing
      if (current === 'guitar') { if (event.code === 'KeyE') { event.preventDefault(); leave() } return } // GuitarPanel plays the rest
      if (['bed', 'deskChair'].includes(current)) {
        if (event.code === 'KeyE') { event.preventDefault(); leave() }
        return
      }
      if (current === 'drums') {
        const note = DRUM_KEYS[event.code]
        if (note) { event.preventDefault(); if (!event.repeat) strike(note); return }
        if (event.repeat) return
        if (event.code === 'KeyR' || event.code === 'Enter') { event.preventDefault(); toggleRecording() }
        if (event.code === 'Space') { event.preventDefault(); togglePlayLast() }
        if (event.code === 'KeyM') { event.preventDefault(); toggleMetronome() }
        if (event.code === 'BracketLeft') { event.preventDefault(); changeBpm(-5) }
        if (event.code === 'BracketRight') { event.preventDefault(); changeBpm(5) }
        if (event.code === 'KeyG') { event.preventDefault(); startChallenge(challengeRef.current?.take.id) } // replays the current chart
        return
      }
      if (current === 'piano') {
        const offset = PIANO_KEYS[event.code]
        if (offset != null && !event.metaKey && !event.ctrlKey) { event.preventDefault(); if (!event.repeat) noteOn(event.code, pianoBaseRef.current + offset); return }
        if (event.repeat) return
        if (event.code === 'Enter') { event.preventDefault(); toggleRecording() }
        if (event.code === 'Space') { event.preventDefault(); togglePlayLast() }
        if (event.code === 'Backslash') { event.preventDefault(); toggleMetronome() }
        if (event.code === 'Minus') { event.preventDefault(); shiftOctave(-1) }
        if (event.code === 'Equal') { event.preventDefault(); shiftOctave(1) }
        if (event.code === 'BracketLeft') { event.preventDefault(); changeBpm(-5) }
        if (event.code === 'BracketRight') { event.preventDefault(); changeBpm(5) }
        return
      }
      if (current === 'books') {
        if (event.code === 'Space' || event.code === 'KeyE') { event.preventDefault(); if (!event.repeat) pullBook() }
        return
      }
      if (current === 'musicBooks') {
        if (event.code === 'Space' || event.code === 'KeyE') { event.preventDefault(); if (!event.repeat) setScorePage(page => (page + 1) % 3) }
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
        interact()
      }
    }
    const onKeyUp = event => { if (modeRef.current === 'piano') noteOff(event.code) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseAllNotes)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', releaseAllNotes) }
  }, [interact, leave, strike, toggleAmbient, started, toggleRecording, togglePlayLast, toggleMetronome, changeBpm, noteOn, noteOff, releaseAllNotes, shiftOctave, pullBook, startChallenge])

  return { started, locked, mode, near, foxName, foxPet, hit, ambient, volume, audioError, start, startPreview, requestLock, updatePosition, enter, leave, interact, strike, toggleAmbient, changeVolume,
    records, vinyl, playVinyl, stopVinyl, book, pullBook, activeBookShelf, scorePage, nextScore: () => setScorePage(page => (page + 1) % 3),
    drumTakes, challenge, startChallenge, endChallenge, subscribeStrikes,
    milo, inviteMilo, toggleMiloJam,
    playerPosition,
    recording, metronome, bpm, playingTake, lastTake, toggleRecording, togglePlayLast, toggleMetronome, changeBpm, pulse,
    pianoBase, pianoNotes, noteOn, noteOff, shiftOctave }
}
