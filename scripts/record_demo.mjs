// Scripted product video: welcome → room → drum take → piano take → CRT Studio → Mugo → sofa.
// Runs a real (GPU) Chromium window in SLOW MOTION (every page clock — rAF, timers,
// performance/Date, audio clock, CSS animations — runs SLOW× slower), grabs frames via the
// CDP screencast, then rebuilds the soundtrack offline from the room's sound-event log, so a
// slow laptop still yields a smooth 30 fps video with sample-accurate audio.
//
//   npm run dev -- --port 5174          (Moonroom)
//   FFMPEG=/path/to/ffmpeg node scripts/record_demo.mjs out/moonroom-demo.mp4
import { chromium } from 'playwright'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const output = path.resolve(process.argv[2] || 'screenshots/demo/moonroom-demo.mp4')
const work = path.join(path.dirname(output), 'frames')
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const base = process.env.MOONROOM_URL || 'http://localhost:5174'
const W = 1280, H = 720
const SLOW = Number(process.env.SLOW || 4)

await rm(work, { recursive: true, force: true })
await mkdir(work, { recursive: true })

const browser = await chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H + 90}`] })
const page = await browser.newPage({ viewport: { width: W, height: H } })
page.setDefaultTimeout(600000)
// Applies to every frame, including the Mugo iframe.
await page.addInitScript(S => {
  const realNow = performance.now.bind(performance)
  const t0 = realNow()
  performance.now = () => t0 + (realNow() - t0) / S
  const realDate = Date.now
  const d0 = realDate()
  window.__realDateNow = realDate
  Date.now = () => d0 + (realDate() - d0) / S
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = cb => raf(ts => cb(t0 + (ts - t0) / S))
  const timeout = window.setTimeout.bind(window), interval = window.setInterval.bind(window)
  window.setTimeout = (fn, ms = 0, ...args) => timeout(fn, ms * S, ...args)
  window.setInterval = (fn, ms = 0, ...args) => interval(fn, ms * S, ...args)
  const clock = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime')
  Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { get() { return this instanceof OfflineAudioContext ? clock.get.call(this) : clock.get.call(this) / S } })
  const slowCss = () => { document.getAnimations?.().forEach(a => { if (a.playbackRate !== 1 / S) a.playbackRate = 1 / S }); raf(slowCss) }
  raf(slowCss)
}, SLOW)
const errors = []
page.on('pageerror', e => errors.push(e.message))

await page.goto(`${base}/?demo=1`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(9000) // let GLBs and textures land before the camera rolls

// Page-side helpers: eased camera moves and precisely timed key sequences.
await page.evaluate(() => {
  const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
  window.__tween = (to, ms) => new Promise(resolve => {
    const from = window.__moonroomCamera.get()
    let dy = (to.yaw ?? from.yaw) - from.yaw
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    const t0 = performance.now()
    const step = now => {
      const k = ease(Math.min(1, (now - t0) / ms))
      window.__moonroomCamera.set({
        position: to.position ? from.position.map((v, i) => v + (to.position[i] - v) * k) : undefined,
        yaw: from.yaw + dy * k,
        pitch: to.pitch != null ? from.pitch + (to.pitch - from.pitch) * k : undefined,
      })
      if (k < 1) requestAnimationFrame(step); else resolve()
    }
    requestAnimationFrame(step)
  })
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }))
  window.__keys = seq => new Promise(resolve => {
    let last = 0
    for (const { t, code, hold } of seq) {
      setTimeout(() => key('keydown', code), t)
      setTimeout(() => key('keyup', code), t + (hold ?? 90))
      last = Math.max(last, t + (hold ?? 90))
    }
    setTimeout(resolve, last + 50)
  })
  window.__press = code => window.__keys([{ t: 0, code }])
})

// Frames: CDP screencast with wall-clock timestamps (variable frame rate, resampled later).
const cdp = await page.context().newCDPSession(page)
const frames = []
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = path.join(work, `f${String(frames.length).padStart(6, '0')}.jpg`)
  frames.push({ file, at: metadata.timestamp * 1000 })
  writeFile(file, Buffer.from(data, 'base64'))
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
const wait = ms => page.waitForTimeout(ms * SLOW) // script times are in video time
const cam = (to, ms) => page.evaluate(([to, ms]) => window.__tween(to, ms), [to, ms])
const keys = seq => page.evaluate(seq => window.__keys(seq), seq)
const press = code => page.evaluate(code => window.__press(code), code)

// 1 · Welcome
await wait(2600)
await page.click('.welcome button')
// Sound log starts right after the click created the AudioContext; remember the real wall
// time of that instant so audio can be placed on the frame timeline.
const audioStart = await page.evaluate(() => { window.__moonroomAudio.startDemoLog(); return window.__realDateNow() })
await page.evaluate(() => document.exitPointerLock?.())

// 2 · The room
await page.evaluate(() => window.__moonroomCamera.set({ yaw: .55, pitch: -.02 }))
await wait(700)
await cam({ yaw: -.65, pitch: .05 }, 6500)
await cam({ position: [-1.2, 1.68, 3.4], yaw: .1, pitch: .12 }, 3200)

// 3 · Drums: record two bars at 100 BPM, then play the take back
await cam({ position: [-5.6, 1.68, 1.2], yaw: .36, pitch: -.12 }, 3400)
await press('KeyE'); await wait(1800)
const e = 300 // eighth note at 100 BPM
const groove = []
for (let bar = 0; bar < 2; bar++) for (let i = 0; i < 8; i++) {
  const t = 400 + (bar * 8 + i) * e
  if (bar === 1 && i >= 6) continue
  groove.push({ t, code: 'KeyL' })
  if (i === 0 || i === 3 || i === 4) groove.push({ t, code: 'KeyJ' })
  if (i === 2 || i === 6) groove.push({ t, code: 'KeyK' })
}
;['KeyU', 'KeyU', 'KeyI', 'KeyO'].forEach((code, i) => groove.push({ t: 400 + 14 * e + i * e / 2, code }))
groove.push({ t: 400 + 16 * e, code: 'KeyY' }, { t: 400 + 16 * e, code: 'KeyJ' })
groove.unshift({ t: 0, code: 'KeyR' })
groove.push({ t: 400 + 16 * e + 900, code: 'KeyR' })
await keys(groove)
await wait(600)
await press('Space'); await wait(5600)
await press('Escape'); await wait(900)

// 4 · Piano: C – Am – F – G arpeggios over held left-hand roots, recorded
await cam({ position: [-6.9, 1.68, 2.6], yaw: Math.PI / 2, pitch: -.15 }, 2600)
await press('KeyE'); await wait(1900)
const q = 333, bar = 8 * q
const bars = [['KeyZ', ['KeyQ', 'KeyE', 'KeyT', 'KeyI', 'KeyT', 'KeyE', 'KeyT', 'KeyE']],
  ['KeyN', ['KeyQ', 'KeyE', 'KeyY', 'KeyI', 'KeyY', 'KeyE', 'KeyY', 'KeyE']],
  ['KeyV', ['KeyQ', 'KeyR', 'KeyY', 'KeyI', 'KeyY', 'KeyR', 'KeyY', 'KeyR']],
  ['KeyB', ['KeyW', 'KeyT', 'KeyU', 'KeyO', 'KeyU', 'KeyT', 'KeyU', 'KeyT']]]
const melody = [{ t: 0, code: 'Enter' }]
bars.forEach(([root, notes], b) => {
  const start = 300 + b * bar
  melody.push({ t: start, code: root, hold: bar - 40 })
  notes.forEach((code, i) => melody.push({ t: start + i * q, code, hold: q - 40 }))
})
const end = 300 + 4 * bar
;['KeyZ', 'KeyQ', 'KeyE', 'KeyT', 'KeyI'].forEach(code => melody.push({ t: end, code, hold: 1600 }))
melody.push({ t: end + 1900, code: 'Enter' })
await keys(melody)
await wait(500)
await press('Escape'); await wait(900)

// 5 · CRT Studio: open the piano take and loop it
await cam({ position: [-2.65, 1.68, -2.4], yaw: 0, pitch: -.1 }, 3200)
await press('KeyE'); await wait(1800)
await page.click('[data-testid=icon-studio]'); await wait(900)
await page.click('[data-testid=studio-play]'); await wait(6500)
await page.click('[data-testid=studio-play]'); await wait(400)
await page.click('.studio-close'); await wait(300)
await press('Escape'); await wait(900)

// 6 · Mugo on the desk laptop
await cam({ position: [1.35, 1.68, -2.4], yaw: 0, pitch: -.1 }, 2400)
await press('KeyE'); await wait(6500)
await page.click('.mugo-bar button'); await wait(900)

// 7 · Sofa, moon, fade
await cam({ position: [1.35, 1.68, 1.05], yaw: Math.PI, pitch: -.15 }, 2600) // inside the sofa's 2.25 m interaction radius
await press('KeyE'); await wait(6500)

// Stop frames, then render the soundtrack offline (video-time seconds from the log origin).
await cdp.send('Page.stopScreencast')
const lastFrame = frames.at(-1).at
const audioSeconds = (lastFrame - audioStart) / 1000 / SLOW + 1
const audioBase64 = await page.evaluate(async seconds => {
  const blob = await window.__moonroomAudio.renderDemoLog(seconds)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
  return btoa(binary)
}, audioSeconds)
await browser.close()
await writeFile(path.join(work, 'audio.wav'), Buffer.from(audioBase64, 'base64'))

// Frame durations and the audio offset are real time ÷ SLOW. Keep the timing in meta.json so a
// failed mux can be rerun without recording again.
const list = frames.map((f, i) => `file '${f.file}'\nduration ${(((frames[i + 1]?.at ?? f.at + 40 * SLOW) - f.at) / 1000 / SLOW).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`
await writeFile(path.join(work, 'frames.txt'), list)
const offset = Math.max(0, (audioStart - frames[0].at) / 1000 / SLOW)
await writeFile(path.join(work, 'meta.json'), JSON.stringify({ SLOW, offset, frames: frames.length }))
execFileSync(ffmpeg, ['-y', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', path.join(work, 'frames.txt'),
  '-itsoffset', offset.toFixed(3), '-i', path.join(work, 'audio.wav'),
  '-vf', `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=0.8`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', output])
console.log(JSON.stringify({ output, frames: frames.length, seconds: ((lastFrame - frames[0].at) / 1000 / SLOW).toFixed(1), fps: (frames.length / ((lastFrame - frames[0].at) / 1000 / SLOW)).toFixed(1), audioOffset: offset, errors }, null, 1))
