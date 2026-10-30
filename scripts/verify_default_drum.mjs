import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const origin = process.env.MOONROOM_ORIGIN || 'http://127.0.0.1:5190'
const output = 'screenshots/default-art-katja-drum'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const [name, query] of [
    ['front', 'spawn=drumFront'],
    ['drummer', 'spawn=drums&captureMode=drums'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
    await page.goto(`${origin}/?capture=1&${query}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForFunction(() => {
      const scene = window.__moonroomCaptureScene
      return Boolean(scene?.getObjectByName?.('Candidate_DrumKit_Visual') && scene?.getObjectByName?.('Kick'))
    }, undefined, { timeout: 120_000 })
    await page.waitForTimeout(1500)
    const before = await page.evaluate(() => {
      const scene = window.__moonroomCaptureScene
      return {
        mode: document.querySelector('main')?.dataset.mode,
        candidate: Boolean(scene.getObjectByName('Candidate_DrumKit_Visual')),
        roots: ['Kick', 'Snare', 'Tom_One', 'Tom_Two', 'Floor_Tom', 'HiHat_Top', 'Crash', 'Ride'].filter(name => scene.getObjectByName(name)),
      }
    })
    if (name === 'drummer') await page.keyboard.press('KeyJ')
    const cdp = await page.context().newCDPSession(page)
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(`${output}/${name}.png`, Buffer.from(shot.data, 'base64'))
    await cdp.detach()
    results.push({ name, ...before, errors })
    await page.close()
  }
} finally {
  await browser.close()
}
await writeFile(`${output}/result.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
