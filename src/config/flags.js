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
    // Scripted product-video capture (scripts/record_demo.mjs): exposes camera/game/audio hooks, hides QA UI
    demo: on('demo'),
    // Lighting
    lightingPass: ['current', 'moon', 'warm', 'combined', 'bloom', 'golden'].includes(pass) ? pass : 'golden',
    lightingDebug: on('lightingDebug'),
    // First environment-art pass. Keep ?visualPass=0 for identical-camera before/after review.
    visualPass: notOff('visualPass'),
    decorPass02: notOff('decorPass02'),
    // Fairy lights + candles default on with the golden pass; ?fairyLights=0/1 overrides
    fairyLights: q.get('fairyLights') ? on('fairyLights') : !pass || pass === 'golden',
    visualBaseline: on('visualBaseline'),
    // Architecture shell: 'polyhaven' (default), 'phase1' or 'oakTest'; ?architecture=legacy uses the old Three.js shell
    legacyArchitecture: q.get('architecture') === 'legacy',
    floor: { legacy: 'phase1', 1: 'oakTest' }[q.get('floorMaterialTest')] || 'polyhaven',
    // Approved workstation assets (C01 desk, C03 laptop + monitor, C05 MIDI); =0 shows the old placeholders
    desk: notOff('deskCandidate'),
    laptop: notOff('laptopCandidate'),
    midi: notOff('midiCandidate'),
    // F01: approved cloud sofa (default); ?loungeLegacy=1 shows the old reclining lounge
    loungeLegacy: on('loungeLegacy'),
    // E01: recoloured Messy bed 2.0 (default); ?bedLegacy=1 shows the old Moon Nest bed
    bedLegacy: on('bedLegacy'),
    // Opt-in candidates, not default
    drumCandidate: on('drumCandidate'),
    decorSample: on('decorSample'),
    rugPileTest: on('rugPileTest'),
    rugMaterialTest: on('rugMaterialTest'),
    // Mugo Moc (~/DrumApp, deployed on Vercel) shown on the desk laptop/monitor; ?mugoUrl=http://localhost:5173/ for local dev
    mugoUrl: q.get('mugoUrl') || import.meta.env?.VITE_MUGO_URL || 'https://web-ten-rho-z0tt3ihxv2.vercel.app/',
    // Curtains
    voile: notOff('voileSample'),
    curtainClosed: on('curtainClosed'),
  }
}

export const FLAGS = parseFlags(typeof window === 'undefined' ? '' : window.location.search)
