// Each world plays its own generative music from its spec: a soft drone on the root and fifth,
// and sparse bell-like notes from its scale at its tempo, through a long feedback delay.
import { audioGraph, getAmbientPlaying, setAmbientPlaying } from '../audio/drums'

const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], pentatonic: [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10] }

export function startWorldMusic(music = { root: 0, scale: 'pentatonic', tempo: 70 }) {
  const { ctx, master } = audioGraph()
  const roomAmbient = getAmbientPlaying()
  if (roomAmbient) setAmbientPlaying(false)
  const bus = ctx.createGain(); bus.gain.value = 0; bus.gain.setTargetAtTime(.55, ctx.currentTime, 1.5); bus.connect(master)
  const delay = ctx.createDelay(2), feedback = ctx.createGain(), wet = ctx.createGain()
  delay.delayTime.value = 60 / music.tempo * .75; feedback.gain.value = .45; wet.gain.value = .35
  delay.connect(feedback).connect(delay); delay.connect(wet).connect(bus)
  const f = midi => 440 * 2 ** ((midi - 69) / 12)
  const nodes = []
  ;[[36, .05], [43, .035], [48, .02]].forEach(([n, level]) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter()
    osc.type = 'triangle'; osc.frequency.value = f(n + music.root); filter.type = 'lowpass'; filter.frequency.value = 600
    gain.gain.value = level; osc.connect(filter).connect(gain).connect(bus); osc.start(); nodes.push(osc)
  })
  const scale = SCALES[music.scale] || SCALES.pentatonic
  const beat = 60 / music.tempo
  let next = ctx.currentTime + .5
  const timer = setInterval(() => {
    while (next < ctx.currentTime + .3) {
      if (Math.random() < .55) {
        const note = 60 + music.root + scale[Math.floor(Math.random() * scale.length)] + (Math.random() < .3 ? 12 : 0)
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.type = 'sine'; osc.frequency.value = f(note)
        gain.gain.setValueAtTime(0, next); gain.gain.linearRampToValueAtTime(.07, next + .01); gain.gain.exponentialRampToValueAtTime(.0001, next + 2.4)
        osc.connect(gain); gain.connect(bus); gain.connect(delay); osc.start(next); osc.stop(next + 2.5)
      }
      next += beat * (Math.random() < .5 ? 1 : 2)
    }
  }, 60)
  return () => {
    clearInterval(timer)
    bus.gain.setTargetAtTime(0, ctx.currentTime, .4)
    setTimeout(() => { nodes.forEach(osc => osc.stop()); bus.disconnect() }, 1800)
    if (roomAmbient) setAmbientPlaying(true)
  }
}
