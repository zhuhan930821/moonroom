import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const output = 'screenshots/decor-phase01'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(120000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('response', response => {
  if (response.status() >= 400 && response.url().includes('/assets/')) errors.push(`${response.status()} ${response.url()}`)
})
const results = {}
for (const [name, spawn] of [['main-camera', 'hero'], ['ceiling-close', 'ceilingGarden']]) {
  await page.goto(`http://localhost:5174/?capture=1&decorSample=1&spawn=${spawn}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(25000)
  await page.screenshot({ path: `${output}/${name}.png`, timeout: 120000 })
  results[name] = await page.evaluate(() => ({ mode: document.querySelector('main')?.dataset.mode, perf: window.__moonroomPerf ?? null }))
}
await writeFile(`${output}/capture-results.json`, JSON.stringify({ results, errors }, null, 2))
console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
