import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const output = 'assets-source/rug/material-test/textures'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const dataUrl = await page.evaluate(() => {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#4d315f'; ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = '#ba8eaf'; ctx.lineWidth = 10; ctx.strokeRect(18, 18, 476, 476)
  ctx.strokeStyle = '#aa7e9d'; ctx.lineWidth = 2; ctx.strokeRect(37, 37, 438, 438)
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 173) % 485 + 13
    const y = (i * 281) % 485 + 13
    ctx.fillStyle = i % 3 ? '#d4b8bd' : '#f7d68c'
    ctx.font = `${i % 4 === 0 ? 22 : 13}px Georgia`
    ctx.fillText(i % 5 === 0 ? '☾' : '✦', x, y)
  }
  return canvas.toDataURL('image/png')
})
await writeFile(`${output}/Rug_StarMoon_BaseColor.png`, Buffer.from(dataUrl.split(',')[1], 'base64'))
await browser.close()
console.log(`${output}/Rug_StarMoon_BaseColor.png`)
