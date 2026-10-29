// Karplus–Strong pluck synthesis. Pure function so pitch and decay can be tested in Node.
export function pluckSamples(freq, sampleRate, { brightness = .5, sustain = 3, seconds = 2.6, random = Math.random } = {}) {
  const period = Math.max(2, Math.round(sampleRate / freq))
  const out = new Float32Array(Math.round(sampleRate * seconds))
  const decay = Math.pow(.001, 1 / (freq * sustain))
  let prev = 0
  for (let i = 0; i < period && i < out.length; i++) {
    const noise = random() * 2 - 1
    prev += (noise - prev) * .7
    out[i] = prev
  }
  for (let i = period; i < out.length; i++) {
    const earlier = i - period
    out[i] = decay * ((1 - brightness) * out[earlier] + brightness * out[Math.max(0, earlier - 1)])
  }
  const tail = Math.min(out.length, Math.round(sampleRate * .08))
  for (let i = 0; i < tail; i++) out[out.length - 1 - i] *= i / tail
  return out
}
