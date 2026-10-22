import { chromium } from 'playwright'
// Drum + piano recording -> Studio -> Mugo flow. Needs the dev server on :5174.
// Run: node scripts/capture_interaction_flow.mjs screenshots/interaction-01/flow
const out = process.argv[2]
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.setDefaultTimeout(120000)
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()))
const result = {}
// Drums
await page.goto('http://localhost:5174/?capture=1&captureMode=drums&spawn=drums'); await page.waitForTimeout(14000)
await page.keyboard.press('KeyJ'); await page.waitForTimeout(800) // warm sample load
await page.keyboard.press('KeyR'); await page.waitForTimeout(200)
for (const k of ['KeyJ','KeyL','KeyK','KeyL','KeyJ','KeyU','KeyI','KeyO','KeyY','Semicolon','KeyH']) { await page.keyboard.press(k); await page.waitForTimeout(160) }
result.drumRec = await page.locator('[data-testid=record-toggle]').innerText()
await page.screenshot({ path: `${out}-drums.png` })
await page.keyboard.press('KeyR'); await page.waitForTimeout(300)
// Piano
await page.goto('http://localhost:5174/?capture=1&captureMode=piano&spawn=drums'); await page.waitForTimeout(14000)
await page.keyboard.press('KeyZ'); await page.waitForTimeout(800)
await page.keyboard.press('Enter'); await page.waitForTimeout(200)
for (const k of ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyQ']) { await page.keyboard.down(k); await page.waitForTimeout(220); await page.keyboard.up(k); await page.waitForTimeout(60) }
await page.keyboard.down('KeyC'); await page.keyboard.down('KeyB'); await page.keyboard.down('KeyQ'); await page.waitForTimeout(150)
await page.screenshot({ path: `${out}-piano.png` })
for (const k of ['KeyC','KeyB','KeyQ']) await page.keyboard.up(k)
result.pianoRec = await page.locator('[data-testid=piano-record]').innerText()
await page.keyboard.press('Enter'); await page.waitForTimeout(300)
result.stored = await page.evaluate(() => JSON.parse(localStorage.getItem('moonroom.takes.v1') || '[]').map(t => ({ name: t.name, hits: t.events.length, pads: [...new Set(t.events.map(e => e.pad))].join(','), sample: t.events[0] })))
// Studio
await page.goto('http://localhost:5174/?capture=1&captureMode=computer&spawn=desk'); await page.waitForTimeout(12000)
await page.click('[data-testid=icon-studio]'); await page.waitForTimeout(500)
await page.click('[data-testid=studio-play]'); await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}-studio-piano.png` })
await page.locator('.studio-item', { hasText: 'Drums' }).click(); await page.waitForTimeout(300)
await page.click('text=Quantize 1/16'); await page.click('[data-testid=studio-play]'); await page.waitForTimeout(900)
await page.screenshot({ path: `${out}-studio-drums.png` })
// Mugo
await page.goto('http://localhost:5174/?capture=1&captureMode=mugo&spawn=desk&mugoUrl=about:blank'); await page.waitForTimeout(9000)
await page.screenshot({ path: `${out}-mugo.png` })
result.errors = errors
console.log(JSON.stringify(result, null, 1))
await browser.close()
