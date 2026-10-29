// Pure Karplus–Strong string synthesis (no Web Audio here, so tests can run it in Node).

// Karplus–Strong: one period of filtered noise, then each sample is the damped average of the
// two samples one period back. `brightness` (0–.5) sets how fast the highs die away.
export function pluckSamples(freq, sampleRate, { brightness = .5, sustain = 3, seconds = 2.6, random = Math.random } = {}) {
  const period = Math.max(2, Math.round(sampleRate / freq))
  const out = new Float32Array(Math.round(sampleRate * seconds))
  // Loses 60 dB over `sustain` seconds: freq * sustain trips round the loop.
  const decay = Math.pow(.001, 1 / (freq * sustain))
  let prev = 0
  for (let i = 0; i < period && i < out.length; i++) { const n = random() * 2 - 1; prev = prev + (n - prev) * .7; out[i] = prev }
  for (let i = period; i < out.length; i++) {
    out[i] = decay * ((1 - brightness) * out[i - period] + brightness * out[i - period - 1 >= 0 ? i - period - 1 : i - period])
  }
  // Soft fade at the very end so a long note never clicks off.
  const tail = Math.min(out.length, Math.round(sampleRate * .08))
  for (let i = 0; i < tail; i++) out[out.length - 1 - i] *= i / tail
  return out
}
