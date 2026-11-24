import * as Tone from 'tone';

export type Timbre = 'piano' | 'guitare' | 'nappe';

export interface Voice {
  /** Joue des notes ; duration en secondes ou notation Tone, time optionnel (horloge audio). */
  play(notes: string | string[], duration: Tone.Unit.Time, time?: number): void;
  releaseAll(): void;
  /** Gain de sortie (coupure ; exposé pour vérification). */
  output: Tone.Gain;
}

const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';
const GUITAR = 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/';

const FADE = 0.05; // fondu de coupure (s)
const GAP = 0.01; // marge avant de rouvrir le gain

/**
 * Enveloppe une source dans un Gain dédié. Sampler.triggerAttackRelease programme déjà
 * son relâchement : releaseAll() natif ne trouve plus rien à couper. On coupe donc au
 * niveau du gain (fondu rapide), puis on le rouvre avant la note suivante.
 */
function gatedVoice(
  output: Tone.Gain,
  trigger: (notes: string | string[], duration: Tone.Unit.Time, time: number) => void,
  release: () => void,
): Voice {
  let reopenAt = 0;
  return {
    output,
    play(notes, duration, time) {
      const t = Math.max(time ?? Tone.now(), reopenAt);
      trigger(notes, duration, t);
    },
    releaseAll() {
      const now = Tone.immediate();
      const g = output.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + FADE);
      reopenAt = now + FADE + GAP;
      g.setValueAtTime(1, reopenAt);
      release();
    },
  };
}

function loadSampler(options: ConstructorParameters<typeof Tone.Sampler>[0]): Promise<Voice> {
  return new Promise<Voice>((resolve, reject) => {
    const out = new Tone.Gain(1).toDestination();
    const s: Tone.Sampler = new Tone.Sampler({
      ...options,
      onload: () =>
        resolve(
          gatedVoice(out, (n, d, t) => { s.triggerAttackRelease(n, d, t); }, () => { s.releaseAll(); }),
        ),
      onerror: (e) => { s.dispose(); out.dispose(); reject(e); },
    }).connect(out);
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
    const out = new Tone.Gain(1).toDestination();
    const filter = new Tone.Filter(1800, 'lowpass').connect(out);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
      envelope: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 1.2 },
    }).connect(filter);
    synth.volume.value = -14;
    return gatedVoice(out, (n, d, t) => { synth.triggerAttackRelease(n, d, t); }, () => { synth.releaseAll(); });
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

export function releaseAllVoices(): void {
  for (const v of voices.values()) v.releaseAll();
}
