import { test, expect } from '@playwright/test'

test('Blender house preview keeps computer and drum interactions available', async ({ page }) => {
  test.setTimeout(180_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const architectureResponse = page.waitForResponse(response => response.url().includes('moonroom-architecture-phase1.glb'))
  await page.goto('http://localhost:5174/?spawn=curtainWall&capture=1')
  expect((await architectureResponse).ok()).toBe(true)
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'explore')
  for (const mode of ['computer', 'drums']) {
    await page.goto(`http://localhost:5174/?architecture=blender&capture=1&captureMode=${mode}`)
    await expect(page.locator('main')).toHaveAttribute('data-mode', mode)
    await page.waitForTimeout(1500)
    await page.keyboard.press('Escape')
    await expect(page.locator('main')).toHaveAttribute('data-mode', 'explore')
  }
  expect(errors).toEqual([])
})
