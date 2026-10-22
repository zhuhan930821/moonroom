import { test, expect } from '@playwright/test'

test('Dream Lounge rest mode returns to exploration with E', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('http://localhost:5174/?spawn=lounge&capture=1&captureMode=beanbag')
  await page.waitForTimeout(6000)
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'beanbag')
  await page.keyboard.press('e')
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'explore')
})
