import * as Tone from 'tone';
import { getVoice, isLoaded, loadInstrument, releaseAllVoices, type Timbre } from './instruments';

export type { Timbre };
export { loadInstrument, isLoaded };

let generation = 0;
let pendingResolve: (() => void) | null = null;
let endTimer: ReturnType<typeof setTimeout> | null = null;

/** À appeler de façon synchrone dans un gestionnaire de tap (contrainte iOS). */
export async function unlock(): Promise<void> {
  // iOS : ne pas être coupé par le commutateur silencieux (Safari 16.4+)
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = 'playback';
  await Tone.start();
}

/** Coupe tout. Résout la promesse d'une séquence en cours (jamais pendante). */
export function stop(): void {
  generation += 1;
  if (endTimer !== null) { clearTimeout(endTimer); endTimer = null; }
  const t = Tone.getTransport();
  t.stop();
  t.cancel();
  releaseAllVoices();
  const r = pendingResolve;
  pendingResolve = null;
  r?.();
}

/**
 * Joue chaque accord beatsPerChord temps (noires) au tempo donné.
 * onChord(i) (animation seulement) est appelé au début de chaque accord ;
 * la promesse se résout à la fin, ou dès que la séquence est annulée.
 */
export function playSequence(
  chords: string[][],
  bpm: number,
  timbre: Timbre,
  onChord?: (index: number) => void,
  beatsPerChord = 4,
): Promise<void> {
  const voice = getVoice(timbre);
  if (!voice) return Promise.reject(new Error(`timbre non chargé : ${timbre}`));
  stop();
  const gen = generation;
  const t = Tone.getTransport();
  t.bpm.value = bpm;
  const chordSec = (60 / bpm) * beatsPerChord;
  return new Promise<void>((resolve) => {
    pendingResolve = resolve;
    chords.forEach((notes, i) => {
      t.schedule((time) => {
        if (gen !== generation) return;
        voice.play(notes, chordSec, time);
        if (onChord) Tone.getDraw().schedule(() => { if (gen === generation) onChord(i); }, time);
      }, i * chordSec);
    });
    t.schedule((time) => {
      // fin de séquence : basée sur l'horloge audio, pas sur requestAnimationFrame
      const delay = Math.max(0, (time - Tone.immediate()) * 1000);
      endTimer = setTimeout(() => {
        if (gen !== generation) return;
        endTimer = null;
        pendingResolve = null;
        t.stop();
        t.cancel();
        resolve();
      }, delay);
    }, chords.length * chordSec);
    t.start();
  });
}

function playNow(notes: string[], timbre: Timbre, duration: Tone.Unit.Time): void {
  const voice = getVoice(timbre);
  if (!voice) return;
  voice.releaseAll(); // pas de superposition sur taps rapides
  voice.play(notes, duration);
}

/** Joue un accord (réécoute à la demande), sans toucher au Transport. */
export function playChord(notes: string[], timbre: Timbre, duration: Tone.Unit.Time = '2n'): void {
  playNow(notes, timbre, duration);
}

/** Joue une note seule, sans toucher au Transport. */
export function playNote(note: string, timbre: Timbre, duration: Tone.Unit.Time = '1n'): void {
  playNow([note], timbre, duration);
}
