import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const output = 'screenshots/architecture-visual-correction'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(90000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const views = [
  ['old-architecture-baseline', 'http://localhost:5174/?spawn=hero&capture=1&architecture=legacy&visualBaseline=1'],
  ['new-architecture-corrected', 'http://localhost:5174/?spawn=hero&capture=1'],
]
if (process.env.MOONROOM_CORRECTION_ONLY === '1') views.shift()
const stats = {}
for (const [name, url] of views) {
  await page.goto(url)
  await page.waitForTimeout(8500)
  await page.screenshot({ path: `${output}/${name}.png` })
  stats[name] = await page.evaluate(() => ({ mode: document.querySelector('main')?.dataset.mode, performance: window.__moonroomPerf ?? null }))
}
console.log(JSON.stringify({ stats, errors }, null, 2))
await browser.close()
