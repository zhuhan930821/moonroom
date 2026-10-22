import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

// Golden lighting pass: same spawn, current vs golden (+ fairy lights/candles).
const base = process.env.MOONROOM_URL || 'http://localhost:5174'
const output = 'screenshots/golden-pass-01'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(180000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) errors.push(`${response.status()} ${response.url()}`) })
const results = {}
const spawns = (process.env.SPAWNS || 'hero,drumCorner,bed,deskView').split(',')
for (const spawn of spawns) for (const pass of (process.env.PASSES || 'current,golden').split(',')) {
  const name = `${spawn}-${pass}`
  await page.goto(`${base}/?capture=1&spawn=${spawn}&lightingPass=${pass}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(Number(process.env.WAIT || 20000))
  await page.screenshot({ path: `${output}/${name}.png` })
  results[name] = await page.evaluate(() => window.__moonroomPerf ?? null)
}
await writeFile(`${output}/capture-results.json`, JSON.stringify({ results, errors }, null, 2))
console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
