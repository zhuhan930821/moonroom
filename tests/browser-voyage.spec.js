import { test, expect } from '@playwright/test'

test('ticket, piano departure, arrival and keepsake persist', async ({ page }) => {
  test.setTimeout(180000)
  await page.goto('http://127.0.0.1:5190/?demo=1&capture=1&whiteModel=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__moonroomGame?.started && window.__moonroomCamera, null, { timeout: 120000 })
  await page.evaluate(() => window.__moonroomCamera.set({ position: [-3.65, 1.68, -2.62] }))
  await page.waitForFunction(() => window.__moonroomGame?.near === 'moonTicket')
  // Let the capture-mode auto-start effect attach the key handler after the first render.
  await page.waitForTimeout(300)
  await page.keyboard.press('KeyE')
  let voyage = await page.evaluate(() => window.__moonroomJourney.get())
  expect(voyage.phase).toBe('ticket')

  await page.evaluate(() => window.__moonroomGame.enter('piano'))
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'piano')
  await page.keyboard.press('z')
  await page.keyboard.press('x')
  await page.keyboard.press('c')
  voyage = await page.evaluate(() => window.__moonroomJourney.get())
  expect(voyage.phase).toBe('travel')
  await page.keyboard.press('Escape')
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'explore')
  await page.evaluate(() => {
    const voyage = window.__moonroomJourney
    voyage.tick(voyage.get().departedAt + 32)
    voyage.collect()
  })
  expect(await page.evaluate(() => localStorage.getItem('moonroom.moon-river-ticket.v1'))).toBe('1')
  await page.reload({ waitUntil: 'domcontentloaded' })
  voyage = await page.evaluate(() => window.__moonroomJourney.get())
  expect(voyage.keepsake).toBe(true)
})
