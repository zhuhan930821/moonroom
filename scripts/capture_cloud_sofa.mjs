import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const output='screenshots/cloud-sofa'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1})
page.setDefaultTimeout(90000)
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
const views=[
  ['before-hero','hero','&sofa=original'],
  ['after-hero','hero',''],
  ['front','sofa',''],
  ['side','sofaSide',''],
  ['close','sofaClose',''],
]
const stats={}
for(const [name,spawn,extra] of views){
  await page.goto(`http://localhost:5174/?capture=1&spawn=${spawn}${extra}`)
  await page.waitForTimeout(6500)
  await page.screenshot({path:`${output}/${name}.png`})
  stats[name]=await page.evaluate(()=>({mode:document.querySelector('main')?.dataset.mode,perf:window.__moonroomPerf||null}))
}
console.log(JSON.stringify({stats,errors},null,2))
await browser.close()
