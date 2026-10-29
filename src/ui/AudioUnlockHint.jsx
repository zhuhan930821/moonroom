import { useEffect, useState } from 'react'
import { audioGraph, prepareAudio } from '../audio/drums'

// Browsers only start sound after a click / tap / key press, and a controller button doesn't
// count. If the room was started from a controller and is still silent, say so; the first
// click or key press anywhere turns the sound on.
export default function AudioUnlockHint({ started }) {
  const [silent, setSilent] = useState(false)
  useEffect(() => {
    if (!started) return
    const check = () => setSilent(audioGraph().ctx.state === 'suspended')
    const unlock = () => { prepareAudio().then(check).catch(check) }
    check()
    const timer = setInterval(check, 1500)
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock)
    return () => { clearInterval(timer); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [started])
  return silent ? <div className="audio-unlock" data-testid="audio-unlock">🔈 点一下屏幕（或按任意键）打开声音</div> : null
}
