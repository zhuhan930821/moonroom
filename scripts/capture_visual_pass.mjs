import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const label = process.argv[2] || 'before'
const isBefore = label.includes('before')
const decorOff = label.includes('decor-off')
const only = new Set(process.argv.slice(3))
const output = `screenshots/visual-overhaul-pass01/${label}`
const origin = process.env.MOONROOM_ORIGIN || 'http://127.0.0.1:5190'
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const errors = []
const results = {}
for (const [name, viewport, query] of [
  ['hero-desktop', { width: 1280, height: 720 }, 'spawn=hero'],
  ['desk-chair', { width: 1280, height: 720 }, 'spawn=deskView'],
  ['rug-close', { width: 1280, height: 720 }, 'spawn=floorClose'],
  ['hero-mobile', { width: 844, height: 390 }, 'mobile=1&spawn=hero'],
  ['drum-corner', { width: 900, height: 1050 }, 'spawn=drumCorner'],
  ['bed-corner', { width: 900, height: 1050 }, 'spawn=bedFrame'],
  ['ceiling-garden', { width: 1280, height: 720 }, 'spawn=ceilingGarden'],
  ['wall-left', { width: 1280, height: 720 }, 'spawn=bookshelfLeft'],
  ['wall-right', { width: 1280, height: 720 }, 'spawn=bookshelfRight'],
  ['wall-left-rear', { width: 1280, height: 720 }, 'spawn=wallLeftRear'],
  ['wall-right-bed', { width: 1280, height: 720 }, 'spawn=wallRightBed'],
]) {
  if (only.size && !only.has(name)) continue
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`))
  page.on('requestfailed', request => errors.push(`${name}: ${request.url()}: ${request.failure()?.errorText}`))
  await page.goto(`${origin}/?capture=1&${query}${isBefore ? '&visualPass=0' : ''}${decorOff ? '&decorPass02=0' : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  // GLBs can parse slowly in software-rendered CI; wait for the actual rug node.
  await page.waitForFunction(() => {
    const scene = window.__moonroomCaptureScene
    if (window.location.search.includes('spawn=deskView')) return Boolean(scene?.getObjectByName?.('DECOR_DeskChair'))
    return Boolean(scene?.getObjectByName?.(window.location.search.includes('visualPass=0') ? 'ARCH_Ceiling_Slab' : 'RUG_Persian_Floral_Woven_PASS01'))
  }, undefined, { timeout: 120000 })
  if (label.includes('dressing') && !isBefore && !decorOff) await page.waitForFunction(() => {
    let found = false
    window.__moonroomCaptureScene?.traverse?.(object => { if (object.name.startsWith('D02_BATCH')) found = true })
    return found
  }, undefined, { timeout: 120000 })
  await page.waitForTimeout(label.includes('dressing') ? 5000 : 1800)
  // CDP captures the current WebGL frame without Playwright waiting on remote fonts.
  const cdp = await page.context().newCDPSession(page)
  const frame = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(`${output}/${name}.png`, Buffer.from(frame.data, 'base64'))
  await cdp.detach()
  results[name] = await page.evaluate(() => ({
    mode: document.querySelector('main')?.dataset.mode,
    perf: window.__moonroomPerf ?? null,
  }))
  await page.close()
}
await browser.close()
await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2))
console.log(JSON.stringify({ output, results, errors }, null, 2))
