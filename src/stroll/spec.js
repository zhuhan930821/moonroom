// Stroll template: a street to walk down, buildings to look at, shops to buy souvenirs in.
// A theme (from Claude via server/worldGen.js, or offline from PRESETS) sets everything you see;
// the gameplay is the same in every theme. New themes, styles, rooms… are content files (src/stroll/content).
import { CHOICES, rng } from '../worlds/spec.js'
import './content/index.js'
import { all, ids } from './registry.js'

export const STYLES = ids('style') // registered in content/styles.js
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
  street: obj({ style: { ...pick(STYLES), description: all('style').map(s => `${s.id}=${s.label}`).join('；') }, road: pick(ROADS), height: { ...unit, description: '楼有多高' }, lanterns: { ...unit, description: '街上挂灯的密度' } }),
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
    street: { style: one(raw.street?.style, ids('style')), road: one(raw.street?.road, ROADS), height: clamp(raw.street?.height, 0, 1, .5), lanterns: clamp(raw.street?.lanterns, 0, 1, .6) },
    weather: { kind: one(raw.weather?.kind, CHOICES.weather), intensity: clamp(raw.weather?.intensity, 0, 1, .3) },
    hero: { kind: one(raw.hero?.kind, CHOICES.hero), color: color(raw.hero?.color, '#e8dcff'), glow: clamp(raw.hero?.glow, 0, 1, .5) },
    shops: shops.length ? shops : PRESETS[0].shops,
    music: { root: Math.round(clamp(raw.music?.root, 0, 11, 0)), scale: one(raw.music?.scale, CHOICES.scale), tempo: Math.round(clamp(raw.music?.tempo, 50, 110, 72)) },
    seed: Number.isFinite(raw.seed) ? raw.seed : Math.floor(Math.random() * 1e9),
  }
}

// Offline themes live in content/themes.js (registered as 'theme').
export const PRESETS = all('theme') // content is imported (and registered) before this module body runs

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
