// World specs: what lies behind the Anywhere Door. Claude writes one (server/worldGen.js) or the
// offline generator below rolls one from a seed; WorldScene.jsx builds it in three.js.
// Every field is a closed choice or a bounded number so any spec renders.

export const CHOICES = {
  celestial: ['moon', 'sun', 'twin-moons', 'ringed-planet', 'none'],
  time: ['night', 'dusk', 'day', 'dawn'],
  terrain: ['ocean', 'dunes', 'islands', 'meadow', 'crystal', 'clouds'],
  landmark: ['tower', 'arch', 'monolith', 'tree', 'crystal', 'lantern', 'ruin', 'floating-island', 'shrine'],
  creature: ['fireflies', 'fish', 'birds', 'jellyfish', 'none'],
  weather: ['none', 'rain', 'snow', 'petals', 'embers', 'bubbles'],
  scale: ['major', 'minor', 'pentatonic', 'dorian'],
  souvenir: ['stone', 'shell', 'bottle', 'feather', 'key', 'star', 'lantern', 'seed'],
}

const hex = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }
const unit = { type: 'number', minimum: 0, maximum: 1 }
const obj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })
const pick = list => ({ type: 'string', enum: list })

// JSON Schema used as the strict tool input on the API side.
export const WORLD_SCHEMA = obj({
  name: { type: 'string', description: '世界的名字，2–8 个汉字' },
  legend: { type: 'string', description: '一两句关于这个世界的传说，40 字以内' },
  palette: obj({ skyTop: hex, skyHorizon: hex, fog: hex, ground: hex, accent: hex, light: hex }),
  sky: obj({ celestial: pick(CHOICES.celestial), time: pick(CHOICES.time), stars: unit, aurora: unit }),
  terrain: obj({ kind: pick(CHOICES.terrain), roughness: unit }),
  landmarks: { type: 'array', minItems: 1, maxItems: 4, items: obj({
    kind: pick(CHOICES.landmark), count: { type: 'integer', minimum: 1, maximum: 12 },
    scale: { type: 'number', minimum: .5, maximum: 3 }, color: hex, glow: unit,
  }) },
  creatures: obj({ kind: pick(CHOICES.creature), count: { type: 'integer', minimum: 0, maximum: 60 }, color: hex }),
  weather: obj({ kind: pick(CHOICES.weather), intensity: unit }),
  music: obj({ root: { type: 'integer', minimum: 0, maximum: 11 }, scale: pick(CHOICES.scale), tempo: { type: 'integer', minimum: 50, maximum: 110 } }),
  souvenir: obj({ name: { type: 'string', description: '纪念品名字，2–10 个字' }, story: { type: 'string', description: '纪念品的来历，50 字以内' },
    shape: pick(CHOICES.souvenir), color: hex, glow: unit }),
})

// Clamp/repair anything that slipped through, so rendering never trusts raw input.
export function normalize(raw) {
  const clamp = (v, lo, hi, d) => Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d
  const color = (v, d) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : d
  const one = (v, list) => list.includes(v) ? v : list[0]
  const text = (v, d, n) => typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : d
  const p = raw?.palette || {}
  return {
    kind: 'generated',
    name: text(raw?.name, '无名之地', 16),
    legend: text(raw?.legend, '', 80),
    palette: { skyTop: color(p.skyTop, '#1b2450'), skyHorizon: color(p.skyHorizon, '#c88aa8'), fog: color(p.fog, '#6d5f86'),
      ground: color(p.ground, '#3d3552'), accent: color(p.accent, '#ffd08a'), light: color(p.light, '#fff1d6') },
    sky: { celestial: one(raw?.sky?.celestial, CHOICES.celestial), time: one(raw?.sky?.time, CHOICES.time),
      stars: clamp(raw?.sky?.stars, 0, 1, .6), aurora: clamp(raw?.sky?.aurora, 0, 1, 0) },
    terrain: { kind: one(raw?.terrain?.kind, CHOICES.terrain), roughness: clamp(raw?.terrain?.roughness, 0, 1, .4) },
    landmarks: (Array.isArray(raw?.landmarks) ? raw.landmarks : []).slice(0, 4).map(l => ({
      kind: one(l?.kind, CHOICES.landmark), count: Math.round(clamp(l?.count, 1, 12, 3)), scale: clamp(l?.scale, .5, 3, 1),
      color: color(l?.color, '#c9b8e8'), glow: clamp(l?.glow, 0, 1, .4) })),
    creatures: { kind: one(raw?.creatures?.kind, CHOICES.creature), count: Math.round(clamp(raw?.creatures?.count, 0, 60, 20)), color: color(raw?.creatures?.color, '#bff6ff') },
    weather: { kind: one(raw?.weather?.kind, CHOICES.weather), intensity: clamp(raw?.weather?.intensity, 0, 1, .4) },
    music: { root: Math.round(clamp(raw?.music?.root, 0, 11, 0)), scale: one(raw?.music?.scale, CHOICES.scale), tempo: Math.round(clamp(raw?.music?.tempo, 50, 110, 72)) },
    souvenir: { name: text(raw?.souvenir?.name, '无名的小东西', 20), story: text(raw?.souvenir?.story, '', 100),
      shape: one(raw?.souvenir?.shape, CHOICES.souvenir), color: color(raw?.souvenir?.color, '#ffd08a'), glow: clamp(raw?.souvenir?.glow, 0, 1, .6) },
    seed: Number.isFinite(raw?.seed) ? raw.seed : Math.floor(Math.random() * 1e9),
  }
}

export function rng(seed) {
  let s = (seed >>> 0) || 1
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 }
}

// Offline generator: used when no API key is configured or the request fails.
const NAMES = ['雾港', '星砂原', '倒悬林', '琉璃海', '萤火渡', '静默塔群', '云上集市', '晨钟谷', '盐之镜', '回声湾']
const STORIES = ['传说这里的风会记住每一句没说出口的话。', '每当潮水退去，旧日的灯就会重新亮起。', '这里的时间走得很慢，慢到星星来得及落下。', '据说只有在梦里迷路的人才找得到这里。']
const SOUVENIRS = { stone: '会发光的鹅卵石', shell: '装着潮声的贝壳', bottle: '一瓶晨雾', feather: '星光羽毛', key: '没有锁的钥匙', star: '一颗掉落的小星', lantern: '不灭的提灯', seed: '会做梦的种子' }
export function generateOffline(seed = Math.floor(Math.random() * 1e9)) {
  const r = rng(seed), any = list => list[Math.floor(r() * list.length)]
  const hue = r() * 360, c = (h, s, l) => `#${new Array(3).fill(0).map((_, i) => {
    const k = (i === 0 ? 0 : i === 1 ? 8 : 4), a = s * Math.min(l, 1 - l)
    const f = n => l - a * Math.max(-1, Math.min((n + k + h / 30) % 12 - 3, 9 - (n + k + h / 30) % 12, 1))
    return Math.round(f(0) * 255).toString(16).padStart(2, '0')
  }).join('')}`
  const shape = any(CHOICES.souvenir)
  return normalize({
    name: any(NAMES), legend: any(STORIES),
    palette: { skyTop: c(hue, .5, .12), skyHorizon: c(hue + 40, .55, .55), fog: c(hue + 30, .35, .4), ground: c(hue + 180, .25, .25), accent: c(hue + 150, .8, .7), light: c(hue + 60, .5, .9) },
    sky: { celestial: any(CHOICES.celestial), time: any(CHOICES.time), stars: r(), aurora: r() > .6 ? r() : 0 },
    terrain: { kind: any(CHOICES.terrain), roughness: r() },
    landmarks: Array.from({ length: 1 + Math.floor(r() * 3) }, () => ({ kind: any(CHOICES.landmark), count: 1 + Math.floor(r() * 8), scale: .6 + r() * 1.8, color: c(hue + r() * 120, .5, .65), glow: r() })),
    creatures: { kind: any(CHOICES.creature), count: 10 + Math.floor(r() * 40), color: c(hue + 200, .7, .75) },
    weather: { kind: any(CHOICES.weather), intensity: r() },
    music: { root: Math.floor(r() * 12), scale: any(CHOICES.scale), tempo: 55 + Math.floor(r() * 45) },
    souvenir: { name: SOUVENIRS[shape], story: '你从一个离线生成的世界带回了它。', shape, color: c(hue + 90, .8, .7), glow: .5 + r() * .5 },
    seed,
  })
}

// The hand-made first world: the user's 《Id 之海》 night sea with its lighthouse.
export const ID_SEA = {
  kind: 'idsea', name: 'Id 之海', legend: '每一句写下的话，都会变成天上的星、灯塔的一层、海上的航标，或海底的根。',
  music: { root: 9, scale: 'minor', tempo: 60 },
  souvenir: { name: '灯塔里的灯', story: '从 Id 之海的灯塔顶上取下的一盏灯。它随海况明暗，风暴来时会轻轻摇晃。', shape: 'lantern', color: '#ffc77a', glow: 1 },
  seed: 7,
}
