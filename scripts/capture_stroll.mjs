import { chromium } from 'playwright'
// Stroll flow: wish → street → shop purchase → far door → shelf. Dev server on :5187.
// node scripts/capture_stroll.mjs <out-prefix> [wish]
const out = process.argv[2], wish = process.argv[3] || '下雪的小镇'
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.setDefaultTimeout(180000)
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && !m.text().includes('503') && errors.push(m.text()))
const cam = p => page.evaluate(p => window.__moonroomCamera.set(p), p)
await page.goto('http://localhost:5187/?capture=1&demo=1&spawn=hero'); await page.waitForTimeout(15000)
await cam({ position: [-4.5, 1.68, 6.0], yaw: Math.PI, pitch: 0 }); await page.waitForTimeout(800)
await page.keyboard.press('KeyE'); await page.waitForTimeout(800)
await page.fill('#portal-wish', wish)
await page.click('[data-testid=portal-go]'); await page.waitForSelector('[data-testid=stroll-bar]'); await page.waitForTimeout(6000)
await page.screenshot({ path: `${out}-1-start.png` })
// walk down the street picking up coins
for (let z = 4; z > -60; z -= 1.5) { await cam({ position: [(Math.sin(z * .3)) * 3, 1.68, z], yaw: 0, pitch: 0 }); await page.waitForTimeout(40) }
await cam({ position: [0, 1.68, -60], yaw: .55, pitch: .08 }); await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}-2-street.png` })
// first shop
const shop = await page.evaluate(async () => { const { worldPhysics } = await import('/src/worlds/worldState.js'); const s = worldPhysics.spots.shops[0]; return { side: s.side, z: s.z, name: s.name } })
await cam({ position: [shop.side * 3.2, 1.68, shop.z + 4], yaw: shop.side * .9, pitch: -.05 }); await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}-3-shopfront.png` })
await cam({ position: [shop.side * 3.6, 1.68, shop.z] }); await page.waitForTimeout(600)
await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid=shop-panel]')
await page.click('[data-testid=shop-buy] >> nth=0'); await page.waitForTimeout(800)
await page.screenshot({ path: `${out}-4-shop.png` })
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
// the far end
await cam({ position: [0, 1.68, -170], yaw: 0, pitch: .06 }); await page.waitForTimeout(2000)
await page.screenshot({ path: `${out}-5-end.png` })
await cam({ position: [0, 1.68, -202.5], yaw: 0, pitch: 0 }); await page.waitForTimeout(600)
await page.keyboard.press('KeyE'); await page.waitForTimeout(3000)
await cam({ position: [-6.6, 1.68, 6.4], yaw: Math.PI, pitch: -.05 }); await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}-6-shelf.png` })
const purse = await page.evaluate(async () => { const { worldState } = await import('/src/worlds/worldState.js'); const s = worldState.get(); return { coins: s.coins, souvenirs: s.souvenirs.map(x => x.name) } })
console.log(JSON.stringify({ shop: shop.name, purse, errors }, null, 1))
await browser.close()
