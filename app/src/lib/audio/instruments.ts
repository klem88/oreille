import * as Tone from 'tone';

export type Timbre = 'piano' | 'guitare' | 'nappe';

export interface Voice {
  /**
   * Coupe ce qui sonne à `time`, puis attaque les notes. Sans `seconds`, la tenue est
   * à la charge de l'appelant (séquence : accord suivant ou fin). Avec `seconds`, le
   * relâchement est planifié, sauf si un jeu plus récent a eu lieu sur la voix.
   */
  play(notes: string[], time?: number, seconds?: number): void;
  /** Relâche tout à `time` (défaut : maintenant). */
  release(time?: number): void;
  /** Coupe immédiatement et neutralise les relâchements planifiés. */
  stop(): void;
}

/** Fondu de coupure de stop() (s). */
const STOP_RELEASE = 0.08;

const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';
const GUITAR = 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/';

/**
 * Jamais de triggerAttackRelease : il planifie son relâchement tout de suite et vide les
 * sources actives, donc releaseAll() ne pourrait plus rien couper. On attaque, puis on
 * relâche nous-mêmes (releaseAll(time) fonctionne car les sources restent enregistrées).
 */
function makeVoice(
  attack: (notes: string[], time: number) => void,
  releaseAll: (time: number) => void,
  hardStop: () => void = () => releaseAll(Tone.immediate()),
): Voice {
  let playId = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  return {
    play(notes, time, seconds) {
      clear();
      const t = time ?? Tone.now();
      playId += 1;
      const id = playId;
      releaseAll(t);
      attack(notes, t);
      if (seconds !== undefined) {
        const delay = Math.max(0, (t + seconds - Tone.immediate()) * 1000);
        timer = setTimeout(() => {
          timer = null;
          if (id === playId) releaseAll(Tone.immediate());
        }, delay);
      }
    },
    release(time) {
      releaseAll(time ?? Tone.immediate());
    },
    stop() {
      clear();
      playId += 1;
      hardStop();
    },
  };
}

function loadSampler(options: ConstructorParameters<typeof Tone.Sampler>[0]): Promise<Voice> {
  return new Promise<Voice>((resolve, reject) => {
    const s: Tone.Sampler = new Tone.Sampler({
      ...options,
      onload: () =>
        resolve(
          makeVoice(
            (n, t) => { s.triggerAttack(n, t); },
            (t) => { s.releaseAll(t); },
            () => {
              // stop : fondu court (le relâchement de 1 s ne sert qu'au legato)
              const r = s.release;
              s.release = STOP_RELEASE;
              try { s.releaseAll(Tone.immediate()); } finally { s.release = r; }
            },
          ),
        ),
      onerror: (e) => { s.dispose(); reject(e); },
    }).toDestination();
  });
}

const makers: Record<Timbre, () => Promise<Voice>> = {
  piano: () =>
    loadSampler({
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
    }),
  guitare: () =>
    loadSampler({
      urls: {
        D2: 'D2.mp3', A2: 'A2.mp3', D3: 'D3.mp3',
        A3: 'A3.mp3', D4: 'D4.mp3', A4: 'A4.mp3',
      },
      release: 1,
      baseUrl: GUITAR,
    }),
  nappe: async () => {
    const filter = new Tone.Filter(1800, 'lowpass').toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
      envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 1.2 },
    }).connect(filter);
    synth.volume.value = -14;
    return makeVoice((n, t) => { synth.triggerAttack(n, t); }, (t) => { synth.releaseAll(t); }, () => {
      // stop : relâchement court (la queue de 1,2 s ne convient qu'au legato entre accords)
      synth.set({ envelope: { release: STOP_RELEASE } });
      try { synth.releaseAll(Tone.immediate()); } finally { synth.set({ envelope: { release: 1.2 } }); }
    });
  },
};

const voices = new Map<Timbre, Voice>();
const loading = new Map<Timbre, Promise<void>>();

/** Charge un timbre (idempotent ; un échec réinitialise pour permettre un nouvel essai). */
export function loadInstrument(t: Timbre): Promise<void> {
  const existing = loading.get(t);
  if (existing) return existing;
  const p = makers[t]().then(
    (v) => { voices.set(t, v); },
    (e) => { loading.delete(t); throw e; },
  );
  loading.set(t, p);
  return p;
}

export function isLoaded(t: Timbre): boolean {
  return voices.has(t);
}

export function getVoice(t: Timbre): Voice | undefined {
  return voices.get(t);
}

export function stopAllVoices(): void {
  for (const v of voices.values()) v.stop();
}
