import * as Tone from 'tone';

let sampler: Tone.Sampler | null = null;
let loading: Promise<void> | null = null;
let generation = 0;

const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';

/** Charge le piano Salamander (idempotent ; un échec permet de réessayer). */
export function loadPiano(): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    sampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
        A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
        A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
        A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
        A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
        A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
        A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
        A7: 'A7.mp3', C8: 'C8.mp3',
      },
      release: 1,
      baseUrl: SALAMANDER,
      onload: () => resolve(),
      onerror: (e) => { loading = null; sampler = null; reject(e); },
    }).toDestination();
  });
  return loading;
}

/** À appeler de façon synchrone dans un gestionnaire de tap (contrainte iOS). */
export async function unlock(): Promise<void> {
  // iOS : ne pas être coupé par le commutateur silencieux (Safari 16.4+)
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = 'playback';
  await Tone.start();
}

export function stop(): void {
  generation += 1;
  const t = Tone.getTransport();
  t.stop();
  t.cancel();
  sampler?.releaseAll();
}

/**
 * Joue chaque accord une mesure (4 temps) au tempo donné.
 * onChord(i) est appelé au début de chaque accord ; la promesse se résout à la fin.
 * Toute séquence en cours est annulée. Les callbacks d'une séquence annulée sont ignorés.
 */
export function playSequence(
  chords: string[][],
  bpm: number,
  onChord?: (index: number) => void,
): Promise<void> {
  if (!sampler) throw new Error('piano non chargé');
  stop();
  const gen = generation;
  const t = Tone.getTransport();
  t.bpm.value = bpm;
  const s = sampler;
  return new Promise<void>((resolve) => {
    chords.forEach((notes, i) => {
      t.schedule((time) => {
        if (gen !== generation) return;
        s.triggerAttackRelease(notes, '1m', time);
        if (onChord) Tone.getDraw().schedule(() => { if (gen === generation) onChord(i); }, time);
      }, `${i}m`);
    });
    t.schedule((time) => {
      // fin de séquence : basée sur l'horloge audio, pas sur requestAnimationFrame
      const delay = Math.max(0, (time - Tone.now()) * 1000);
      setTimeout(() => {
        if (gen !== generation) return;
        t.stop();
        t.cancel();
        resolve();
      }, delay);
    }, `${chords.length}m`);
    t.start();
  });
}
