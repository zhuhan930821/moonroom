// Scripted product video v2: room → drum take → rhythm challenge + castle → Mugo/Milo → piano jam →
// Studio press → turntable → foxes → lamps + diary → sofa day cycle.
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
await wait(2400)
await page.click('.welcome button')
const audioStart = await page.evaluate(() => { window.__moonroomAudio.startDemoLog(); return window.__realDateNow() })
await page.evaluate(() => document.exitPointerLock?.())

// 2 · The room at night
await page.evaluate(() => window.__moonroomCamera.set({ yaw: .5, pitch: -.02 }))
await wait(600)
await cam({ yaw: -.6, pitch: .05 }, 5200)

// 3 · Drums: record a groove (the garlands, river and stars breathe with it)
await cam({ position: [-5.6, 1.68, 1.2], yaw: .36, pitch: -.12 }, 3000)
await press('KeyE'); await wait(1600)
const e = 300
const groove = [{ t: 0, code: 'KeyR' }]
for (let i = 0; i < 16; i++) {
  const t = 300 + i * e
  groove.push({ t, code: 'KeyL' })
  if (i % 4 === 0 || i === 11) groove.push({ t, code: 'KeyJ' })
  if (i % 4 === 2) groove.push({ t, code: 'KeyK' })
}
groove.push({ t: 300 + 16 * e, code: 'KeyY' }, { t: 300 + 16 * e, code: 'KeyJ' }, { t: 300 + 16 * e + 700, code: 'KeyR' })
await keys(groove)
await wait(500)

// 4 · Rhythm challenge on that take
await press('KeyG')
await page.waitForFunction(() => window.__moonroomGame?.challenge)
await page.evaluate(() => {
  const { startAt, take } = window.__moonroomGame.challenge
  const code = { hihat: 'KeyL', kick: 'KeyJ', snare: 'KeyK', crash: 'KeyY' }
  for (const event of take.events) setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: code[event.pad] })), (startAt + event.t) * 1000 - performance.now())
})
await page.waitForSelector('[data-testid=rhythm-result]')
await wait(1800)
await page.click('.rhythm-actions button:last-child')
await wait(600)
await press('Escape'); await wait(600)

// 5 · Mugo on the desk laptop: invite Milo over
await cam({ position: [1.35, 1.68, -2.4], yaw: 0, pitch: -.1 }, 2600)
await press('KeyE'); await wait(4500)
await page.click('[data-testid=invite-milo]'); await wait(900)
await page.click('.mugo-bar button:last-child'); await wait(600)

// 6 · Piano with Milo jamming on the kit, recorded together
await cam({ position: [-6.9, 1.68, 2.6], yaw: Math.PI / 2 - .35, pitch: -.12 }, 2800)
await press('KeyE'); await wait(1600)
const q = 300, bar = 8 * q
const bars = [['KeyZ', ['KeyQ', 'KeyE', 'KeyT', 'KeyI']], ['KeyN', ['KeyQ', 'KeyE', 'KeyY', 'KeyI']], ['KeyV', ['KeyQ', 'KeyR', 'KeyY', 'KeyI']], ['KeyB', ['KeyW', 'KeyT', 'KeyU', 'KeyO']]]
const melody = [{ t: 0, code: 'Enter' }]
bars.forEach(([root, notes], b) => {
  const start = 300 + b * bar
  melody.push({ t: start, code: root, hold: bar - 40 })
  ;[...notes, ...notes.slice(1, 3).reverse(), notes[0]].forEach((code, i) => i < 8 && melody.push({ t: start + i * q, code, hold: q - 40 }))
})
melody.push({ t: 300 + 4 * bar + 500, code: 'Enter' })
await keys(melody)
await wait(400)
await press('Escape'); await wait(600)

// 7 · CRT Studio: open the take and press it to vinyl (castle lights again)
await cam({ position: [-2.65, 1.68, -2.4], yaw: 0, pitch: -.1 }, 2800)
await press('KeyE'); await wait(1500)
await page.click('[data-testid=icon-studio]'); await wait(900)
await page.click('[data-testid=studio-play]'); await wait(3000)
await page.click('[data-testid=studio-play]')
await page.click('[data-testid=studio-press]'); await wait(1600)
await page.click('.studio-close'); await wait(300)
await press('Escape'); await wait(600)

// 8 · Turntable: put the new record on; it keeps spinning as you roam
await cam({ position: [-5.65, 1.68, 5.2], yaw: 1.72, pitch: -.35 }, 3200)
await press('KeyE'); await wait(1500)
await page.click('.record-list button >> nth=0'); await wait(4500)
await press('Escape'); await wait(600)

// 9 · 云团 trots over to the sofa to listen
await cam({ position: [1.5, 1.5, 1.0], yaw: -2.2, pitch: -.38 }, 3400)
await wait(5000)

// 10 · Lamps off, moonlight takes over; a diary page from the bookshelf
await cam({ position: [4.1, 1.68, 1.35], yaw: .2, pitch: -.05 }, 2400)
await press('KeyE'); await wait(1800)
await cam({ position: [6.6, 1.68, -2.6], yaw: -1.45, pitch: 0 }, 2600)
await press('KeyE'); await wait(3800)
await press('KeyE'); await wait(3000)
await press('Escape'); await wait(600)

// 11 · Lie down: night turns to dawn, then day
await cam({ position: [1.35, 1.68, 1.05], yaw: Math.PI, pitch: -.15 }, 3000)
await press('KeyE'); await wait(2500)
await page.evaluate(() => {
  const room = window.__moonroomRoom.get(), t0 = performance.now()
  const step = () => { const k = Math.min(1, (performance.now() - t0) / 11000); room.forceTime = 2 * (k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(step) }
  requestAnimationFrame(step)
})
await wait(13500)

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
