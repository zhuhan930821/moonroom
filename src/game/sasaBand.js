// Hidden mode: type "sasa" (or tap the neon moon-fox three times on a phone) and Sasa's band
// shows up in the room as three drifting portraits, one by each instrument.
// The secret-matching helpers are pure so tests cover them without a browser.

export const SECRET = ['KeyS', 'KeyA', 'KeyS', 'KeyA']
export const SECRET_WINDOW = 2.2 // seconds the whole word may take
export const TAPS = 3, TAP_WINDOW = 1.6

// keys: [{ code, t }] most recent last. Returns the trimmed list and whether the word just landed.
export function pushSecretKey(keys, code, t) {
  const next = [...keys, { code, t }].filter(k => t - k.t <= SECRET_WINDOW).slice(-SECRET.length)
  const hit = next.length === SECRET.length && next.every((k, i) => k.code === SECRET[i])
  return { keys: hit ? [] : next, hit }
}
export function pushTap(taps, t) {
  const next = [...taps, t].filter(x => t - x <= TAP_WINDOW)
  const hit = next.length >= TAPS
  return { taps: hit ? [] : next, hit }
}

export const MEMBERS = [
  {
    id: 'sasa', name: 'Sasa', part: 'drums', role: '主唱 · 鼓 · 作曲', tint: '#ff8fc8',
    image: '/assets/band/sasa.webp', play: '/assets/band/sasa-play.webp', position: [-4.75, -1.15], // beside the drum rug
    seat: [-5.85, -2.6], faces: [-7.1, -2.8], // while playing: at the kit's side, facing it
    quote: '我不是谁的灵感，也不是谁的答案。我只是我，而我现在，想要你们都认真。',
    lines: ['鼓凳借我一下？就一首。', '这个房间的月亮，比我写过的都亮。', '今晚别排练了，直接录吧。'],
    playing: '再大声一点！',
  },
  {
    id: 'shenyu', name: '沈聿', part: 'guitar', role: '作曲 · 制作 · 吉他', tint: '#ffb36b',
    image: '/assets/band/shenyu.webp', play: '/assets/band/shenyu-play.webp', position: [7.75, -.45], // in front of the guitars and amp, clear of the bookcase
    quote: '你以为这只是一首歌？我听见的，是你没有说出口的那部分。',
    lines: ['那把红色的琴，弦该换了。', '别急着收尾，最后一个和弦让它多响一会儿。', '这段我再听一遍。'],
    playing: '……还不错。再来一遍。',
  },
  {
    id: 'linche', name: '林澈', part: 'piano', role: '编曲 · 键盘 · 作词', tint: '#a9c8ff',
    image: '/assets/band/linche.webp', play: '/assets/band/linche-play.webp', position: [-6.85, 4.35], // between the piano and the record player
    seat: [-8.0, 3.7], faces: [-8.9, 3.7], // while playing: at the piano's upper end, facing the keys
    quote: '我可以一直在你身边，但我不想一直假装我对你和对其他人一样。',
    lines: ['你刚才那段，我记下来了。', '累了就去沙发上躺会儿。', '这首的副歌，我想换个和弦。'],
    playing: '左手轻一点，会更温柔。',
  },
]

const KEY = 'moonroom.sasaBand'
function load() {
  try { return { discovered: false, on: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { discovered: false, on: false } }
}
let state = { ...load(), talk: null, toast: null }
const listeners = new Set()
const set = patch => {
  state = { ...state, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify({ discovered: state.discovered, on: state.on })) } catch {}
  listeners.forEach(l => l())
}

export const sasaBand = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  toggle() { const on = !state.on; set({ on, discovered: true, talk: null, toast: { id: Date.now(), on } }) },
  // Who is talking near the player (null when nobody); only changes when the line does.
  say(talk) { if (talk?.id !== state.talk?.id || talk?.line !== state.talk?.line) set({ talk }) },
}
