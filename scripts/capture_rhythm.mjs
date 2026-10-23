import { chromium } from 'playwright'
// Plays a seeded drum chart through the rhythm challenge (dev server on :5175).
const out = process.argv[2]
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.setDefaultTimeout(180000)
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => {
  const e = 60 / 100 / 2, ev = []
  for (let i = 0; i < 16; i++) { ev.push({ t: i * e, pad: 'hihat' }); if (i % 4 === 0) ev.push({ t: i * e, pad: 'kick' }); if (i % 4 === 2) ev.push({ t: i * e, pad: 'snare' }) }
  ev.push({ t: 16 * e, pad: 'crash' }, { t: 16 * e, pad: 'kick' })
  localStorage.setItem('moonroom.takes.v1', JSON.stringify([{ id: 'take-groove', name: 'Midnight Groove', bpm: 100, createdAt: 1, events: ev }]))
})
await page.goto('http://localhost:5175/?capture=1&demo=1&captureMode=drums&spawn=hero'); await page.waitForTimeout(16000)
await page.click('[data-testid=challenge-start]')
await page.waitForFunction(() => window.__moonroomGame?.challenge)
// Play along: dispatch keys at the chart times (the game judges whatever arrives).
await page.evaluate(() => {
  const game = window.__moonroomGame, { startAt, take } = game.challenge
  const key = { hihat: 'KeyL', kick: 'KeyJ', snare: 'KeyK', crash: 'KeyY' }
  take.events.forEach((event, i) => {
    if (i % 7 === 6) return // miss a few on purpose
    const wait = (startAt + event.t) * 1000 - performance.now() + (i % 3) * 30
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: key[event.pad] })), wait)
  })
})
await page.waitForTimeout(4200)
await page.screenshot({ path: `${out}-playing.png` })
await page.waitForSelector('[data-testid=rhythm-result]', { timeout: 60000 })
await page.screenshot({ path: `${out}-result.png` })
console.log(JSON.stringify({ errors, result: await page.locator('[data-testid=rhythm-result]').innerText() }))
await browser.close()
