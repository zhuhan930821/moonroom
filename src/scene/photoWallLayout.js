// Salon-style photo wall layout: mixed sizes and frames packed into columns that rise and fall
// around a midline, so the wall looks staggered (错落) but still tidy. Pure, so tests can run it.

const rand = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 } }
const hash = text => { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

export const FRAMES = ['polaroid', 'wood', 'black', 'gold', 'cream']
const BORDER = { polaroid: .035, wood: .03, black: .018, gold: .028, cream: .04 }
const SIZES = { large: .58, medium: .42, small: .3 } // picture heights before scaling to fit

// items: [{ id, aspect, featured? }] in hanging order. Returns [{ id, x, y, w, h, pw, ph, rot, frame }]:
// x/y are the frame centre on the wall (x along the wall, y up from the wall centre), w/h the
// outer frame size, pw/ph the picture inside it.
export function layoutPhotoWall(items, { seed = 1, width = 5, height = 1.9, gap = .09 } = {}) {
  if (!items.length) return []
  const r = rand(seed * 7919 + items.length)
  const boxes = items.map((item, i) => {
    const local = rand(hash(item.id) ^ seed)
    const frame = FRAMES[Math.floor(local() * FRAMES.length)]
    // One large anchor near the middle, a few medium, the rest small.
    const mid = Math.abs(i - (items.length - 1) / 2) < .6
    const roll = local()
    const size = mid ? 'large' : item.featured || roll < .38 ? 'medium' : 'small' // your own photos never hang small
    const aspect = Math.min(1.8, Math.max(.55, item.aspect || 1))
    const ph = SIZES[size] * (aspect > 1.2 ? .82 : 1)
    const pw = ph * aspect
    const b = BORDER[frame]
    return { id: item.id, frame, size, pw, ph, w: pw + b * 2, h: ph + b * 2 + (frame === 'polaroid' ? ph * .22 : 0) }
  })

  // Columns: a large photo stands alone; smaller ones stack two (sometimes three) high.
  const columns = []
  let i = 0
  while (i < boxes.length) {
    const col = [boxes[i++]]
    if (col[0].size !== 'large') {
      const want = r() < .25 ? 3 : r() < .8 ? 2 : 1
      while (col.length < want && i < boxes.length && boxes[i].size !== 'large') col.push(boxes[i++])
    }
    columns.push(col)
  }

  const colHeight = col => col.reduce((sum, b) => sum + b.h, 0) + gap * (col.length - 1)
  const colWidth = col => Math.max(...col.map(b => b.w))
  const rawWidth = columns.reduce((sum, col) => sum + colWidth(col), 0) + gap * (columns.length - 1)
  const rawHeight = Math.max(...columns.map(colHeight))
  // A little margin so tilted polaroids stay inside the bounds.
  const scale = Math.min(1.25, width * .98 / rawWidth, height * .96 / rawHeight)

  const out = []
  let x = -rawWidth * scale / 2
  columns.forEach((col, c) => {
    const cw = colWidth(col) * scale, ch = colHeight(col) * scale
    // Columns alternate a little above / below the midline; never past the wall bounds.
    const room = Math.max(0, (height - ch) / 2)
    const lift = Math.max(-room, Math.min(room, (c % 2 ? -1 : 1) * (.04 + r() * .08) * (col.length === 1 ? .5 : 1)))
    let y = ch / 2 + lift
    for (const b of col) {
      const w = b.w * scale, h = b.h * scale
      // Narrower photos sit slightly off the column centre so edges don't line up perfectly.
      const nudge = (cw - w) / 2 * (r() * 2 - 1) * .8
      out.push({ id: b.id, frame: b.frame, x: x + cw / 2 + nudge, y: y - h / 2, w, h, pw: b.pw * scale, ph: b.ph * scale, rot: b.frame === 'polaroid' ? (r() - .5) * .12 : (r() - .5) * .025 })
      y -= h + gap * scale
    }
    x += cw + gap * scale
  })
  return out
}
