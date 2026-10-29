import { useEffect, useRef } from 'react'
import { gamepads, startGamepads } from './gamepad'
import { DRUM_PAD, KEYBOARD, PIANO_PAD, PIANO_PAD_BASE, guitarChordFor, partOf } from './padMaps'
import { DRUM_KEYS } from './drumKeys'
import { DEFAULT_PIANO_BASE, PIANO_KEYS } from './pianoKeys'
import { GUITAR_CHORDS, PICK_STRINGS } from '../audio/guitarChords'
import { band } from './band'

// Routes controller buttons to the room: walking + A to interact in explore, B to back out,
// and each instrument's layout while seated. In band mode every pad plays its own part.
export function useGamepadControls(game, { world }) {
  const ref = useRef({ game, world })
  ref.current = { game, world }
  const octave = useRef(new Map()) // pad -> semitone offset for the piano
  const lbHeld = useRef(new Map()) // pad -> LB held (guitar's second chord set)

  useEffect(() => {
    startGamepads()
    const playPart = (part, pad, button, pressed) => {
      const { game } = ref.current
      if (part === 'drums') { if (pressed && DRUM_PAD[button]) game.strike(DRUM_PAD[button]); return }
      if (part === 'piano') {
        const id = `pad${pad}:${button}`
        if (button === 'LB' || button === 'RB') { if (pressed) octave.current.set(pad, Math.max(-24, Math.min(24, (octave.current.get(pad) || 0) + (button === 'LB' ? -12 : 12)))); return }
        if (PIANO_PAD[button] == null) return
        if (pressed) game.noteOn(id, PIANO_PAD_BASE + (octave.current.get(pad) || 0) + PIANO_PAD[button])
        else game.noteOff(id)
        return
      }
      if (part === 'guitar') {
        if (button === 'LB') { lbHeld.current.set(pad, pressed); return }
        if (!pressed) return
        const chord = guitarChordFor(button, lbHeld.current.get(pad))
        if (chord) game.setGuitarChord(GUITAR_CHORDS.findIndex(c => c.name === chord))
        else if (button === 'RT' || button === 'A') game.strumGuitar(false)
        else if (button === 'LT') game.strumGuitar(true)
        else if (button === 'X') game.releaseGuitarChord()
        else if (button === 'Y') game.setGuitarTone(game.guitarTone === 'acoustic' ? 'electric' : 'acoustic')
      }
    }

    return gamepads.onButton((pad, button, pressed) => {
      const { game, world } = ref.current
      if (!game.started) { if (pressed && (button === 'A' || button === 'Start')) game.start(true); return }
      const b = band.get()

      // ---- band mode ----
      if (b.phase === 'lobby') {
        if (!pressed) return
        const seated = partOf(b.seats, pad)
        if (button === 'A') band.join(pad)
        else if (button === 'Left' || button === 'Right') band.switchPart(pad, button === 'Left' ? -1 : 1)
        else if (button === 'B') { if (seated) band.leave(pad); else game.leave() }
        else if (button === 'Start') band.play()
        return
      }
      if (b.phase === 'playing') {
        if (pressed && button === 'Back') { band.lobby(); return }
        const part = partOf(b.seats, pad)
        if (part) playPart(part, pad, button, pressed)
        return
      }

      // ---- one player ----
      const mode = game.mode
      if (['drums', 'piano', 'guitar'].includes(mode)) {
        if (pressed && button === 'B') { game.leave(); return }
        playPart(mode, pad, button, pressed)
        return
      }
      if (!pressed) return
      if (mode === 'explore') {
        if (button === 'A') world ? window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })) : game.interact()
        else if (button === 'Y') window.dispatchEvent(new Event('moonroom:toggle-curtain'))
        else if (button === 'Start' && !world) { game.enter('band'); band.open() }
        return
      }
      if (button === 'B') { game.leave(); return }
      if (button === 'A') {
        if (mode === 'books') game.pullBook()
        else if (mode === 'musicBooks') game.nextScore()
        else if (['beanbag', 'bed', 'deskChair'].includes(mode)) game.leave()
      }
    })
  }, [])

  // The keyboard as a band member: Enter joins in the lobby (Enter again starts, ←/→ switches,
  // Backspace leaves); while playing it uses its instrument's usual keys.
  useEffect(() => {
    const down = event => {
      const b = band.get()
      if (b.phase === 'off' || event.target?.closest?.('input, textarea')) return
      const { game } = ref.current
      if (b.phase === 'lobby') {
        const seated = partOf(b.seats, KEYBOARD)
        if (event.code === 'Enter') { event.preventDefault(); seated ? band.play() : band.join(KEYBOARD) }
        else if (seated && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) { event.preventDefault(); band.switchPart(KEYBOARD, event.code === 'ArrowLeft' ? -1 : 1) }
        else if (seated && event.code === 'Backspace') { event.preventDefault(); band.leave(KEYBOARD) }
        return
      }
      const part = partOf(b.seats, KEYBOARD)
      if (!part || event.metaKey || event.ctrlKey) return
      if (part === 'drums') { const pad = DRUM_KEYS[event.code]; if (pad) { event.preventDefault(); if (!event.repeat) game.strike(pad) } return }
      if (part === 'piano') { const offset = PIANO_KEYS[event.code]; if (offset != null) { event.preventDefault(); if (!event.repeat) game.noteOn(`kb:${event.code}`, DEFAULT_PIANO_BASE + offset) } return }
      if (event.repeat) return
      const chord = /^Digit([1-8])$/.exec(event.code)
      if (chord) { event.preventDefault(); game.setGuitarChord(Number(chord[1]) - 1) }
      else if (event.code === 'Space') { event.preventDefault(); game.strumGuitar(event.shiftKey) }
      else if (event.code === 'KeyM') { event.preventDefault(); game.releaseGuitarChord() }
      else { const string = ['KeyJ', 'KeyK', 'KeyL', 'Semicolon'].indexOf(event.code); if (string >= 0) { event.preventDefault(); game.pluckGuitar(PICK_STRINGS[string]) } }
    }
    const up = event => { if (band.get().phase === 'playing' && partOf(band.get().seats, KEYBOARD) === 'piano') ref.current.game.noteOff(`kb:${event.code}`) }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])
}
