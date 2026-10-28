import { test, expect } from '@playwright/test'

test('reachable bed, chair and fox interactions work from exploration', async ({ page }) => {
  test.setTimeout(180000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5190/?demo=1&capture=1&whiteModel=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__moonroomGame?.started, null, { timeout: 120000 })

  await page.evaluate(() => window.__moonroomCamera.set({ position: [5.0, 1.68, 4.75] }))
  await page.waitForFunction(() => window.__moonroomGame?.near === 'bed')
  await page.keyboard.press('e')
  await expect(page.getByTestId('dream-panel')).toBeVisible()
  await page.getByRole('button', { name: '做一个梦' }).click()
  await expect(page.getByText(/已记住 1 个梦/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'explore')

  await page.evaluate(() => window.__moonroomCamera.set({ position: [0, 1.68, -1.74] }))
  await page.waitForFunction(() => window.__moonroomGame?.near === 'deskChair')
  await page.keyboard.press('e')
  await page.getByRole('textbox', { name: '私人笔记' }).fill('月光下的第一篇笔记')
  await page.getByRole('button', { name: '保存笔记' }).click()
  await expect(page.getByText(/已保存在这台浏览器/)).toBeVisible()
  await page.getByRole('button', { name: '起身', exact: true }).last().click()

  await page.evaluate(() => window.__moonroomCamera.set({ position: [5.0, 1.68, 6.7] }))
  await page.waitForFunction(() => window.__moonroomGame?.near === 'foxSleeping')
  await page.keyboard.press('e')
  await expect(page.locator('.fox-pet-toast')).toContainText('眠眠')
  await page.evaluate(() => window.__moonroomCamera.set({ position: [3.5, 1.68, 4.45] }))
  await page.waitForFunction(() => window.__moonroomGame?.near === 'foxListening')
  await page.keyboard.press('e')
  await expect(page.locator('.fox-pet-toast')).toContainText('云团')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__moonroomGame?.started, null, { timeout: 120000 })
  await page.evaluate(() => window.__moonroomGame.enter('deskChair'))
  await expect(page.getByRole('textbox', { name: '私人笔记' })).toHaveValue('月光下的第一篇笔记')
  expect(errors).toEqual([])
})
