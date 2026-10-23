// A café: order a drink at the counter (it goes home with you), or sit at a window table and
// watch the street go by.
import { define } from '../registry.js'
import { DEPTH, LENGTH, wx } from '../constants.js'

const DRINKS = [
  ['月光拿铁', '奶泡上画着一弯月亮，喝完杯底还亮着。'], ['晚霞红茶', '倒进杯子的时候，茶色会慢慢从橘变紫。'],
  ['雪花热可可', '上面漂着一片不会化的雪。'], ['星星汽水', '气泡升到瓶口就变成小星星飞走了。'],
  ['樱花奶茶', '甜得刚刚好，像春天的第一个下午。'], ['薄荷沙漠茶', '一口下去，好像有风从沙丘那边吹过来。'],
  ['云朵棉花糖饮', '杯子很轻，像是装满了云。'],
]
const OWNERS = ['煮咖啡的狐狸', '系围裙的兔子', '打瞌睡的老猫', '戴眼镜的熊']
const tables = b => [-1, 1].map(k => b.z + k * (b.w / 4 + .25))

define('room', {
  id: 'cafe', order: 15,
  place: ({ r, candidates }) => {
    const c = candidates({ minZ: -LENGTH + 20, maxZ: -20 }).filter(b => b.w >= 7.6)
    return c.length ? [{ b: c[Math.floor(r() * c.length)] }] : []
  },
  depth: () => 4.3,
  blockers: b => tables(b).map(z => [.75, 1.65, z - .45, z + .45]),
  interactions(b, world) {
    const pick = (i, n) => (Math.abs((world.seed ?? 0) + i * 7) % n)
    const color = [world.palette.accent, world.palette.wallC, world.palette.light]
    const menu = { name: '月光咖啡馆', keeper: OWNERS[pick(1, OWNERS.length)], sign: world.palette.accent,
      goods: [0, 1, 2].map(i => { const [name, story] = DRINKS[(pick(2, DRINKS.length) + i * 2) % DRINKS.length]
        return { id: `drink-${world.seed}-${i}`, name, story, shape: 'bottle', color: color[i], price: 3 + i } }) }
    return [
      { kind: 'order', menu, u: 3.9, z: b.z, radius: 1.9 },
      ...tables(b).map(z => ({ kind: 'sit', seat: { x: wx(b.side, 2.2), z, yaw: b.side * Math.PI / 2 }, u: 2.2, z, radius: .9 })),
    ]
  },
})

define('interaction', { id: 'order', label: it => `和${it.menu.keeper}点一杯`, use: (it, ctx) => ctx.panel('shop', it.menu) })
const VIEWS = ['你在窗边坐下。街上的灯一盏一盏亮着，有人撑着伞走过去。', '你在窗边坐下。玻璃上起了一点雾，你在上面画了一个小月亮。', '你在窗边坐下。外面的行人走得很慢，好像也不急着去哪里。']
define('interaction', { id: 'sit', label: () => '在窗边坐下', use: (it, ctx) => { ctx.sit(it.seat); ctx.toast(VIEWS[Math.floor(Math.random() * VIEWS.length)]) } })

export { DEPTH }
