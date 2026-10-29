// What a guitarist does, shared by the on-screen panel, the keyboard and controllers.
import { chordNotes } from './guitarChords'
import { guitarStore, muteAll, pluckString, setGuitar, strum } from '../audio/guitar'
import { activity } from './activity'

// The chord is read from the store, not React state: a strum right after a chord change must
// use the new chord.
export function strumNow(dir) { const chord = guitarStore.get().chord; strum(chord, dir); activity.log('guitar'); activity.log('chord', chord) }
export function pluckNow(string) { pluckString(string, chordNotes(guitarStore.get().chord)); activity.log('guitar') }
export const pickChord = name => guitarStore.set({ chord: name })
export const switchGuitar = () => setGuitar(guitarStore.get().guitar === 'acoustic' ? 'electric' : 'acoustic')
export { muteAll }
