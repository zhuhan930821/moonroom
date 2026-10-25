import { chromium } from 'playwright'

const origin = process.env.MOONROOM_ORIGIN || 'http://127.0.0.1:5190'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

async function enter(mode, spawn) {
  await page.goto(`${origin}/?capture=1&captureMode=${mode}&spawn=${spawn}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(expected => document.querySelector('main')?.dataset.mode === expected, mode, { timeout: 120000 })
  await page.waitForFunction(() => Boolean(window.__moonroomCaptureScene?.getObjectByName?.('RUG_Persian_Floral_Woven_PASS01')), undefined, { timeout: 120000 })
  await page.waitForTimeout(1000)
}

await enter('drums', 'drums')
await page.keyboard.press('KeyJ')
await page.keyboard.press('Escape')
await page.waitForTimeout(1500)
await page.waitForFunction(() => document.querySelector('main')?.dataset.mode === 'explore', undefined, { timeout: 15000 })

await enter('computer', 'desk')
await page.getByTestId('icon-diary').dispatchEvent('click')
const diaryOpened = await page.getByText('Diary — 17 October').isVisible()
await page.keyboard.press('Escape')
await page.waitForFunction(() => document.querySelector('main')?.dataset.mode === 'explore', undefined, { timeout: 15000 })

await browser.close()
if (!diaryOpened || errors.length) throw new Error(JSON.stringify({ diaryOpened, errors }))
console.log(JSON.stringify({ drumExit: true, diaryOpened, computerExit: true, errors }))
