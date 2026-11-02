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
    loftSpot: [-7.35, 5.75], // in the loft band corner, by the mic
    togetherSpot: [-8.6, 2.55], lean: 1, // on the stargazing mat with Lin Che (see LOFT_TOGETHER)
    quote: '我不是谁的灵感，也不是谁的答案。我只是我，而我现在，想要你们都认真。',
    lines: ['鼓凳借我一下？就一首。', '这个房间的月亮，比我写过的都亮。', '今晚别排练了，直接录吧。'],
    playing: '再大声一点！',
  },
  {
    id: 'shenyu', name: '沈聿', part: 'guitar', role: '作曲 · 制作 · 吉他', tint: '#ffb36b',
    image: '/assets/band/shenyu.webp', play: '/assets/band/shenyu-play.webp', position: [7.3, 1.15], // beside the guitar wall, out of the guitar camera (7.55, -.5)
    seat: [8.55, .55], faces: [9.6, .55], // while you play: at the wall's end, turned to the guitars
    loftSpot: [-8.85, 6.75],
    quote: '你以为这只是一首歌？我听见的，是你没有说出口的那部分。',
    lines: ['那把红色的琴，弦该换了。', '别急着收尾，最后一个和弦让它多响一会儿。', '这段我再听一遍。'],
    playing: '……还不错。再来一遍。',
  },
  {
    id: 'linche', name: '林澈', part: 'piano', role: '编曲 · 键盘 · 作词', tint: '#a9c8ff',
    image: '/assets/band/linche.webp', play: '/assets/band/linche-play.webp', position: [-6.85, 4.35], // between the piano and the record player
    seat: [-7.75, 3.6], faces: [-8.9, 3.6], maxTurn: Math.PI / 2, // while playing: at the piano's upper end, squarely facing the keys
    loftSpot: [-8.75, 5.15],
    togetherSpot: [-8.05, 2.7], lean: -1,
    quote: '我可以一直在你身边，但我不想一直假装我对你和对其他人一样。',
    lines: ['你刚才那段，我记下来了。', '累了就去沙发上躺会儿。', '这首的副歌，我想换个和弦。'],
    playing: '左手轻一点，会更温柔。',
  },
]

// When you're up on the loft they float up to the rehearsal corner and talk among themselves.
export const LOFT_CHAT = [
  ['sasa', '副歌那里，鼓我想晚半拍进。'],
  ['shenyu', '晚半拍可以。但别拖，拖了就没劲了。'],
  ['linche', '那我把和弦换成 Fmaj7，留点空给你。'],
  ['sasa', '……有人上来了。'],
  ['shenyu', '爬绳子上来的？手不疼吗。'],
  ['linche', '欢迎来排练间。别踩到那根线。'],
  ['sasa', '你刚才在楼下弹的那段，我们都听到了。'],
  ['shenyu', '节奏还可以。就是最后一个音收得太快。'],
  ['linche', '他的意思是，很好听。'],
  ['sasa', '天窗那边能看到流星。要许愿的话，现在正好。'],
  ['shenyu', '下一首写什么？'],
  ['linche', '写这个房间吧。月亮，绳子，还有今天来的人。'],
]

// Every so often on the loft, Lin Che and Sasa slip away from the band corner to the stargazing
// mat and sit close under the skylight; Shen Yu stays by the amp and teases them. Tender, not
// more than that: leaning in, a soft glow between them, a few lines.
export const LOFT_TOGETHER = { pair: ['sasa', 'linche'], rehearse: 38, together: 46 } // seconds per phase
export const TOGETHER_CHAT = [
  ['linche', '冷吗？靠过来一点。'],
  ['sasa', '……就一点点。'],
  ['sasa', '你看，那颗星星在动。'],
  ['linche', '是流星。快许愿。'],
  ['sasa', '许好了。不告诉你。'],
  ['linche', '我猜得到。'],
  ['shenyu', '你们两个，还排不排练了。'],
  ['sasa', '再看一会儿嘛。'],
  ['linche', '那首歌的最后一句，我写好了。是写给你的。'],
  ['sasa', '……念给我听。'],
  ['linche', '「月亮在等的，一直是同一扇窗。」'],
  ['shenyu', '……我去调音了。'],
]

// The pair's moments as drawn together (assets-source/band/sasa-linche-duo.png); one per visit
// to the mat, in turn. Heights are metres in the room (which runs ~1.5x real scale).
export const DUO_SCENES = [
  { image: '/assets/band/duo-lean.webp', spot: [-8.35, 3.2], height: 1.85, lift: .02 },  // her head on his shoulder, on the mat
  { image: '/assets/band/duo-hair.webp', spot: [-7.85, 5.85], height: 2.15, lift: .3 },  // he tucks her hair back, in the band corner
  { image: '/assets/band/duo-back.webp', spot: [-8.35, 3.2], height: 1.8, lift: .02 },   // back to back after rehearsal
]

// The band's photo album, pinned up and paged through in the rehearsal corner.
export const MEMORIES = [
  ['a01', '录音那天，三个人挤在一支麦前。'], ['a02', '改了一整晚的歌词。'], ['a03', '林澈弹琴，Sasa 在后面打鼓。'],
  ['a04', '第一首歌写完的晚上，干杯。'], ['a05', '谁也没说话，就这样靠了一会儿。'], ['a06', '她唱到最高的那个音。'],
  ['a07', '那天她哭了。林澈一直坐在旁边。'], ['a08', '沈聿在窗边睡着了，外面在下雨。'], ['a09', '凌晨三点，她一个人剪完了音轨。'],
  ['b01', '躺在天台上数星星。'], ['b02', '他弹琴的时候，她靠在他肩上。'], ['b03', '吉他声停了，她已经睡着了。'],
  ['b04', '水晶球里的光，像一颗很小的星球。'], ['b05', '鼓声一响，整个房间都醒了。'], ['b06', '笑到停不下来。'],
  ['b07', '窗边的月亮，和一只不怕人的小狐狸。'], ['b08', '林澈一个人对着谱子，很久。'], ['b09', '她睡在两个人中间。'],
  ['b10', '闭上眼睛，唱给耳机里的世界。'], ['b11', '三个人一起写的第一页歌词。'], ['b12', '她指着流星：看！'],
  ['b13', '他递给她一朵小花。'], ['b14', '不需要观众的排练。'], ['b15', '书堆里的下午。'], ['b16', '最后，躺在一起看天花板上的星星。'],
  ['c01', '三个人挤在一起，谁也不想先松手。'], ['c02', '她笑得停不下来，鼓棒都快掉了。'], ['c03', '一起改歌词，她戴着耳机偷偷哼。'],
  ['c04', '沈聿教她弹吉他，手把手。'], ['c05', '排练到最后，三个人靠着睡着了。'], ['c06', '她打鼓，他们一个弹吉他，一个弹琴。'],
].map(([id, caption]) => ({ image: `/assets/band/memories/${id}.webp`, caption }))

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
