import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const output = 'screenshots/voile-whole-wall'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(90000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
await page.goto('http://localhost:5174/?spawn=curtainWall&capture=1&drumCandidate=1&voileSample=0')
await page.waitForTimeout(9000)
await page.screenshot({ path: `${output}/before-purple-curtain.png` })
const before = await page.evaluate(() => window.__moonroomPerf ?? null)
await page.goto('http://localhost:5174/?spawn=curtainWall&capture=1&drumCandidate=1')
await page.waitForTimeout(9000)
await page.screenshot({ path: `${output}/curtains-open.png` })
await page.keyboard.press('c')
await page.waitForTimeout(3000)
await page.screenshot({ path: `${output}/curtains-closed.png` })
await page.keyboard.press('c')
await page.waitForTimeout(3000)
await page.screenshot({ path: `${output}/curtains-reopened.png` })
const stats = await page.evaluate(() => ({ mode: document.querySelector('main')?.dataset.mode, performance: window.__moonroomPerf ?? null }))
console.log(JSON.stringify({ before, after: stats, errors }, null, 2))
await browser.close()
