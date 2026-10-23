// What pressing E does near something. label(item, ctx) is the prompt (return null to hide
// the item, e.g. once taken); use(item, ctx) acts. ctx (built by the HUD) gives you:
//   ctx.world, ctx.shop(i), ctx.owns(good), ctx.coins, ctx.buy(seller, good) → ok,
//   ctx.panel(kind, data) to open a HUD panel ('good' | 'shop'), ctx.toast(text),
//   ctx.addCoins(n), ctx.chime(midiNotes), ctx.home()
import { define } from '../registry.js'

define('interaction', {
  id: 'good',
  label: (it, ctx) => `看看「${it.good.name}」 · ${ctx.owns(it.good) ? '已买' : `◉ ${it.good.price}`}`,
  use: (it, ctx) => ctx.panel('good', it),
})
define('interaction', {
  id: 'keeper',
  label: (it, ctx) => `和${ctx.shop(it.shop).keeper}说话`,
  use: (it, ctx) => ctx.panel('shop', ctx.shop(it.shop)),
})
define('interaction', {
  id: 'found',
  label: (it, ctx) => ctx.owns(it.good) ? null : `拿起「${it.good.name}」`,
  use: (it, ctx) => ctx.buy({ name: '别人的家' }, it.good),
})
define('interaction', { id: 'door', label: () => '回到房间', use: (_, ctx) => ctx.home() })

const WISHES = ['水面亮了一下，好像有人听见了。', '一条小鱼跳起来，又落回月光里。', '硬币沉下去的时候，你听见远处的风铃响了。', '喷泉的水声慢了一拍，像在点头。']
define('interaction', {
  id: 'wish',
  label: (_, ctx) => ctx.coins > 0 ? '投一枚月光币许愿 · ◉ 1' : '许愿需要一枚月光币',
  use(it, ctx) {
    if (ctx.coins < 1) return ctx.toast('口袋里没有月光币了，去街上捡一些吧')
    ctx.addCoins(-1)
    if (Math.random() < .25) { ctx.addCoins(3); ctx.chime([72, 76, 79, 84, 88]); return ctx.toast('喷泉把三枚月光币吐了回来！') }
    ctx.chime([79, 84, 88])
    ctx.toast(WISHES[Math.floor(Math.random() * WISHES.length)])
  },
})
