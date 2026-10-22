// Shared by DrumKit and CandidateDrumKit: which GLB node each pad animates, the hit
// wobble, and click-to-strike lookup.
export const HIT_NODES = { kick:'Kick', snare:'Snare', hihat:'HiHat_Top', hihatOpen:'HiHat_Top', tom1:'Tom_One', tom2:'Tom_Two', floor:'Floor_Tom', crash:'Crash', ride:'Ride' }
const NODE_PAD = { Kick:'kick', Snare:'snare', HiHat_Top:'hihat', Tom_One:'tom1', Tom_Two:'tom2', Floor_Tom:'floor', Crash:'crash', Ride:'ride' }
const CYMBALS = new Set(['HiHat_Top', 'Crash', 'Ride'])

export function animateKit(root, active) {
  const target = HIT_NODES[active.name]
  for (const nodeName of Object.keys(NODE_PAD)) {
    const node = root.getObjectByName(nodeName)
    if (!node) continue
    const amount = nodeName === target ? active.strength : 0
    const cymbal = CYMBALS.has(nodeName)
    node.rotation.z = cymbal ? Math.sin(performance.now() * .045) * amount * (active.name === 'hihatOpen' ? .2 : .12) : 0
    node.scale.y = 1 - amount * (cymbal ? .02 : .08)
  }
}

// R3F pointer event → pad id of the first intersected drum/cymbal (skips invisible colliders).
export function padFromEvent(event) {
  for (const { object } of event.intersections) {
    for (let node = object; node; node = node.parent) if (NODE_PAD[node.name]) return NODE_PAD[node.name]
  }
  return null
}
