// Optional sound beds under the lofi music, all synthesized: rain on the windows, waves on a
// far shore, and a wood fire. Each fades in and out on its own; the drops, crackles and wave
// swells are scheduled ahead like the music (schedule(until) on a timer).
import { rng } from './lofiScore'

export const LAYERS = { rain: '雨声', waves: '海浪', fire: '篝火' }
const LEVEL = { rain: .25, waves: .19, fire: .3 } // about as loud as the music on average, sitting just under it

function noise(ctx, seconds, color = 'white', seed = 1) {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0), r = rng(seed)
  let b0 = 0, b1 = 0, b2 = 0, brown = 0
  for (let i = 0; i < data.length; i++) {
    const w = r() * 2 - 1
    if (color === 'pink') { b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; data[i] = (b0 + b1 + b2 + w * .1848) * .18 }
    else if (color === 'brown') { brown = (brown + w * .02) / 1.02; data[i] = brown * 3.2 }
    else data[i] = w
  }
  return buffer
}
function loop(ctx, buffer, dest) { const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; s.connect(dest); s.start(); return s }
function panner(ctx, pan) { if (!ctx.createStereoPanner) return ctx.createGain(); const p = ctx.createStereoPanner(); p.pan.value = pan; return p }

export function createNature(ctx, target) {
  const white = noise(ctx, 1, 'white', 3)
  const random = rng(42)
  const layers = {}
  const bus = name => { const g = ctx.createGain(); g.gain.value = 0; g.connect(target); return (layers[name] = { gain: g, on: false, next: ctx.currentTime }) }

  // Rain: a soft pink-noise hiss on the glass plus individual drops ticking left and right.
  const rain = bus('rain')
  const rainHiss = ctx.createGain()
  { const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 450; lp.type = 'lowpass'; lp.frequency.value = 5200; rainHiss.gain.value = .3
    loop(ctx, noise(ctx, 4.3, 'pink', 5), hp); hp.connect(lp).connect(rainHiss).connect(rain.gain) }
  // The shower comes and goes: every few seconds it settles on a new intensity, now and then
  // easing almost to a stop, so there is air between the drops.
  let rainIntensity = .5, rainShift = 0
  function drop(at) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner(ctx, random() * 1.6 - .8)
    s.buffer = white; f.type = 'bandpass'; f.frequency.value = 2500 + random() * 4500; f.Q.value = 6
    g.gain.setValueAtTime(.12 + random() * .2, at); g.gain.exponentialRampToValueAtTime(.001, at + .03 + random() * .03)
    s.connect(f).connect(g).connect(p).connect(rain.gain); s.start(at, random() * .8); s.stop(at + .07)
  }

  // Waves: low noise that swells in, breaks, and draws back every 7–11 s, from two sides.
  const waves = bus('waves')
  const shore = [-.45, .45].map((pan, i) => {
    const f = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner(ctx, pan)
    f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = .3; g.gain.value = .04
    loop(ctx, noise(ctx, 5.1 + i, 'pink', 9 + i), f); f.connect(g).connect(p).connect(waves.gain)
    return { f, g, next: ctx.currentTime + i * 4 }
  })
  function swell(side, at) {
    const len = 7 + random() * 4, peak = .5 + random() * .35
    side.g.gain.setTargetAtTime(peak, at, len * .18)                 // rolls in
    side.f.frequency.setTargetAtTime(1400 + random() * 600, at, len * .16)
    side.g.gain.setTargetAtTime(.05, at + len * .45, len * .2)       // breaks and draws back
    side.f.frequency.setTargetAtTime(280, at + len * .45, len * .22)
    return len
  }

  // Fire: a low rumble of the burning logs, sparse crackles in little clusters, the odd pop.
  const fire = bus('fire')
  { const lp = ctx.createBiquadFilter(), g = ctx.createGain()
    lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = .35
    loop(ctx, noise(ctx, 6.2, 'brown', 13), lp); lp.connect(g).connect(fire.gain) }
  function crackle(at, big = false) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = panner(ctx, random() * .6 - .3)
    s.buffer = white; f.type = big ? 'bandpass' : 'highpass'; f.frequency.value = big ? 900 + random() * 600 : 2000 + random() * 3000; f.Q.value = big ? 2 : .7
    const level = big ? .5 : .1 + random() * .25, len = big ? .06 : .006 + random() * .012
    g.gain.setValueAtTime(level, at); g.gain.exponentialRampToValueAtTime(.001, at + len)
    s.connect(f).connect(g).connect(p).connect(fire.gain); s.start(at, random() * .8); s.stop(at + len + .01)
  }

  function schedule(until) {
    if (rain.on) while (rain.next < until) {
      if (rain.next >= rainShift) {
        rainIntensity = random() < .2 ? .12 + random() * .1 : .3 + random() * .55
        rainShift = rain.next + 3 + random() * 5
        rainHiss.gain.setTargetAtTime(.1 + rainIntensity * .3, rain.next, 1.5)
      }
      drop(rain.next)
      rain.next += (.1 + random() * .4) / rainIntensity
    }
    if (waves.on) for (const side of shore) while (side.next < until) side.next += swell(side, side.next)
    if (fire.on) while (fire.next < until) {
      const burst = random() < .25 ? 3 + Math.floor(random() * 5) : 1
      for (let k = 0; k < burst; k++) crackle(fire.next + k * (.015 + random() * .05))
      if (random() < .05) crackle(fire.next + .1, true)
      fire.next += .08 + random() * .5
    }
  }
  function set(name, on) {
    const layer = layers[name]
    if (!layer || layer.on === on) return
    layer.on = on
    const now = ctx.currentTime
    if (on) { layer.next = now + .05; if (name === 'waves') shore.forEach((s, i) => { s.next = now + i * 3.5 }) }
    layer.gain.gain.setTargetAtTime(on ? LEVEL[name] : 0, now, on ? 1.2 : .6)
  }
  return { set, schedule }
}
