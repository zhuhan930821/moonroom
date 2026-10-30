import { test } from '@playwright/test'

test('capture default licensed drum kit in Moonroom review views', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1600, height: 900 })
  for (const [spawn, name] of [['drumCorner', 'corner'], ['drumFront', 'front'], ['drumSide', 'side']]) {
    await page.goto(`http://localhost:5174/?spawn=${spawn}&capture=1`)
    await page.waitForTimeout(7000)
    await page.screenshot({ path: `screenshots/candidate-art-katja-moonroom/${name}.png` })
  }
})
