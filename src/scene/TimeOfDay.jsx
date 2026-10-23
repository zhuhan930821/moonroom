import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { roomState } from '../game/roomState'
import { setTimeOfDayAudio } from '../audio/drums'
import { timeAt } from '../game/dayCycle'

const FIXED = { night: 0, dawn: 1, day: 2 }

// Rest on the sofa and the day turns: night → dawn → day, a long day, dusk → night, repeat.
// Getting up stops the clock where it is, so you can walk around a daytime room. The settings
// panel can pin night / dawn / day instead.

export default function TimeOfDay({ resting }) {
  const phase = useRef(0), lastAudio = useRef(-1)
  useFrame((_, dt) => {
    const state = roomState.get()
    let target
    if (state.forceTime != null) target = state.forceTime // demo/QA capture only
    else if (state.timeMode !== 'auto') target = FIXED[state.timeMode]
    else { if (resting) phase.current += dt; target = timeAt(phase.current) }
    // Pinned modes glide rather than jump.
    state.time += (target - state.time) * (state.timeMode === 'auto' && state.forceTime == null ? 1 : 1 - Math.exp(-dt * 1.5))
    state.dawn = Math.min(1, state.time)
    state.day = Math.max(0, state.time - 1)
    if (Math.abs(state.time - lastAudio.current) > .01) { lastAudio.current = state.time; setTimeOfDayAudio(state.dawn, state.day) }
  })
  return null
}
