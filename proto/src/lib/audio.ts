import * as Tone from 'tone';

let sampler: Tone.Sampler | null = null;
let loading: Promise<void> | null = null;

const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';

/** Charge le piano Salamander (idempotent). */
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
      onerror: (e) => reject(e),
    }).toDestination();
  });
  return loading;
}

/** À appeler dans un gestionnaire de tap (contrainte iOS). */
export async function unlock(): Promise<void> {
  await Tone.start();
}

export function stop(): void {
  const t = Tone.getTransport();
  t.stop();
  t.cancel();
  sampler?.releaseAll();
}

/**
 * Joue chaque accord une mesure (4 temps) au tempo donné.
 * onChord(i) est appelé au début de chaque accord ; la promesse se résout à la fin.
 * Toute séquence en cours est annulée.
 */
export function playSequence(
  chords: string[][],
  bpm: number,
  onChord?: (index: number) => void,
): Promise<void> {
  if (!sampler) throw new Error('piano non chargé');
  stop();
  const t = Tone.getTransport();
  t.bpm.value = bpm;
  const s = sampler;
  return new Promise<void>((resolve) => {
    chords.forEach((notes, i) => {
      t.schedule((time) => {
        s.triggerAttackRelease(notes, '1m', time);
        if (onChord) Tone.getDraw().schedule(() => onChord(i), time);
      }, `${i}m`);
    });
    t.schedule((time) => {
      Tone.getDraw().schedule(() => {
        t.stop();
        t.cancel();
        resolve();
      }, time);
    }, `${chords.length}m`);
    t.start();
  });
}
