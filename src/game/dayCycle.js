// Sofa day cycle: [seconds, from, to] legs over time-of-day 0 (night) → 1 (dawn) → 2 (day).
export const LEG = [[10, 0, 0], [25, 0, 1], [25, 1, 2], [20, 2, 2], [25, 2, 1], [25, 1, 0]]
export const CYCLE = LEG.reduce((sum, [seconds]) => sum + seconds, 0)
const ease = x => x * x * (3 - 2 * x)

export function timeAt(phase) {
  let t = ((phase % CYCLE) + CYCLE) % CYCLE
  for (const [seconds, from, to] of LEG) { if (t < seconds) return from + (to - from) * ease(t / seconds); t -= seconds }
  return 0
}
