import { playChime } from '../audio/drums'
import { projectKey, takeStore } from '../audio/takes'
import { roomState } from './roomState'

// Finishing something (pressing a record, a three-star run, a song back from Mugo) lights the
// castle outside from its highest tower down, with a rising chime arpeggio in your key.
export function celebrate(reason) {
  roomState.celebrate(reason)
  const root = projectKey(takeStore.getAll()) ?? 0
  playChime([0, 4, 7, 12, 16, 19, 24].map(step => 72 + root + step))
}
