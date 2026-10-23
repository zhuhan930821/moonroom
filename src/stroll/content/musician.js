// A street musician on the kerb. You hear them before you see them; tip a coin and they play
// brighter — the third tip earns you the melody they're working on.
import { define } from '../registry.js'
import { LENGTH, WALK } from '../constants.js'

const PLAYERS = ['拉手风琴的熊', '弹琴的狐狸', '吹口琴的兔子', '唱歌的猫头鹰']
define('prop', {
  id: 'musician',
  place({ r, buildings, stairs }) {
    for (let tries = 0; tries < 40; tries++) {
      const side = r() < .5 ? -1 : 1, z = -30 - r() * (LENGTH - 60)
      const nearDoor = buildings.some(b => b.room && b.side === side && Math.abs(b.doorZ - z) < 4)
      const nearStair = stairs.some(s => s.side === side && z > s.top - 3 && z < s.bottom + 2)
      if (!nearDoor && !nearStair && Math.abs(z + LENGTH / 2) > 15) // keep clear of the fountain
        return [{ x: side * (WALK - .7), z, side, player: PLAYERS[Math.floor(r() * PLAYERS.length)], live: { tips: 0, excited: 0 } }]
    }
    return []
  },
  obstacle: m => ({ x: m.x, z: m.z, radius: .7 }),
  interactions: m => [{ kind: 'tip', pos: [m.x, m.z], radius: 2.4, musician: m }],
})
define('interaction', {
  id: 'tip',
  label: (it, ctx) => ctx.coins > 0 ? `给${it.musician.player}一枚月光币 · ◉ 1` : `听${it.musician.player}演奏`,
  use(it, ctx) {
    const live = it.musician.live
    if (ctx.coins < 1) return ctx.toast('你站着听了一会儿。艺人朝你点点头。')
    ctx.addCoins(-1); live.tips++; live.excited = performance.now() / 1000
    if (live.tips === 3) {
      ctx.buy({ name: '街头艺人' }, { id: `melody-${ctx.world.seed}`, name: '一段没写完的旋律', story: '艺人把它写在一张小纸条上递给你：「剩下的你来写。」', shape: 'star', color: ctx.world.palette.accent, price: 0 })
    } else ctx.toast(['艺人冲你眨眨眼，曲子突然欢快起来。', '琴声转了一个调，像是专门为你拉的。'][live.tips % 2])
  },
})
