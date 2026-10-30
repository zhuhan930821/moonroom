import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const origin = process.env.MOONROOM_ORIGIN || 'http://127.0.0.1:5190'
const out = 'screenshots/botanical-band-review'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`))
try {
  await page.goto(`${origin}/?capture=1&spawn=hero&captureMode=band`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  try {
    await page.waitForFunction(() => Boolean(window.__moonroomCaptureScene?.getObjectByName('BAND_MirrorBall_Globe')), null, { timeout: 65000 })
  } catch (error) {
    errors.push(`mirror ball wait: ${error.message}`)
  }
  await page.waitForTimeout(1000)
  const cdp = await page.context().newCDPSession(page)
  const save = async name => {
    const frame = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(`${out}/${name}.png`, Buffer.from(frame.data, 'base64'))
  }
  await save('band-mirror-ball')
  await cdp.detach()
  const state = await page.evaluate(() => ({ mode: document.querySelector('main')?.dataset.mode, ball: Boolean(window.__moonroomCaptureScene?.getObjectByName('BAND_MirrorBall_Globe')), stage: Boolean(window.__moonroomCaptureScene?.getObjectByName('BandStage')), sceneChildren: window.__moonroomCaptureScene?.children?.map(child => child.name).filter(Boolean), perf: window.__moonroomPerf ?? null }))
  await writeFile(`${out}/result.json`, JSON.stringify({ errors, ...state }, null, 2))
  console.log(`${out}: captured band`)
} finally {
  await browser.close()
}
