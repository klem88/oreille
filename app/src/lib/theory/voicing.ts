import { Note } from 'tonal';
import type { Degree } from './degree';
import { bassPitchClass, chordPitchClasses, type Mode } from './chord';
import type { Rng } from './rng';

export interface Voicing { bass: string; upper: string[] }

export interface VoicingOptions {
  bassRange?: [number, number];
  upperLow?: number;
  /** Voicing précédent : la conduite de voix continue depuis lui (R14). */
  prev?: Voicing;
}

const DEFAULT_BASS_RANGE: [number, number] = [40, 57];
const DEFAULT_UPPER_LOW = 57;
const UPPER_SPAN = 27; // plafond = upperLow + 27 (84 par défaut)
const FIRST_BASS_TARGET = 48;
const UPPER_CENTER = 65;
const MAX_LEAP = 7;

export function notesOf(v: Voicing): string[] {
  return [v.bass, ...v.upper];
}

/** Nom avec octave de la pitch class `pc` à la hauteur midi `m` (m doit correspondre à la chroma de pc). */
function nameAt(pc: string, m: number): string {
  const base = Note.midi(`${pc}4`)!;
  return `${pc}${4 + Math.round((m - base) / 12)}`;
}

/** Toutes les hauteurs midi de `pc` dans [lo, hi]. */
function midisInRange(pc: string, lo: number, hi: number): number[] {
  const chroma = Note.chroma(pc)!;
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === chroma) out.push(m);
  return out;
}

function nearest(cands: number[], target: number): number {
  return cands.reduce((b, m) => (Math.abs(m - target) < Math.abs(b - target) ? m : b));
}

function nextBass(pc: string, cur: number | null, range: [number, number], rng: Rng | null): number {
  const cands = midisInRange(pc, range[0], range[1]);
  if (cur === null) return nearest(cands, FIRST_BASS_TARGET);
  const best = nearest(cands, cur);
  if (!rng) return best;
  const goUp = rng() < 0.5;
  const dir = goUp ? cands.filter((m) => m >= cur) : cands.filter((m) => m <= cur);
  const other = goUp ? cands.filter((m) => m <= cur) : cands.filter((m) => m >= cur);
  const pool = dir.length ? dir : other;
  const pick = nearest(pool, cur);
  // un saut trop large dans la direction tirée : on revient au plus proche
  return Math.abs(pick - cur) > MAX_LEAP ? best : pick;
}

/** Voicing fermé ascendant : pcs dans l'ordre donné, la plus grave à `low` (midi). */
function closed(pcs: string[], low: number): number[] {
  const out = [low];
  for (const pc of pcs.slice(1)) {
    let m = low + ((((Note.chroma(pc)! - low) % 12) + 12) % 12);
    while (m <= out[out.length - 1]) m += 12;
    out.push(m);
  }
  return out;
}

function candidates(pcs: string[], minLow: number, maxHigh: number): { pcs: string[]; midis: number[] }[] {
  const res: { pcs: string[]; midis: number[] }[] = [];
  for (let inv = 0; inv < pcs.length; inv++) {
    const rot = [...pcs.slice(inv), ...pcs.slice(0, inv)];
    for (const low of midisInRange(rot[0], minLow, maxHigh)) {
      const midis = closed(rot, low);
      if (midis[midis.length - 1] <= maxHigh) res.push({ pcs: rot, midis });
    }
  }
  return res;
}

function motion(cand: number[], prev: number[]): number {
  if (cand.length === prev.length) return cand.reduce((s, m, k) => s + Math.abs(m - prev[k]), 0);
  return cand.reduce((s, m) => s + Math.min(...prev.map((p) => Math.abs(m - p))), 0);
}

function chooseUpper(pcs: string[], bass: number, prev: number[] | null, upperLow: number): Voicing['upper'] {
  const minLow = Math.max(upperLow, bass + 3);
  const cands = candidates(pcs, minLow, upperLow + UPPER_SPAN);
  const cost = (c: number[]) =>
    prev ? motion(c, prev) : Math.abs(c.reduce((s, m) => s + m, 0) / c.length - UPPER_CENTER);
  let best = cands[0];
  for (const c of cands) if (cost(c.midis) < cost(best.midis)) best = c;
  return best.midis.map((m, k) => nameAt(best.pcs[k], m));
}

/**
 * Voicings d'une progression avec conduite de voix (port de voiceProgression du prototype) :
 * basse = bassPitchClass (renversements) au plus près de la précédente, direction du premier
 * mouvement tirée par `rng` ; voix supérieures = accord entier en position fermée qui bouge le moins.
 */
export function voiceChords(
  key: string,
  mode: Mode,
  degrees: Degree[],
  rng: Rng,
  opts: VoicingOptions = {},
): Voicing[] {
  const bassRange = opts.bassRange ?? DEFAULT_BASS_RANGE;
  const upperLow = opts.upperLow ?? DEFAULT_UPPER_LOW;
  const out: Voicing[] = [];
  let bass: number | null = opts.prev ? Note.midi(opts.prev.bass)! : null;
  let upper: number[] | null = opts.prev ? opts.prev.upper.map((n) => Note.midi(n)!) : null;
  degrees.forEach((d, i) => {
    const pcs = chordPitchClasses(key, mode, d);
    const drawn = opts.prev ? i === 0 : i === 1;
    bass = nextBass(bassPitchClass(key, mode, d), bass, bassRange, drawn ? rng : null);
    const up = chooseUpper(pcs, bass, upper, upperLow);
    upper = up.map((n) => Note.midi(n)!);
    out.push({ bass: nameAt(bassPitchClass(key, mode, d), bass), upper: up });
  });
  return out;
}
