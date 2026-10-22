// Every review/debug URL switch lives here so the default room is explicit.
// Defaults are what a plain `npm run dev` URL shows; QA URLs only override them.
export function parseFlags(search = '') {
  const q = new URLSearchParams(search)
  const on = key => q.get(key) === '1'
  const notOff = key => q.get(key) !== '0'
  const pass = q.get('lightingPass')
  return {
    // Camera / capture QA
    spawn: q.get('spawn'),
    capture: on('capture'),
    captureMode: q.get('captureMode'),
    captureName: q.get('captureName') || q.get('spawn') || 'room',
    whiteModel: on('whiteModel'),
    // Lighting
    lightingPass: ['current', 'moon', 'warm', 'combined', 'bloom'].includes(pass) ? pass : 'current',
    lightingDebug: on('lightingDebug'),
    visualBaseline: on('visualBaseline'),
    // Architecture shell: 'polyhaven' (default), 'phase1' or 'oakTest'; ?architecture=legacy uses the old Three.js shell
    legacyArchitecture: q.get('architecture') === 'legacy',
    floor: { legacy: 'phase1', 1: 'oakTest' }[q.get('floorMaterialTest')] || 'polyhaven',
    // Approved workstation assets (C01 desk, C03 laptop + monitor, C05 MIDI); =0 shows the old placeholders
    desk: notOff('deskCandidate'),
    laptop: notOff('laptopCandidate'),
    midi: notOff('midiCandidate'),
    // Opt-in candidates, not default
    drumCandidate: on('drumCandidate'),
    decorSample: on('decorSample'),
    rugPileTest: on('rugPileTest'),
    rugMaterialTest: on('rugMaterialTest'),
    // Curtains
    voile: notOff('voileSample'),
    curtainClosed: on('curtainClosed'),
  }
}

export const FLAGS = parseFlags(typeof window === 'undefined' ? '' : window.location.search)
