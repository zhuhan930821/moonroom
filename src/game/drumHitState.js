// Keep a short ordered history so hits batched into one React render are all animated.
// `name` and `id` remain for the existing room-wide music feedback.
export const initialDrumHit = { name: null, id: 0, events: [] }

export function appendDrumHit(previous, name, at = performance.now()) {
  const id = previous.id + 1
  return { name, id, events: [...(previous.events || []).slice(-31), { id, name, at }] }
}
