// Sitting: content can seat you (a café chair, a bench). While you stay put your eyes drop by
// `drop`; walking away stands you up. StrollWorld folds this into the ground height.
export const seat = { current: null } // { x, z, drop }

export function seatOffset(x, z) {
  const s = seat.current
  if (!s) return 0
  if (Math.hypot(x - s.x, z - s.z) > .4) { seat.current = null; return 0 }
  return -s.drop
}
