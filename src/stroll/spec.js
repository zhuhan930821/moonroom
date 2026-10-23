// Stroll template: a street to walk down, buildings to look at, shops to buy souvenirs in.
// A theme (from Claude via server/worldGen.js, or offline from PRESETS) sets everything you see;
// the gameplay is the same in every theme. Add a theme by adding a PRESETS entry.
import { CHOICES, rng } from '../worlds/spec.js'

export const STYLES = ['cottage', 'pagoda', 'gothic', 'seaside', 'desert', 'crystal', 'mushroom', 'candy']
export const ROADS = ['cobble', 'boardwalk', 'sand', 'moss', 'glass']

const hex = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }
const unit = { type: 'number', minimum: 0, maximum: 1 }
const obj = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })
const pick = list => ({ type: 'string', enum: list })

const GOOD = obj({
  name: { type: 'string', description: '商品名，2–10 个字' },
  story: { type: 'string', description: '店主介绍这件东西的一句话，40 字以内' },
  shape: pick(CHOICES.souvenir), color: hex,
  price: { type: 'integer', minimum: 2, maximum: 30, description: '月光币价格' },
})

export const STROLL_SCHEMA = obj({
  name: { type: 'string', description: '这条街的名字，2–8 个汉字' },
  legend: { type: 'string', description: '一两句关于这条街的传说，40 字以内' },
  palette: obj({ skyTop: hex, skyHorizon: hex, fog: hex, road: hex, wallA: hex, wallB: hex, wallC: hex, roof: hex, accent: hex, light: hex }),
  sky: obj({ celestial: pick(CHOICES.celestial), time: pick(CHOICES.time), stars: unit, aurora: unit }),
  street: obj({ style: pick(STYLES), road: pick(ROADS), height: { ...unit, description: '楼有多高' }, lanterns: { ...unit, description: '街上挂灯的密度' } }),
  weather: obj({ kind: pick(CHOICES.weather), intensity: unit }),
  hero: obj({ kind: { ...pick(CHOICES.hero), description: '街道尽头的巨大地标' }, color: hex, glow: unit }),
  shops: { type: 'array', minItems: 4, maxItems: 7, items: obj({
    name: { type: 'string', description: '店名，2–6 个字，会写在招牌上' },
    keeper: { type: 'string', description: '店主是谁，10 字以内' },
    sign: hex, goods: { type: 'array', minItems: 2, maxItems: 3, items: GOOD },
  }) },
  music: obj({ root: { type: 'integer', minimum: 0, maximum: 11 }, scale: pick(CHOICES.scale), tempo: { type: 'integer', minimum: 50, maximum: 110 } }),
})

const clamp = (v, lo, hi, d) => Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d
const color = (v, d) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : d
const one = (v, list) => list.includes(v) ? v : list[0]
const text = (v, d, n) => typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : d

export function normalizeStroll(raw = {}) {
  const p = raw.palette || {}
  const shops = (Array.isArray(raw.shops) ? raw.shops : []).slice(0, 7).map((s, i) => ({
    name: text(s?.name, `小店${i + 1}`, 8), keeper: text(s?.keeper, '一位安静的店主', 14), sign: color(s?.sign, '#ffd08a'),
    goods: (Array.isArray(s?.goods) ? s.goods : []).slice(0, 3).map((g, j) => ({
      name: text(g?.name, '无名的小东西', 12), story: text(g?.story, '', 60), shape: one(g?.shape, CHOICES.souvenir),
      color: color(g?.color, '#ffd08a'), price: Math.round(clamp(g?.price, 2, 30, 6)), id: `${i}-${j}`,
    })),
  })).filter(s => s.goods.length)
  return {
    kind: 'stroll',
    name: text(raw.name, '无名街', 16), legend: text(raw.legend, '', 80),
    palette: { skyTop: color(p.skyTop, '#1b2450'), skyHorizon: color(p.skyHorizon, '#c88aa8'), fog: color(p.fog, '#6d5f86'), road: color(p.road, '#6a5a6e'),
      wallA: color(p.wallA, '#e8d6c4'), wallB: color(p.wallB, '#c9a9b8'), wallC: color(p.wallC, '#a8b8d8'), roof: color(p.roof, '#7a4a5a'),
      accent: color(p.accent, '#ffd08a'), light: color(p.light, '#fff1d6') },
    sky: { celestial: one(raw.sky?.celestial, CHOICES.celestial), time: one(raw.sky?.time, CHOICES.time), stars: clamp(raw.sky?.stars, 0, 1, .6), aurora: clamp(raw.sky?.aurora, 0, 1, 0) },
    street: { style: one(raw.street?.style, STYLES), road: one(raw.street?.road, ROADS), height: clamp(raw.street?.height, 0, 1, .5), lanterns: clamp(raw.street?.lanterns, 0, 1, .6) },
    weather: { kind: one(raw.weather?.kind, CHOICES.weather), intensity: clamp(raw.weather?.intensity, 0, 1, .3) },
    hero: { kind: one(raw.hero?.kind, CHOICES.hero), color: color(raw.hero?.color, '#e8dcff'), glow: clamp(raw.hero?.glow, 0, 1, .5) },
    shops: shops.length ? shops : PRESETS[0].shops,
    music: { root: Math.round(clamp(raw.music?.root, 0, 11, 0)), scale: one(raw.music?.scale, CHOICES.scale), tempo: Math.round(clamp(raw.music?.tempo, 50, 110, 72)) },
    seed: Number.isFinite(raw.seed) ? raw.seed : Math.floor(Math.random() * 1e9),
  }
}

// ---------- offline themes: matched to the wish by keywords ----------
const g = (name, story, shape, color, price) => ({ name, story, shape, color, price })
export const PRESETS = [
  { keywords: ['月', '夜', '星', '梦'], name: '月光坡道', legend: '这条街只在满月的晚上出现，店里卖的都是别人做过的好梦。',
    palette: { skyTop: '#0d1440', skyHorizon: '#7a5aa8', fog: '#3d3266', road: '#4a4060', wallA: '#e9dcc8', wallB: '#b8a0c8', wallC: '#8fa0d0', roof: '#3a2e5a', accent: '#ffd08a', light: '#fff1d6' },
    sky: { celestial: 'moon', time: 'night', stars: 1, aurora: .3 }, street: { style: 'cottage', road: 'cobble', height: .5, lanterns: .9 },
    weather: { kind: 'none', intensity: 0 }, hero: { kind: 'colossal-moon', color: '#f3ecd8', glow: .4 }, music: { root: 9, scale: 'pentatonic', tempo: 66 },
    shops: [
      { name: '好梦杂货', keeper: '戴睡帽的老狐狸', sign: '#ffcf7a', goods: [g('装梦的玻璃瓶', '摇一摇，能听见上一个主人的笑声。', 'bottle', '#c9b8ff', 8), g('枕边的种子', '种在枕头边，会长出一个短短的白天。', 'seed', '#9fe8a8', 5)] },
      { name: '星星回收站', keeper: '扫烟囱的小猫', sign: '#9fd8ff', goods: [g('掉落的小星', '昨晚从天上滑下来的，还带着一点余温。', 'star', '#fff1b0', 12), g('星屑鹅卵石', '在河边捡的，夜里会自己亮。', 'stone', '#a8c8ff', 4)] },
      { name: '月亮邮局', keeper: '不说话的邮差', sign: '#ffb3c8', goods: [g('寄往月亮的钥匙', '据说能打开月亮背面的门。', 'key', '#ffe0a0', 15), g('一根云朵羽毛', '用它写的信，会飘到想念的人窗前。', 'feather', '#ffffff', 6)] },
      { name: '提灯铺', keeper: '会唱歌的萤火虫', sign: '#ffd08a', goods: [g('不灭的提灯', '只要你还在走，它就不会熄。', 'lantern', '#ffc77a', 18), g('潮声贝壳', '放在耳边，能听见月光落进海里。', 'shell', '#ffd6e0', 7)] },
      { name: '旧唱片行', keeper: '戴耳机的猫头鹰', sign: '#c8a0ff', goods: [g('哼唱过的石头', '有人对着它唱了一整晚的歌。', 'stone', '#e8b0ff', 9), g('迷路的音符', '它从一首没写完的曲子里跑出来了。', 'star', '#b0f0ff', 11)] },
    ] },
  { keywords: ['海', '雨', '港', '岛', '水', '橘'], name: '橘雨码头', legend: '傍晚总在下橘子味的雨，落进海里就变成小灯，漂到码头。',
    palette: { skyTop: '#3b2a5c', skyHorizon: '#ffb070', fog: '#d98a6a', road: '#8a6a58', wallA: '#f6e2c8', wallB: '#8fc8d8', wallC: '#f2a88a', roof: '#c8553d', accent: '#ffcf6b', light: '#ffe2b8' },
    sky: { celestial: 'sun', time: 'dusk', stars: .3, aurora: 0 }, street: { style: 'seaside', road: 'boardwalk', height: .35, lanterns: .7 },
    weather: { kind: 'rain', intensity: .5 }, hero: { kind: 'inverted-castle', color: '#e8c3b0', glow: .8 }, music: { root: 7, scale: 'major', tempo: 80 },
    shops: [
      { name: '雨瓶铺', keeper: '收集雨声的海鸥', sign: '#ffb347', goods: [g('一瓶橘子味的雨', '打开瓶盖，还能听见雨落进海里。', 'bottle', '#ffb347', 9), g('雨点玻璃珠', '每一颗里都有一盏小灯。', 'stone', '#ffd08a', 4)] },
      { name: '贝壳信箱', keeper: '慢吞吞的寄居蟹', sign: '#8fd8e8', goods: [g('潮汐贝壳', '涨潮时会轻轻发热。', 'shell', '#ffd6c8', 6), g('海风羽毛', '从灯塔上掉下来的。', 'feather', '#e8f6ff', 5)] },
      { name: '码头灯具', keeper: '退休的灯塔看守', sign: '#ffcf6b', goods: [g('防雨提灯', '雨越大，它越亮。', 'lantern', '#ffcf6b', 16), g('渔船的钥匙', '那艘船如今停在月亮上。', 'key', '#d8c098', 13)] },
      { name: '晚霞果铺', keeper: '戴草帽的水獭', sign: '#ff8a5c', goods: [g('晚霞的种子', '种下去会长出一棵橘子色的天空。', 'seed', '#ff9a5c', 7), g('落日碎片', '比橘子糖还甜。', 'star', '#ffb070', 11)] },
    ] },
  { keywords: ['雪', '冬', '冰', '北', '圣诞'], name: '雪灯小巷', legend: '雪下了整整一百年，每家窗口都亮着一盏等人的灯。',
    palette: { skyTop: '#1a2a4a', skyHorizon: '#9ab0d8', fog: '#c8d4ec', road: '#d8e0f0', wallA: '#f4ece0', wallB: '#c86a5a', wallC: '#6a8ab8', roof: '#f8f8ff', accent: '#ffcf8a', light: '#fff4e0' },
    sky: { celestial: 'twin-moons', time: 'night', stars: .8, aurora: .7 }, street: { style: 'gothic', road: 'cobble', height: .7, lanterns: .8 },
    weather: { kind: 'snow', intensity: .7 }, hero: { kind: 'spiral-tower', color: '#dfe8ff', glow: .6 }, music: { root: 2, scale: 'major', tempo: 64 },
    shops: [
      { name: '暖手炉', keeper: '织毛衣的北极熊', sign: '#ffb07a', goods: [g('揣在兜里的火', '一直暖到春天。', 'stone', '#ff9a5c', 8), g('雪夜提灯', '照到的地方不会结冰。', 'lantern', '#ffd08a', 15)] },
      { name: '冰晶工坊', keeper: '戴眼镜的雪貂', sign: '#a8d8ff', goods: [g('不化的雪花', '放在手心也不会化。', 'star', '#e8f4ff', 10), g('冰封的钥匙', '春天来了才能用。', 'key', '#b8e0ff', 12)] },
      { name: '旧时光书店', keeper: '打瞌睡的老鹿', sign: '#e8c8a0', goods: [g('书页羽毛', '从一本写给冬天的诗集里掉出来的。', 'feather', '#f4e8d0', 5), g('壁炉的种子', '种下去会长出一个温暖的晚上。', 'seed', '#ff8a6a', 7)] },
      { name: '极光邮局', keeper: '穿斗篷的猫', sign: '#9fffd8', goods: [g('一瓶极光', '晚上打开，天花板会变成绿色。', 'bottle', '#7fffc8', 18), g('雪地贝壳', '在雪里找到的，不知道是怎么来的。', 'shell', '#ffffff', 6)] },
    ] },
  { keywords: ['花', '春', '樱', '糖', '甜', '粉'], name: '樱糖坡', legend: '花瓣落下来是甜的，整条街的屋顶都是用糖做的。',
    palette: { skyTop: '#6aa8e8', skyHorizon: '#ffe0ec', fog: '#f6d8e6', road: '#f0d8d0', wallA: '#fff4ec', wallB: '#ffc8d8', wallC: '#c8e8d8', roof: '#ff8fb0', accent: '#ff9ec7', light: '#fff8ec' },
    sky: { celestial: 'sun', time: 'day', stars: 0, aurora: 0 }, street: { style: 'candy', road: 'moss', height: .4, lanterns: .4 },
    weather: { kind: 'petals', intensity: .6 }, hero: { kind: 'giant-tree', color: '#f6b6d2', glow: .5 }, music: { root: 0, scale: 'pentatonic', tempo: 92 },
    shops: [
      { name: '花瓣糖果', keeper: '踮脚的小兔', sign: '#ff9ec7', goods: [g('樱花味的星', '含在嘴里会想起春天。', 'star', '#ffb8d0', 6), g('糖做的钥匙', '能打开一扇甜甜的门。', 'key', '#ffd8e8', 9)] },
      { name: '种子屋', keeper: '戴花环的刺猬', sign: '#9fe8a8', goods: [g('会做梦的种子', '种在枕边，会长出一个白天的梦。', 'seed', '#ff9ec7', 7), g('露水瓶', '早上收集的，闻起来像青草。', 'bottle', '#c8f0d8', 8)] },
      { name: '风筝铺', keeper: '爱笑的燕子', sign: '#9fd0ff', goods: [g('春风羽毛', '轻轻一吹就会飞回你手里。', 'feather', '#d8f0ff', 5), g('彩虹石', '下过雨后在草地上找到的。', 'stone', '#ffe08a', 4)] },
      { name: '午后茶室', keeper: '慢慢倒茶的乌龟', sign: '#ffd08a', goods: [g('茶香提灯', '点亮时会飘出一点茉莉香。', 'lantern', '#ffe0a8', 14), g('花园贝壳', '不知道为什么出现在花园里。', 'shell', '#ffe0ec', 6)] },
    ] },
  { keywords: ['沙', '漠', '金', '古', '遗迹'], name: '金沙集市', legend: '集市每走一百年就换一个地方，今晚它停在了沙丘之间。',
    palette: { skyTop: '#1a1a48', skyHorizon: '#e8a868', fog: '#c89068', road: '#d8b080', wallA: '#e8c898', wallB: '#d89a6a', wallC: '#a8c8c8', roof: '#3a6a8a', accent: '#ffc860', light: '#ffe8c0' },
    sky: { celestial: 'ringed-planet', time: 'dusk', stars: .6, aurora: 0 }, street: { style: 'desert', road: 'sand', height: .45, lanterns: 1 },
    weather: { kind: 'embers', intensity: .3 }, hero: { kind: 'great-arch', color: '#e8c898', glow: .6 }, music: { root: 2, scale: 'dorian', tempo: 70 },
    shops: [
      { name: '沙漏铺', keeper: '戴头巾的骆驼', sign: '#ffc860', goods: [g('一瓶慢时间', '倒过来，下午就会变长。', 'bottle', '#ffd890', 14), g('驼铃石', '摇一摇，有远方的声音。', 'stone', '#e8b070', 5)] },
      { name: '地图商人', keeper: '独眼的老鹰', sign: '#8ad0c8', goods: [g('通往绿洲的钥匙', '只有渴了的时候才看得见锁孔。', 'key', '#a8e8d0', 13), g('风暴羽毛', '从一场沙暴里拔下来的。', 'feather', '#f0d0a0', 7)] },
      { name: '灯与烛', keeper: '吹玻璃的蜥蜴', sign: '#ff9a5c', goods: [g('琉璃提灯', '灯罩上画着整片星空。', 'lantern', '#ff9a5c', 17), g('沙漠里的星', '白天它会躲进沙子里。', 'star', '#ffe8a0', 10)] },
      { name: '绿洲种子', keeper: '打盹的狐獴', sign: '#9fe8a8', goods: [g('仙人掌种子', '会开出一朵月亮色的花。', 'seed', '#9fe8a8', 6), g('沙丘贝壳', '这里很久以前是一片海。', 'shell', '#f4dcc0', 8)] },
    ] },
]

export function generateStrollOffline(wish = '', seed = Math.floor(Math.random() * 1e9)) {
  const r = rng(seed)
  const scored = PRESETS.map(p => [p.keywords.filter(k => wish.includes(k)).length, p])
  const best = Math.max(...scored.map(([n]) => n))
  const pool = scored.filter(([n]) => n === best).map(([, p]) => p)
  const preset = pool[Math.floor(r() * pool.length)]
  // Shuffle shops so two visits to the same theme feel different.
  const shops = [...preset.shops].sort(() => r() - .5)
  return normalizeStroll({ ...preset, shops, seed })
}
