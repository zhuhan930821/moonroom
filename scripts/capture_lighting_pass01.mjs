import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const output = 'screenshots/cinematic-lighting-pass-01'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(90000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
let views = [
  ['01-current', 'current'],
  ['02-moonlight-only', 'moon'],
  ['03-warm-only', 'warm'],
  ['04-combined', 'combined'],
  ['05-combined-bloom', 'bloom'],
]
if (process.env.MOONROOM_LIGHTING_VARIANTS_ONLY === '1') views = views.slice(1)
const stats = {}
for (const [name, lightingPass] of views) {
  await page.goto(`http://localhost:5175/?spawn=hero&capture=1&lightingPass=${lightingPass}`)
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${output}/${name}.png` })
  stats[name] = await page.evaluate(() => window.__moonroomPerf ?? null)
}
console.log(JSON.stringify({ stats, errors }, null, 2))
await browser.close()
