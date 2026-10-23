// Pure purchase rule (tested): enough coins and not already owned.
export function spend(coins, price, owned) {
  if (owned) return { ok: false, coins, reason: '已经买过了' }
  if (coins < price) return { ok: false, coins, reason: `还差 ${price - coins} 枚月光币` }
  return { ok: true, coins: coins - price }
}
