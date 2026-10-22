import { COLLIDERS, PLAYER, ROOM } from '../config/scene.js'

export function isBlocked(x, z) {
  const r = PLAYER.radius
  if (x < -ROOM.width / 2 + r || x > ROOM.width / 2 - r || z < -ROOM.depth / 2 + r || z > ROOM.depth / 2 - r) return true
  return COLLIDERS.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ)
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

export function nearestInteraction(position, interactions) {
  let closest = null
  let distance = Infinity
  Object.entries(interactions).forEach(([key, item]) => {
    const d = Math.hypot(position.x - item.position[0], position.z - item.position[2])
    if (d < item.radius && d < distance) { closest = key; distance = d }
  })
  return closest
}
