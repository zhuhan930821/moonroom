import { COLLIDERS, PLAYER, ROOM } from '../config/scene.js'
import { worldPhysics } from '../worlds/worldState.js'
import { insideLoft, loft } from './loft.js'

// Room decor can add its own footprints (src/scene/ReferenceDecor.jsx).
export const DECOR_COLLIDERS = []

export function isBlocked(x, z) {
  const r = PLAYER.radius
  // Behind the Anywhere Door: a round walkable area with round obstacles.
  if (worldPhysics.active && worldPhysics.walkable) return !worldPhysics.walkable(x, z)
  if (worldPhysics.active) return Math.hypot(x, z) > worldPhysics.radius - r || worldPhysics.blockers.some(b => Math.hypot(x - b.x, z - b.z) < b.r + r)
  if (loft.get().onLoft) return !insideLoft(x, z, r) // up on the loft deck
  if (x < -ROOM.width / 2 + r || x > ROOM.width / 2 - r || z < -ROOM.depth / 2 + r || z > ROOM.depth / 2 - r) return true
  return COLLIDERS.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ)
    || DECOR_COLLIDERS.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ)
}

export function movePlayer(position, yaw, forward, strafe, speed, delta) {
  if (!forward && !strafe) return position
  const length = Math.hypot(forward, strafe)
  const dt = Math.min(delta, .05)
  const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length * speed * dt
  const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / length * speed * dt
  const x = isBlocked(position.x + dx, position.z) ? position.x : position.x + dx
  const z = isBlocked(x, position.z + dz) ? position.z : position.z + dz
  return { x, z }
}

// With a yaw, things behind you (more than ~105° off where you look) don't count unless you're
// right on top of them, so standing near a bookcase while facing away doesn't offer its books.
export function nearestInteraction(position, interactions, yaw = null, onLoft = false) {
  let closest = null
  let distance = Infinity
  Object.entries(interactions).forEach(([key, item]) => {
    if (!!item.loft !== onLoft) return // loft things only from the loft, room things only from the floor
    const dx = item.position[0] - position.x, dz = item.position[2] - position.z
    const d = Math.hypot(dx, dz)
    if (yaw != null && d > .6) {
      const facing = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / d
      if (facing < -.26) return
    }
    if (d < item.radius && d < distance) { closest = key; distance = d }
  })
  return closest
}
