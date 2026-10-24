import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_POSES, PLAYER, QA_LOOKS, QA_SPAWNS, START, START_LOOK } from '../config/scene'
import { movePlayer } from './collision'
import { FLAGS } from '../config/flags'
import { worldPhysics } from '../worlds/worldState'

export const playerRig = { teleport: null }

const keys = new Set()

export default function PlayerController({ locked, mode, onPosition, activeBookShelf = 'right', touchInput, touchEnabled = false }) {
  const { camera } = useThree()
  const spawnName = FLAGS.spawn
  const initialLook = QA_LOOKS[spawnName] || START_LOOK
  const yaw = useRef(initialLook[0])
  const pitch = useRef(initialLook[1])
  const position = useRef(new THREE.Vector3(...(QA_SPAWNS[spawnName] || START)))
  const target = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Quaternion())
  const returning = useRef(false)

  // Anywhere Door: worlds place the player at their spawn and back at the door on return.
  useEffect(() => {
    playerRig.teleport = ({ position: p, yaw: y, pitch: x }) => {
      if (p) position.current.set(...p)
      if (y != null) yaw.current = y
      if (x != null) pitch.current = x
      returning.current = false
    }
    return () => { playerRig.teleport = null }
  }, [])

  // Demo capture: a script places the explore camera directly (no pointer lock needed).
  useEffect(() => {
    if (!FLAGS.demo) return
    window.__moonroomCamera = {
      get: () => ({ position: position.current.toArray(), yaw: yaw.current, pitch: pitch.current }),
      set: ({ position: p, yaw: y, pitch: x }) => {
        if (p) position.current.set(...p)
        if (y != null) yaw.current = y
        if (x != null) pitch.current = x
      },
    }
    return () => { delete window.__moonroomCamera }
  }, [])

  useEffect(() => {
    const down = e => keys.add(e.code)
    const up = e => keys.delete(e.code)
    const look = e => {
      if (document.pointerLockElement && mode === 'explore') {
        yaw.current -= e.movementX * 0.0022
        pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0019, -1.25, 1.25)
      }
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousemove', look)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousemove', look) }
  }, [mode])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    if (mode !== 'explore') {
      const pose = mode === 'books' && activeBookShelf === 'left' ? CAMERA_POSES.booksLeft : CAMERA_POSES[mode]
      if (!pose) return
      target.current.set(...pose.position)
      camera.position.lerp(target.current, 1 - Math.exp(-dt * 3.1))
      const poseCamera = camera.clone()
      poseCamera.position.copy(target.current)
      poseCamera.lookAt(...pose.lookAt)
      camera.quaternion.slerp(poseCamera.quaternion, 1 - Math.exp(-dt * 3.1))
      returning.current = true
      return
    }
    const touch = touchInput?.current
    if (touchEnabled && touch) {
      yaw.current -= touch.lookX * 0.0035
      pitch.current = THREE.MathUtils.clamp(pitch.current - touch.lookY * 0.003, -1.25, 1.25)
      touch.lookX = 0
      touch.lookY = 0
    }
    if (locked || touchEnabled) {
      const keyboardF = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)
      const keyboardS = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)
      const f = keyboardF || (touchEnabled ? touch?.forward || 0 : 0)
      const s = keyboardS || (touchEnabled ? touch?.strafe || 0 : 0)
      if (f || s) {
        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch?.sprint ? PLAYER.sprint : PLAYER.speed
        const strength = keyboardF || keyboardS ? 1 : Math.min(1, Math.hypot(f, s))
        const next = movePlayer(position.current, yaw.current, f, s, speed, dt)
        position.current.x += (next.x - position.current.x) * strength
        position.current.z += (next.z - position.current.z) * strength
      }
    }
    if (worldPhysics.active) position.current.y = PLAYER.height + worldPhysics.ground(position.current.x, position.current.z)
    desired.current.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
    if (returning.current) {
      camera.position.lerp(position.current, 1 - Math.exp(-dt * 4.3))
      camera.quaternion.slerp(desired.current, 1 - Math.exp(-dt * 4.3))
      if (camera.position.distanceTo(position.current) < .025) returning.current = false
    } else {
      camera.position.copy(position.current)
      camera.quaternion.copy(desired.current)
    }
    onPosition(position.current)
  })
  return null
}
