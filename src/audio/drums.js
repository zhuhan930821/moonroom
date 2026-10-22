const sampleUrls = {
  kick: '/assets/audio/kick.m4a',
  snare: '/assets/audio/snare.m4a',
  hihat: '/assets/audio/hihat.m4a',
}

let context
let samplePromise
let master
let ambientGain
let ambientPlaying = false
let volume = .42

function getContext() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)()
    master = context.createGain()
    master.gain.value = volume
    master.connect(context.destination)
  }
  return context
}

export async function prepareAudio() {
  const audio = getContext()
  await audio.resume()
  samplePromise ??= Promise.all(Object.entries(sampleUrls).map(async ([name, url]) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Audio load failed: ${url}`)
    const buffer = await audio.decodeAudioData(await response.arrayBuffer())
    return [name, buffer]
  })).then(entries => Object.fromEntries(entries))
  return samplePromise
}

export async function playDrum(name) {
  const samples = await prepareAudio()
  const audio = getContext()
  const source = audio.createBufferSource()
  const gain = audio.createGain()
  source.buffer = samples[name]
  gain.gain.value = name === 'hihat' ? .72 : .9
  source.connect(gain).connect(master)
  source.start()
  return audio.currentTime
}

function makeAmbient() {
  const audio = getContext()
  ambientGain = audio.createGain()
  ambientGain.gain.value = 0
  ambientGain.connect(master)
  // Original quiet drone and room air; no external music recording.
  ;[130.81, 196, 261.63].forEach((frequency, i) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.value = [.12, .06, .045][i]
    osc.connect(gain).connect(ambientGain)
    osc.start()
  })
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + (Math.random() * 2 - 1) * .025) * .995
    data[i] = last
  }
  const noise = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  noise.buffer = noiseBuffer
  noise.loop = true
  filter.type = 'lowpass'
  filter.frequency.value = 550
  gain.gain.value = .12
  noise.connect(filter).connect(gain).connect(ambientGain)
  noise.start()
}

export async function setAmbientPlaying(playing) {
  const audio = getContext()
  await audio.resume()
  if (!ambientGain) makeAmbient()
  ambientPlaying = playing
  ambientGain.gain.setTargetAtTime(playing ? .7 : 0, audio.currentTime, .8)
  return ambientPlaying
}

export function setMasterVolume(value) {
  volume = Math.max(0, Math.min(1, value))
  if (master) master.gain.setTargetAtTime(volume, getContext().currentTime, .05)
}

export function getAmbientPlaying() { return ambientPlaying }
