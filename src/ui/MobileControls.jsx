import { useEffect, useRef, useState } from 'react'
import { noteName } from '../audio/takes'

const STICK_RADIUS = 48
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12]
const BLACK_KEYS = [
  { offset: 1, after: 0 }, { offset: 3, after: 1 },
  { offset: 6, after: 3 }, { offset: 8, after: 4 }, { offset: 10, after: 5 },
]

export function MobileExploreControls({ input, near, onInteract, onCurtain }) {
  const stickPointer = useRef(null)
  const lookPointer = useRef(null)
  const lookLast = useRef([0, 0])
  const [stick, setStick] = useState([0, 0])

  useEffect(() => () => {
    Object.assign(input.current, { forward: 0, strafe: 0, lookX: 0, lookY: 0, sprint: false })
  }, [input])

  const updateStick = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left - rect.width / 2) / STICK_RADIUS
    const y = (event.clientY - rect.top - rect.height / 2) / STICK_RADIUS
    const length = Math.max(1, Math.hypot(x, y))
    const strafe = x / length, forward = -y / length
    input.current.strafe = strafe
    input.current.forward = forward
    setStick([strafe, -forward])
  }
  const stopStick = event => {
    if (stickPointer.current !== event.pointerId) return
    stickPointer.current = null
    input.current.strafe = 0
    input.current.forward = 0
    setStick([0, 0])
  }
  const stopLook = event => { if (lookPointer.current === event.pointerId) lookPointer.current = null }

  return <div className="mobile-explore" data-testid="mobile-explore">
    <div className="mobile-look-zone" aria-label="拖动观察房间" data-testid="mobile-look"
      onPointerDown={event => { event.preventDefault(); event.stopPropagation(); lookPointer.current = event.pointerId; lookLast.current = [event.clientX, event.clientY]; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={event => { if (lookPointer.current !== event.pointerId) return; input.current.lookX += event.clientX - lookLast.current[0]; input.current.lookY += event.clientY - lookLast.current[1]; lookLast.current = [event.clientX, event.clientY] }}
      onPointerUp={stopLook} onPointerCancel={stopLook} onLostPointerCapture={stopLook}/>
    <div className="mobile-stick" aria-label="移动摇杆" data-testid="mobile-joystick"
      onPointerDown={event => { event.preventDefault(); event.stopPropagation(); stickPointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); updateStick(event) }}
      onPointerMove={event => { if (stickPointer.current === event.pointerId) updateStick(event) }}
      onPointerUp={stopStick} onPointerCancel={stopStick} onLostPointerCapture={stopStick}>
      <div className="mobile-stick-knob" style={{ transform: `translate(${stick[0] * 39}px, ${stick[1] * 39}px)` }}/>
    </div>
    <button className="mobile-sprint" onPointerDown={event => { event.stopPropagation(); input.current.sprint = true; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerUp={() => { input.current.sprint = false }} onPointerCancel={() => { input.current.sprint = false }} onLostPointerCapture={() => { input.current.sprint = false }}>快走</button>
    <button className="mobile-curtain" onClick={event => { event.stopPropagation(); onCurtain() }}>窗帘</button>
    <button className="mobile-interact" disabled={!near} data-testid="mobile-interact" onClick={event => { event.stopPropagation(); onInteract() }}>{near ? `互动 · ${near}` : '靠近物品'}</button>
  </div>
}

export function MobilePianoKeys({ game }) {
  const press = (event, offset) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    game.noteOn(`touch-${event.pointerId}`, game.pianoBase + offset)
  }
  const release = event => game.noteOff(`touch-${event.pointerId}`)
  return <div className="mobile-piano" data-testid="mobile-piano" onClick={event => event.stopPropagation()}>
    {WHITE_OFFSETS.map(offset => <button key={offset} className="mobile-white-key" aria-label={noteName(game.pianoBase + offset)}
      onPointerDown={event => press(event, offset)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{noteName(game.pianoBase + offset)}</button>)}
    {BLACK_KEYS.map(({ offset, after }) => <button key={offset} className="mobile-black-key" style={{ left: `${(after + 1) / WHITE_OFFSETS.length * 100}%` }} aria-label={noteName(game.pianoBase + offset)}
      onPointerDown={event => press(event, offset)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}/>)}
  </div>
}
