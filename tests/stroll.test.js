import test from 'node:test'
import assert from 'node:assert/strict'
import { PRESETS, STROLL_SCHEMA, generateStrollOffline, normalizeStroll } from '../src/stroll/spec.js'
import { spend } from '../src/stroll/wallet.js'

test('wishes pick a matching street theme offline', () => {
  assert.equal(generateStrollOffline('下雪的小镇', 1).name, '雪灯小巷')
  assert.equal(generateStrollOffline('樱花糖果街', 1).name, '樱糖坡')
  assert.equal(generateStrollOffline('沙漠里的夜市', 1).name, '金沙集市')
  assert.ok(PRESETS.map(p => p.name).includes(generateStrollOffline('', 3).name))
})

test('every preset is a valid street with priced goods', () => {
  for (const preset of PRESETS) {
    const s = normalizeStroll({ ...preset, seed: 1 })
    assert.equal(s.kind, 'stroll'); assert.ok(s.shops.length >= 4)
    for (const shop of s.shops) for (const g of shop.goods) assert.ok(g.price >= 2 && g.price <= 30 && g.id)
  }
})

test('normalize repairs a broken street and the schema is strict', () => {
  const s = normalizeStroll({ street: { style: 'skyscraper' }, shops: [{ name: '', goods: [{ price: 999, shape: 'car' }] }] })
  assert.equal(s.street.style, 'cottage'); assert.equal(s.shops[0].goods[0].price, 30); assert.equal(s.shops[0].goods[0].shape, 'stone')
  const walk = node => { if (node.type === 'object') { assert.equal(node.additionalProperties, false); Object.values(node.properties).forEach(walk) } if (node.type === 'array') walk(node.items) }
  walk(STROLL_SCHEMA)
})

test('buying needs enough coins and never sells the same thing twice', () => {
  assert.deepEqual(spend(10, 4, false), { ok: true, coins: 6 })
  assert.equal(spend(3, 4, false).ok, false)
  assert.equal(spend(30, 4, true).reason, '已经买过了')
})
