import { test, expect } from '@playwright/test'

test('candidate drum kit enters the seated interaction', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('http://localhost:5174/?spawn=drums&capture=1&captureMode=drums&drumCandidate=1')
  await page.waitForTimeout(8000)
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'drums')
})
