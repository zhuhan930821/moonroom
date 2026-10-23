// Moonroom ⇄ Mugo bridge (Mugo side: ~/DrumApp src/core/moonroomBridge.ts, branch moonroom/bridge).
// Mugo is framed with ?host=moonroom; it says "ready", we answer with a hello (so it learns our
// origin) and any take waiting in the outbox; it can send its song back as MIDI.
export const OPEN_MIDI = 'moonroom:open-midi'
export const HELLO = 'moonroom:hello'
export const READY = 'mugo:ready'
export const SONG_MIDI = 'mugo:song-midi'

let outbox = null // take waiting to be opened in Mugo
export const mugoOutbox = { put(take) { outbox = take }, take() { const next = outbox; outbox = null; return next } }

export function mugoFrameUrl(base) {
  const url = new URL(base, window.location.href)
  url.searchParams.set('host', 'moonroom')
  return url.toString()
}
