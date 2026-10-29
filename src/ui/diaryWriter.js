// Writes a diary page from one day of the activity log, in the same voice as the authored
// pages in ./diary.js. Pure and deterministic per date, so a page never changes on re-read.
import { DIARY } from './diary.js'

const hash = text => { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
const pickFrom = seed => (list, salt = '') => list[hash(seed + salt) % list.length]
const names = list => list.map(n => `「${n}」`).join('、')

export const formatDate = key => { const [, m, d] = key.split('-').map(Number); return `${m} 月 ${d} 日` }

const OPENINGS = {
  night: ['今天是在深夜回到房间的，窗外的河比白天亮。', '夜里推开门的时候，月光已经铺到了地毯上。', '又是很晚才回来。房间没有怪我。'],
  morning: ['早上来的时候，窗外的云还没散。', '清晨的房间很安静，连风铃都没醒。'],
  day: ['白天的房间有一点陌生，阳光把书架照成了蜂蜜色。', '下午来坐了一会儿。'],
  evening: ['傍晚的时候回到这里，城堡的第一盏灯刚亮。', '天快黑的时候，我又回来了。'],
}
const CLOSINGS = ['房间会记得这一天。', '明天见。', '走之前我回头看了一眼，云团好像在目送我。', '灯一盏一盏地暗下去，像在说晚安。', '不知道明天窗外会是什么颜色。']

const partOfDay = time => { const h = new Date(time).getHours(); return h < 5 || h >= 22 ? 'night' : h < 10 ? 'morning' : h < 17 ? 'day' : 'evening' }

// day: { counts, lists, firstAt }. Returns { date, text } or null when nothing happened.
export function writeDiaryEntry(key, day) {
  const c = day?.counts || {}, l = day?.lists || {}
  if (!Object.values(c).some(Boolean)) return null
  const pick = pickFrom(key)
  const lines = [pick(OPENINGS[partOfDay(day.firstAt || Date.now())], 'open')]

  const music = []
  if (c.piano) music.push(`弹了 ${c.piano} 个音`)
  if (c.drums) music.push(`敲了 ${c.drums} 下鼓`)
  if (music.length) {
    let s = `我${music.join('，又')}`
    if (l.take?.length) s += `，还录下了${names(l.take.slice(-2))}`
    lines.push(s + (c.piano > 200 ? '。手指到现在还记得那些琴键。' : '。'))
  }
  if (c.band) lines.push(pick(['和朋友们组了一支乐队，鼓、吉他、钢琴挤在角落里，灯光跟着我们闪。', '小舞台的灯亮了。我们一起弹了一会儿，谁也没有看谱。'], 'band'))
  if (c.guitar) {
    const chords = (l.chord || []).slice(0, 3).join('、')
    lines.push(c.guitar > 30 ? `抱着吉他扫了 ${c.guitar} 下${chords ? `，${chords} 来回换` : ''}，指尖有点疼。` : `拿起吉他弹了几下${chords ? `，${chords}` : ''}，弦的声音比想象中温柔。`)
  }
  if (l.vinyl?.length) lines.push(`唱片机转着${names(l.vinyl.slice(-2))}，我走开了它也没有停。`)
  if (c.challenge) lines.push(pick(['试了一次节奏挑战，拍子比想象中难追。', '跟着光点打了一遍鼓，有几拍差一点点。'], 'ch'))

  const fox = l.fox || []
  if (fox.includes('眠眠') && fox.includes('云团')) lines.push('两只狐狸都摸过了。眠眠蹭了蹭我的手，云团的尾巴一直没停下来。')
  else if (fox.includes('眠眠')) lines.push(c.fox > 2 ? `摸了眠眠 ${c.fox} 次，它半睁着眼，假装还在睡。` : '轻轻摸了摸眠眠，它半睁着眼蹭了蹭我的手。')
  else if (fox.includes('云团')) lines.push('云团被摸得很开心，尾巴摇个不停。')

  if (l.world?.length) {
    let s = `推开任意门，去了${names(l.world.slice(-3))}`
    if (l.souvenir?.length) s += `，带回了${names(l.souvenir.slice(-2))}`
    lines.push(s + '。')
  }
  if (c.photo) lines.push(c.photo > 1 ? `在门的那边拍了 ${c.photo} 张照片，现在都挂在照片墙上。` : '在门的那边拍了一张照片，现在挂在照片墙上。')
  else if (c.photoUpload) lines.push('往照片墙上挂了几张自己的照片，墙一下子变得像我的了。')
  else if (c.photos) lines.push('把照片墙重新整理了一遍。')

  if (l.dream?.length) lines.push(`在床上睡了一会儿，梦见了${names(l.dream.slice(-1))}。`)
  else if (c.rest) lines.push('躺在沙发上看了一会儿窗外，天从夜里慢慢走到了白天。')
  if (c.note) lines.push('坐在书桌前写了点什么，没打算给任何人看。')
  if (c.books) lines.push('又翻了翻书架上的旧日记，有几页我已经能背下来了。')
  if (c.lamp >= 2) lines.push('把灯关了又开。关灯的时候，月光会一直走到沙发脚边。')
  else if (c.lamp) lines.push('关掉了一盏灯，房间暗了一点，月亮近了一点。')
  if (c.curtain) lines.push('拉窗帘的时候，风铃响了一下。')
  if (l.castle?.length) lines.push('窗外的城堡为我亮了一次灯。')

  // Keep it a page, not a list: the opening, the five most vivid lines, a closing.
  const body = lines.slice(1, 6)
  return { date: formatDate(key), key, text: [lines[0], ...body, pick(CLOSINGS, 'close')].join('') }
}

// All pages, newest first: today (unfinished), then past days, then the authored pages.
export function diaryPages(log, today) {
  const written = Object.keys(log?.days || {}).sort().reverse()
    .map(key => { const entry = writeDiaryEntry(key, log.days[key]); return entry && { ...entry, today: key === today, fresh: key !== today && key > (log.seen || '') } })
    .filter(Boolean)
  return [...written, ...DIARY]
}
