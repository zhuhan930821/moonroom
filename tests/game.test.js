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

test('URL flags default to the approved room and only QA params override it', async () => {
  const { parseFlags } = await import('../src/config/flags.js')
  const base = parseFlags('')
  assert.equal(base.desk && base.laptop && base.midi && base.voile, true)
  assert.equal(base.drumCandidate || base.decorSample || base.capture, false)
  assert.equal(base.floor, 'polyhaven')
  assert.equal(base.lightingPass, 'golden')
  assert.equal(base.fairyLights, true)
  assert.equal(parseFlags('?lightingPass=current').fairyLights, false)
  const qa = parseFlags('?deskCandidate=0&floorMaterialTest=legacy&lightingPass=bloom&spawn=bed')
  assert.equal(qa.desk, false); assert.equal(qa.floor, 'phase1'); assert.equal(qa.lightingPass, 'bloom'); assert.equal(qa.captureName, 'bed')
})

test('the sofa day cycle runs night → dawn → day → dusk → night and loops', async () => {
  const { timeAt, CYCLE } = await import('../src/game/dayCycle.js')
  assert.equal(timeAt(0), 0); assert.equal(timeAt(9), 0, 'starts with a stretch of night')
  assert.equal(timeAt(35), 1, 'sunrise after 35 s'); assert.equal(timeAt(60), 2, 'full day at 60 s')
  assert.equal(timeAt(75), 2, 'day holds'); assert.ok(Math.abs(timeAt(105) - 1) < 1e-9, 'dusk'); assert.ok(timeAt(130) < 1e-9, 'night again')
  assert.equal(timeAt(CYCLE + 60), 2, 'loops')
  for (let t = 0; t < CYCLE; t += .5) { const v = timeAt(t); assert.ok(v >= 0 && v <= 2) }
})
