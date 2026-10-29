// Controller layouts per instrument, band seats and the auto camera's shot choice.
// All pure, so tests cover them without a real controller.

// B always backs out, so no instrument uses it.
export const DRUM_PAD = { A: 'kick', X: 'snare', Y: 'hihat', LB: 'hihatOpen', RB: 'crash', LT: 'floor', RT: 'ride', Left: 'tom1', Right: 'tom2', Up: 'tom1', Down: 'kick' }

// Piano: an easy C-major scale across the d-pad and face buttons; LB / RB shift octave.
export const PIANO_PAD = { Left: 0, Down: 2, Right: 4, Up: 5, X: 7, A: 9, Y: 11, RT: 12 }
export const PIANO_PAD_BASE = 60 // middle C

// Guitar: d-pad picks a chord (hold LB for the second four), RT strums down, LT strums up,
// A strums down too (easy on any pad), X mutes.
export const GUITAR_CHORD_PAD = { Up: ['C', 'Dm'], Right: ['G', 'Em'], Down: ['Am', 'E'], Left: ['F', 'A'] }
export const guitarChordFor = (button, shifted) => GUITAR_CHORD_PAD[button]?.[shifted ? 1 : 0] || null

export const PAD_HELP = {
  explore: '左摇杆 走 · 右摇杆 看 · A 互动 · Y 窗帘 · Start 乐队模式',
  drums: 'A 底鼓 · X 军鼓 · Y 踩镲 · LB 开镲 · RB 吊镲 · RT 叮叮镲 · LT 落地通鼓 · ←/→ 通鼓 · B 起身',
  piano: '←↓→↑ C D E F · X A Y G A B · RT 高音 C · LB/RB 换八度 · B 起身',
  guitar: '十字键 选和弦（按住 LB 换另外四个）· RT/A 下扫 · LT 上扫 · X 闷音 · B 放下',
}

// ---------- band mode ----------
export const BAND_PARTS = ['drums', 'guitar', 'piano']
export const PART_NAMES = { drums: '鼓', guitar: '吉他', piano: '钢琴' }
// The keyboard can take a seat too, so one or two controllers + the keyboard make a trio.
export const KEYBOARD = 'kb'
export const playerLabel = id => id === KEYBOARD ? '键盘' : `手柄 ${id + 1}`
export const KEYBOARD_HELP = {
  drums: 'J K L ; 底鼓 军鼓 踩镲 开镲 · U I O 通鼓 · Y H 镲片',
  guitar: '1–8 换和弦 · 空格 扫弦 · Shift+空格 反扫 · J K L ; 分解 · M 闷音',
  piano: 'Z…/ 下排 · Q…P 上排 · S D / 2 3 行是黑键',
}

// seats: { drums: padIndex | null, ... }. A pad joins the first free part.
export function joinBand(seats, pad) {
  if (Object.values(seats).includes(pad)) return seats
  const free = BAND_PARTS.find(part => seats[part] == null)
  return free ? { ...seats, [free]: pad } : seats
}
export const leaveBand = (seats, pad) => Object.fromEntries(BAND_PARTS.map(part => [part, seats[part] === pad ? null : seats[part]]))
// Moves a seated pad to the next free part in `dir` (+1 / -1), wrapping around.
export function switchPart(seats, pad, dir) {
  const from = BAND_PARTS.find(part => seats[part] === pad)
  if (!from) return seats
  for (let step = 1; step < BAND_PARTS.length; step++) {
    const to = BAND_PARTS[(BAND_PARTS.indexOf(from) + dir * step + BAND_PARTS.length * 2) % BAND_PARTS.length]
    if (seats[to] == null) return { ...seats, [from]: null, [to]: pad }
  }
  return seats
}
export const partOf = (seats, pad) => BAND_PARTS.find(part => seats[part] === pad) || null

// ---------- auto camera ----------
// ages: seconds since each part last played. One part playing alone gets its close-up; two or
// more (or nobody) get the wide shot. A shot is held at least `hold` seconds so it never flickers.
export function chooseShot(ages, current, heldFor, { active = 1.4, hold = 2.6 } = {}) {
  const playing = BAND_PARTS.filter(part => ages[part] < active)
  const want = playing.length === 1 ? playing[0] : 'wide'
  if (want === current || heldFor < hold) return current
  return want
}
