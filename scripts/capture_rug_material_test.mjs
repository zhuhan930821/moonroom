import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const output = 'screenshots/rug-material-test'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(90000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
const result = {}
for (const [name, query] of [
  ['before-hero', 'spawn=hero'],
  ['after-hero', 'spawn=hero&rugMaterialTest=1'],
  ['before-close', 'spawn=floorClose'],
  ['after-close', 'spawn=floorClose&rugMaterialTest=1'],
]) {
  await page.goto(`http://localhost:5174/?capture=1&${query}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(10000)
  await page.screenshot({ path: `${output}/${name}.png` })
  result[name] = await page.evaluate(() => ({
    mode: document.querySelector('main')?.dataset.mode,
    performance: window.__moonroomPerf ?? null,
  }))
}
await writeFile(`${output}/capture-results.json`, JSON.stringify({ result, errors }, null, 2))
console.log(JSON.stringify({ result, errors }, null, 2))
await browser.close()
