// Dev-server endpoint behind the Anywhere Door: POST /__world {wish, context} → a world spec.
// Claude fills a strict tool whose input schema is the world schema (src/worlds/spec.js), so
// the result is always schema-valid JSON; the client normalizes it again before rendering.
// The API key stays on this machine: ANTHROPIC_API_KEY from .env.local (or the environment).
import Anthropic from '@anthropic-ai/sdk'
import { WORLD_SCHEMA, normalize } from '../src/worlds/spec.js'
import { STROLL_SCHEMA, normalizeStroll } from '../src/stroll/spec.js'

const SYSTEM = `你是「Moonroom」的造梦师。Moonroom 是一间梦核风格的房间：月光、拱窗、灯串、狐狸、鼓和钢琴。
房间墙上有一扇任意门，门后是一个只存在一次的小世界。你为这扇门设计门后的世界。

要求：
- 世界要像一个温柔又有点奇异的梦：具体、有画面感，不要恐怖或暴力。
- 名字 2–8 个汉字；传说一两句，40 字以内，像一句童话里的旁白。
- 配色要和谐：skyTop 是天顶（通常较暗），skyHorizon 是地平线（较亮），fog 介于二者之间，ground 是地面，accent 是点缀光，light 是主光。
- landmarks 选 1–4 种，组合要有主次；用 height / tiers / ornament 让同一种地标长出这个世界独有的样子；glow 越高越会发光。
- hero 是一进门就能望见的巨大标志物，是这个世界最难忘的画面；scatter 是铺满地面的小东西，让世界不空。
- music 的调性和速度要配合世界的情绪。
- 纪念品是旅人能带回房间的一件小东西，名字和来历都要和这个世界的传说呼应。
- 如果旅人写了愿望，世界要回应愿望；如果给了房间的近况，可以把它悄悄织进世界里，但不要直接复述。
调用 create_world 工具交付世界。`

const STROLL_SYSTEM = `你是「Moonroom」的造梦师。房间里的任意门通向一条只存在一次的街，旅人会沿街散步、看两边的房子、在小店里用月光币买纪念品带回家。
你为这扇门设计这条街。

要求：
- 像一个温柔又奇异的梦，具体、有画面感，不要恐怖或暴力。
- 街名 2–8 个汉字；传说一两句，40 字以内。
- 配色和谐：skyTop 天顶，skyHorizon 地平线，fog 雾，road 路面，wallA/B/C 三种墙色，roof 屋顶，accent 点缀光，light 灯光。
- street.style 决定建筑风格，road 决定路面；height 是楼的高矮，lanterns 是街上挂灯的密度。
- 4–7 家店。每家店有一个会写在招牌上的店名、一位有趣的店主（可以是动物或奇怪的人），2–3 件商品。
- 商品是能带回房间的小东西：名字具体，店主的介绍要和这条街的传说呼应；价格 2–30 月光币，越特别越贵。
- hero 是街道尽头远远就能看见的巨大地标。
- 如果旅人写了愿望，整条街都要回应愿望；房间的近况可以悄悄织进去，但不要直接复述。
调用 create_street 工具交付这条街。`


export function worldGenPlugin(env) {
  return {
    name: 'moonroom-world-gen',
    configureServer(server) {
      server.middlewares.use('/__world', async (req, res) => {
        const send = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
        if (req.method !== 'POST') return send(405, { error: 'POST only' })
        let input = {}
        try {
          const chunks = []; for await (const chunk of req) chunks.push(chunk)
          input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        } catch { return send(400, { error: '请求格式不对' }) }
        const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
        let client
        try { client = apiKey ? new Anthropic({ apiKey }) : new Anthropic() } catch { return send(503, { error: '没有配置 ANTHROPIC_API_KEY（写进 ~/moonroom/.env.local 后重启 npm run dev）' }) }
        const stroll = input.kind === 'stroll'
        const wish = String(input.wish || '').slice(0, 200)
        const context = String(input.context || '').slice(0, 600)
        try {
          const response = await client.beta.messages.create({
            model: 'claude-opus-5-5',
            max_tokens: 16000,
            output_config: { effort: 'low' }, // a short creative spec; keeps the door snappy
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: stroll ? STROLL_SYSTEM : SYSTEM,
            tools: [stroll ? { name: 'create_street', description: '交付门后这条街的完整设定。', strict: true, input_schema: STROLL_SCHEMA }
              : { name: 'create_world', description: '交付门后世界的完整设定。', strict: true, input_schema: WORLD_SCHEMA }],
            tool_choice: { type: 'auto' },
            messages: [{ role: 'user', content: `旅人的愿望：${wish || '（没有写，随你发挥）'}\n房间的近况：${context || '（无）'}\n${stroll ? '请设计门后的街。' : '请设计门后的世界。'}` }],
          })
          if (response.stop_reason === 'refusal') return send(422, { error: '这次没能生成世界，换个愿望试试' })
          const call = response.content.find(block => block.type === 'tool_use' && (block.name === 'create_world' || block.name === 'create_street'))
          if (!call) return send(502, { error: '造梦师没有交出世界，再推一次门试试' })
          const seed = Math.floor(Math.random() * 1e9)
          send(200, { spec: stroll ? normalizeStroll({ ...call.input, seed }) : normalize({ ...call.input, seed }), model: response.model })
        } catch (error) {
          if (error instanceof Anthropic.AuthenticationError) return send(503, { error: 'ANTHROPIC_API_KEY 无效' })
          if (error instanceof Anthropic.RateLimitError) return send(429, { error: '请求太频繁，稍等再推门' })
          if (error instanceof Anthropic.APIError) return send(502, { error: `Claude API 出错（${error.status}）` })
          return send(503, { error: '没有可用的 Anthropic 凭据（在 ~/moonroom/.env.local 写入 ANTHROPIC_API_KEY 后重启 npm run dev）' })
        }
      })
    },
  }
}
