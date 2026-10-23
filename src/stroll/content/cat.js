// 小满: a cat who turns up on every street behind the door and remembers you. Pet it; on some
// visits it leaves you a little gift.
import { define } from '../registry.js'
import { LENGTH } from '../constants.js'

const KEY = 'moonroom.cat.v1'
export const catMemory = {
  get() { try { return +(globalThis.localStorage?.getItem(KEY) || 0) || 0 } catch { return 0 } },
  pet() { const n = catMemory.get() + 1; try { globalThis.localStorage?.setItem(KEY, String(n)) } catch { /* private */ } return n },
}
export const CAT_GIFTS = { 3: { id: 'cat-bell', name: '小满的铃铛', story: '小满把它从脖子上蹭下来，放在你脚边。', shape: 'stone', color: '#ffd46a', price: 0 },
  8: { id: 'cat-whisker', name: '一根猫胡须', story: '据说带着它，在梦里就不会迷路。', shape: 'feather', color: '#f4f0e8', price: 0 } }

define('prop', {
  id: 'cat',
  place: ({ r }) => { const z = -12 - r() * (LENGTH * .6), x = (r() - .5) * 6; return [{ x, z, coat: Math.floor(r() * 3), live: { pos: [x, z] } }] },
  interactions: c => [{ kind: 'pet', pos: c.live.pos, radius: 1.7, cat: c }], // pos is the live array the renderer moves
})
define('interaction', {
  id: 'pet',
  label: () => catMemory.get() ? '摸摸小满' : '摸摸这只小猫',
  use(it, ctx) {
    const n = catMemory.pet()
    it.cat.live.petted = performance.now() / 1000
    ctx.chime([55, 62, 67])
    const gift = CAT_GIFTS[n]
    if (gift) ctx.buy({ name: '小满' }, gift)
    else ctx.toast(n === 1 ? '小猫蹭了蹭你的手。项圈上写着：小满。' : `小满认出你了，在你脚边打了个滚。（你们见过 ${n} 次了）`)
  },
})
