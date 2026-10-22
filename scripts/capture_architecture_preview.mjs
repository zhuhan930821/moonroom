import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const output = 'screenshots/architecture-phase-1/browser-preview'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(90000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('response', response => {
  if (response.status() >= 400 && response.url().includes('/assets/')) errors.push(`${response.status()} ${response.url()}`)
})
const allViews = [
  ['curtainWall', 'front'],
  ['drumCorner', 'drum-corner'],
  ['deskView', 'desk'],
]
const views = process.env.MOONROOM_ARCH_VIEWS === 'focused' ? allViews.slice(0, 2) : allViews
const stats = {}
for (const [spawn, name] of views) {
  await page.goto(`http://localhost:5174/?spawn=${spawn}&capture=1&drumCandidate=1&architecture=blender`)
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${output}/${name}.png` })
  stats[name] = await page.evaluate(() => ({ mode: document.querySelector('main')?.dataset.mode, performance: window.__moonroomPerf ?? null }))
}
console.log(JSON.stringify({ stats, errors }, null, 2))
await browser.close()
