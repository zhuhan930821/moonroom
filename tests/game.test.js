import test from 'node:test'
import assert from 'node:assert/strict'
import { isBlocked, movePlayer, nearestInteraction } from '../src/game/collision.js'
import { INTERACTIONS, QA_SPAWNS, START } from '../src/config/scene.js'

test('room walls and furniture block the player while open floor remains walkable', () => {
  assert.equal(isBlocked(0, 0), false)
  assert.equal(isBlocked(9.3, 1.0), true)
  assert.equal(isBlocked(7.15, 3), true)
  assert.equal(isBlocked(-7.1, -2.8), true)
  for (const point of [START, ...Object.values(QA_SPAWNS)]) assert.equal(isBlocked(point[0],point[2]), false, `spawn ${point} must be walkable`)
  for (let z = 1.3; z <= 5.5; z += .35) assert.equal(isBlocked(3.55,z), false, `bed-side corridor blocked at ${z}`)
})

test('interaction targeting chooses nearby objects only', () => {
  assert.equal(nearestInteraction({ x: -6.5, z: -.5 }, INTERACTIONS), 'drums')
  assert.equal(nearestInteraction({ x: 1.3, z: 3.0 }, INTERACTIONS), 'beanbag')
  assert.equal(nearestInteraction({ x: 0, z: 0 }, INTERACTIONS), null)
})

test('movement faces the window, slides along obstacles, and cannot tunnel through a wall', () => {
  const first = movePlayer({x:0,z:5.7},0,1,0,3.5,.5)
  assert.ok(first.z < 5.7)
  let point={x:0,z:0}
  for(let i=0;i<200;i++) point=movePlayer(point,0,1,0,5.6,.05)
  assert.equal(isBlocked(point.x,point.z),false)
  assert.ok(point.z > -3.2, `desk should stop forward motion at ${point.z}`)
  let corridor={x:3.55,z:5.1}
  for(let i=0;i<20;i++) corridor=movePlayer(corridor,0,1,0,3.5,.05)
  assert.ok(corridor.z<2)
  assert.equal(isBlocked(corridor.x,corridor.z),false)
})
