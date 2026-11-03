// Blindfold rehearsal (闭眼排练): in the dark, Lin Che loops F–G–F on the piano; before each of
// Sasa's entries you hear her take a breath. Press on the moment she comes in. Lock in three
// times and the three of them find each other; that unlocks the chapter (BLINDFOLD_STORY).
// Timing and judging are pure so tests cover them; src/audio/blindfold.js makes the sound.

export const PERIOD = 3.6     // seconds between Sasa's entries
export const BREATH = 1.15    // her breath swells for this long before each entry
export const WINDOW = .2      // press within ±0.2 s of the entry to lock in
export const NEEDED = 3       // locks to finish
export const MAX_CUES = 9     // after this many entries the take ends either way

// Entry times (audio-clock seconds) for a take starting at `start`.
export const cueTimes = (start, count = MAX_CUES) => Array.from({ length: count }, (_, i) => start + 2.4 + i * PERIOD)

// Judge one press against the entries not yet used. Returns { result, cue, offset }:
// 'lock' (in the window), 'early' / 'late' (near an entry but outside the window), or 'stray'.
export function judge(press, cues, used = new Set()) {
  let best = -1, bestD = Infinity
  cues.forEach((t, i) => { if (!used.has(i) && Math.abs(press - t) < Math.abs(bestD)) { best = i; bestD = press - t } })
  if (best < 0 || Math.abs(bestD) > PERIOD * .45) return { result: 'stray', cue: -1, offset: 0 }
  return { result: Math.abs(bestD) <= WINDOW ? 'lock' : bestD < 0 ? 'early' : 'late', cue: best, offset: bestD }
}

const KEY = 'moonroom.blindfold'
export const blindfoldProgress = {
  get() { try { return { unlocked: false, best: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { unlocked: false, best: 0 } } },
  save(patch) { try { localStorage.setItem(KEY, JSON.stringify({ ...blindfoldProgress.get(), ...patch })) } catch {} },
}

// The chapter it unlocks: 《同一扇窗》, the blindfold version.
export const BLINDFOLD_STORY = [
  { title: '第一条丝巾', text: '那天他们已经把副歌排了二十几遍，每一遍都对，每一遍都不对，像三个人各自站在三个房间里，隔着墙在唱同一首歌。\n\n沈聿把吉他放下，从外套口袋里掏出三条东西：一条黑色的旧领带，一条洗褪色的蓝发带，还有一条 Sasa 落在沙发上的淡紫色丝巾，边上绣着一圈很小的白花。\n\n「蒙上。」他说，「今天不准看。我们一直在用眼睛排练，耳朵根本没在干活。」\n\n最后是 Sasa 先系上的。她把丝巾折成窄窄的一条，在脑后打了一个松松的结，站在麦克风前，脸微微抬着，像在等一场雨。\n\n阁楼一下子变得很大。' },
  { title: '林澈：找到她', text: '眼睛一看不见，林澈先注意到的是声音有多少：天窗外很远的风，音箱里一点点电流的嗡嗡声，坐垫里填充物的沙沙声，还有 Sasa 的呼吸，比他想象的快。\n\n他弹那几个音，F，G，F。以前他一直看着她，等她肩膀往上提就知道副歌要来了。现在只能听：听她在第三遍快结束时轻轻吸了一口气，比平时深一点，带着一点颤。\n\n他的左手比脑子先反应过来，往下沉了半拍，等她。\n\n她唱的时候，声音好像不是从前面传过来，而是从他胸口正中间发出来的。他第一次听见她高音前那个很小的停顿，像一个人站在跳台边上，脚趾扣住边缘。\n\n这一次他什么都没幻想。他只是很确定：在这片黑暗里，他知道她在哪。' },
  { title: '沈聿：不用看也知道', text: '他提议蒙眼，是想证明音乐是一门技术。可眼睛一闭上，技术就不够用了。\n\n他听见林澈的左手沉了半拍，没有任何人提示。他听见 Sasa 高音前的停顿，自己的手也跟着停住，拨片悬在弦上方半厘米，等。\n\n三个人在同一个瞬间停住，又在同一个瞬间落下。\n\n他后背的汗毛一下全立起来。乐队里管这个叫「锁住了」：三个人的心跳像被同一根线拉着，一辈子可能只碰到几次。\n\n以前他总提醒自己，出口只是刚好站在灯下的那个人。可现在没有灯。出口还在，是黑暗里那两个呼吸声，一个快一点，一个慢一点，就在离他一米远的地方。\n\n最后一个和弦，他按住了，一直没松。三个人谁都不想先摘下来。' },
  { title: 'Sasa：不会被冲走', text: '她以前很怕那个高音。它比她大太多了，每次唱到那里，她都觉得自己会像一张纸被风吹进暴雨里。\n\n这一次，三个人都蒙着眼。她第一次知道，他们也在听她，不是看，是听。\n\n那股巨大的力量又来了，从脚底、从地板、从窗外的河涌上来。但她听见林澈的左手在下面接着她，听见沈聿的拨片在上面等着她。那个大得吓人的东西穿过她的时候，左右两边各有一个人，也在被它穿过。\n\n原来不是她一个人站在悬崖边上。三个人一起被冲走，也就等于谁都没有被冲走。\n\n丝巾被眼泪洇湿了一小块。她非常、非常想就这样待着，不开灯，不回到那个有闹钟、明天还要各自回家的世界。' },
  { title: '天窗下', text: '那天晚上，他们没有摘下来。\n\nSasa 摸索着躺到天窗下的坐垫上：「过来，看星星。」\n「我们看不见。」\n「那就听。」\n\n三个人并排躺着，她在中间。他们听见天窗玻璃上雨后的水珠在往下滑，听见彼此都没睡着，听见三个人的呼吸一点一点，变成了同一个节奏。\n\n过了很久，林澈很轻地说：「月亮在等的，一直是同一扇窗。」\n「你又看不见月亮。」\n「不用看。我知道它在那里。」\n\nSasa 伸出两只手，左边碰到一只手，右边碰到一只手，都有点凉，也都没有躲开。\n\n那天晚上，untitled_final_v14.wav 被改了名字，叫《同一扇窗》。' },
]
