import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_POSES, PLAYER, QA_LOOKS, QA_SPAWNS, START, START_LOOK } from '../config/scene'
import { movePlayer } from './collision'
import { FLAGS } from '../config/flags'
import { worldPhysics } from '../worlds/worldState'
import { LOFT_Y, ROPE, ROPE_STAND, climbState, loft } from './loft'
import { padInput } from './gamepad'

export const playerRig = { teleport: null }

// Resting spots with a card on screen: you can still look around by dragging (mouse or finger)
// anywhere outside the card; leaving the spot resets the view.
const LOOK_MODES = ['bed', 'beanbag', 'deskChair', 'telescope', 'stargaze', 'rehearsal']
const LOOK_YAW = 1.4, LOOK_PITCH = .6
const FOV = 66, TELESCOPE_FOV = 17

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
  const poseLook = useRef(new THREE.Camera())
  const returning = useRef(false)
  const restLook = useRef({ yaw: 0, pitch: 0, drag: null })
  const offsetQ = useRef(new THREE.Quaternion())

  // Anywhere Door: worlds place the player at their spawn and back at the door on return.
  useEffect(() => {
    playerRig.teleport = ({ position: p, yaw: y, pitch: x, smooth = false }) => {
      if (p) position.current.set(...p)
      if (y != null) yaw.current = y
      if (x != null) pitch.current = x
      returning.current = smooth // smooth: the camera glides there (e.g. stepping onto the loft)
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

  useEffect(() => {
    const st = restLook.current
    st.yaw = 0; st.pitch = 0; st.drag = null
    if (!LOOK_MODES.includes(mode)) return
    const down = e => {
      if (e.target?.closest?.('button, input, textarea, .personal-panel, .mode-panel, .settings')) return
      st.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }
    const move = e => {
      const d = st.drag
      if (!d || d.id !== e.pointerId) return
      const k = (e.pointerType === 'touch' ? .0045 : .0035) * (mode === 'telescope' ? .3 : 1) // fine aim through the lens
      st.yaw = THREE.MathUtils.clamp(st.yaw - (e.clientX - d.x) * k, -LOOK_YAW, LOOK_YAW)
      st.pitch = THREE.MathUtils.clamp(st.pitch - (e.clientY - d.y) * k, -LOOK_PITCH, LOOK_PITCH)
      d.x = e.clientX; d.y = e.clientY
    }
    const up = e => { if (st.drag?.id === e.pointerId) st.drag = null }
    window.addEventListener('pointerdown', down); window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
    }
  }, [mode])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    // Telescope narrows the view; everything else uses the normal lens.
    const wantFov = mode === 'telescope' ? TELESCOPE_FOV : FOV
    if (Math.abs(camera.fov - wantFov) > .05) { camera.fov += (wantFov - camera.fov) * (1 - Math.exp(-dt * 4)); camera.updateProjectionMatrix() }
    if (mode === 'climb') {
      // Rope climb: rise with the climb's progress, swaying with the rope, looking at the rope
      // just above your hands; near the top the view tips over the rail onto the deck.
      const p = climbState.current.progress, t = clock.elapsedTime
      const sway = Math.sin(t * 1.6) * .05 * (.4 + p)
      const top = LOFT_Y + 1.55
      target.current.set(ROPE_STAND[0] - .25 * p + sway, PLAYER.height - .1 + (top - PLAYER.height + .1) * p, ROPE_STAND[1] + sway * .6)
      camera.position.lerp(target.current, 1 - Math.exp(-dt * 6))
      poseLook.current.position.copy(camera.position)
      poseLook.current.lookAt(ROPE.x - .9 * p * p, camera.position.y + .55 - .9 * p * p, ROPE.z)
      camera.quaternion.slerp(poseLook.current.quaternion, 1 - Math.exp(-dt * 5))
      returning.current = true
      return
    }
    if (mode !== 'explore') {
      const pose = mode === 'books' && activeBookShelf === 'left' ? CAMERA_POSES.booksLeft : CAMERA_POSES[mode]
      if (!pose) { returning.current = true; return } // e.g. band mode: the auto camera drives
      target.current.set(...pose.position)
      camera.position.lerp(target.current, 1 - Math.exp(-dt * 3.1))
      poseLook.current.position.copy(target.current)
      poseLook.current.lookAt(...pose.lookAt)
      const look = restLook.current
      if (LOOK_MODES.includes(mode)) {
        // drag to look around (same direction as walking around); stays where you leave it
        offsetQ.current.setFromEuler(new THREE.Euler(look.pitch, look.yaw, 0, 'YXZ'))
        poseLook.current.quaternion.multiply(offsetQ.current)
      }
      camera.quaternion.slerp(poseLook.current.quaternion, 1 - Math.exp(-dt * (look.drag ? 9 : 3.1)))
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
    // Controller: right stick looks (rate per second), left stick walks like the touch stick.
    const pad = padInput.active
    if (pad) {
      yaw.current -= padInput.lookX * 2.6 * dt
      pitch.current = THREE.MathUtils.clamp(pitch.current - padInput.lookY * 1.9 * dt, -1.25, 1.25)
    }
    if (locked || touchEnabled || pad) {
      const keyboardF = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)
      const keyboardS = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)
      const f = keyboardF || (touchEnabled ? touch?.forward || 0 : 0) || (pad ? padInput.forward : 0)
      const s = keyboardS || (touchEnabled ? touch?.strafe || 0 : 0) || (pad ? padInput.strafe : 0)
      if (f || s) {
        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch?.sprint || (pad && padInput.sprint) ? PLAYER.sprint : PLAYER.speed
        const strength = keyboardF || keyboardS ? 1 : Math.min(1, Math.hypot(f, s))
        const next = movePlayer(position.current, yaw.current, f, s, speed, dt)
        position.current.x += (next.x - position.current.x) * strength
        position.current.z += (next.z - position.current.z) * strength
      }
    }
    if (worldPhysics.active) position.current.y = PLAYER.height + worldPhysics.ground(position.current.x, position.current.z)
    else position.current.y = PLAYER.height + (loft.get().onLoft ? LOFT_Y : 0)
    desired.current.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
    if (returning.current) {
      camera.position.lerp(position.current, 1 - Math.exp(-dt * 4.3))
      camera.quaternion.slerp(desired.current, 1 - Math.exp(-dt * 4.3))
      // Do not snap to the explore camera until both translation and rotation
      // have converged. Some poses are almost at the player's position but
      // face a very different direction.
      if (camera.position.distanceTo(position.current) < .025 &&
          camera.quaternion.angleTo(desired.current) < .015) returning.current = false
    } else {
      camera.position.copy(position.current)
      camera.quaternion.copy(desired.current)
    }
    onPosition(position.current, yaw.current)
  })
  return null
}
