import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { roomState } from '../game/roomState'
import { setTimeOfDayAudio } from '../audio/drums'

// Rest on the sofa and the night turns: ~40 s to sunrise, linger, ~40 s back to night, repeat.
// Getting up lets dawn ebb back to night over a few seconds.
const RISE = 40, HOLD = 16, CYCLE = 2 * RISE + 2 * HOLD

export default function TimeOfDay({ resting }) {
  const restingFor = useRef(0), lastAudio = useRef(-1)
  useFrame((_, dt) => {
    const state = roomState.get()
    if (state.forceDawn != null) { state.dawn = state.forceDawn; return } // demo/QA capture only
    let target
    if (resting) {
      restingFor.current += dt
      const t = restingFor.current % CYCLE
      target = t < HOLD ? 0 : t < HOLD + RISE ? (t - HOLD) / RISE : t < 2 * HOLD + RISE ? 1 : 1 - (t - 2 * HOLD - RISE) / RISE
      state.dawn = target * target * (3 - 2 * target) // ease
    } else {
      restingFor.current = 0
      state.dawn = Math.max(0, state.dawn - dt / 6)
    }
    if (Math.abs(state.dawn - lastAudio.current) > .01) { lastAudio.current = state.dawn; setTimeOfDayAudio(state.dawn) }
  })
  return null
}
