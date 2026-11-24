import { KEYS, functionOf, type Mode } from '../theory/chord';
import { baseStep, parseDegree, type Degree } from '../theory/degree';
import { voiceChords, notesOf } from '../theory/voicing';
import type { Rng } from '../theory/rng';
import type { Palier } from '../content/schema';
import type { Answer, Question } from './question';

export type { Answer, Question };

const BPM_MIN = 84;
const BPM_MAX = 112;
const STIMULUS_BASS_RANGE: [number, number] = [34, 63];
const UPPER_LOW_MIN = 55;
const UPPER_LOW_MAX = 62;

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function int(lo: number, hi: number, rng: Rng): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Clés d'items d'un palier (voir la spec 5.7.2 pour les règles fonctionnelles du type progression). */
export function itemsOf(palier: Palier): string[] {
  if (palier.type === 'degre') {
    const items: string[] = [];
    for (const mode of palier.modes) {
      const triads = mode === 'major' ? palier.degres : (palier.degresMineur ?? []);
      const sevenths = palier.sevenths ? (mode === 'major' ? palier.septiemes : palier.septiemesMineur) ?? [] : [];
      for (const d of [...triads, ...sevenths]) items.push(`${mode}:${d}`);
    }
    return items;
  }
  if (palier.type === 'basse') {
    const items: string[] = [];
    for (const d of palier.degres) for (const b of [1, 3, 5]) items.push(`${d}/${b}`);
    if (palier.sevenths) for (const d of palier.septiemes ?? []) for (const b of [1, 3, 5, 7]) items.push(`${d}/${b}`);
    return items;
  }
  const items: string[] = [];
  for (const a of palier.degres) {
    for (const b of palier.degres) {
      if (a === b) continue;
      const fa = functionOf(parseDegree(a));
      const fb = functionOf(parseDegree(b));
      const ok = fa === 'tonique' || (fa === 'sous-dominante' && fb !== 'sous-dominante') || (fa === 'dominante' && fb === 'tonique');
      if (ok) items.push(`${a}-${b}`);
    }
  }
  return items;
}

interface Parsed { mode: Mode; labels: string[]; expected: Answer }

function parseItem(palier: Palier, itemKey: string, rng: Rng): Parsed {
  if (palier.type === 'degre') {
    const [mode, degree] = itemKey.split(':') as [Mode, string];
    return { mode, labels: [degree], expected: { kind: 'degre', degree } };
  }
  const mode = pick(palier.modes, rng);
  if (palier.type === 'basse') {
    const d = parseDegree(itemKey);
    return { mode, labels: [itemKey], expected: { kind: 'basse', bass: d.bass } };
  }
  const labels = itemKey.split('-');
  return { mode, labels, expected: { kind: 'progression', degrees: labels } };
}

export function generate(palier: Palier, rng: Rng, opts: { itemKey?: string } = {}): Question {
  const itemKey = opts.itemKey ?? pick(itemsOf(palier), rng);
  const key = pick(KEYS, rng);
  const { mode, labels, expected } = parseItem(palier, itemKey, rng);
  const timbre = pick(palier.timbres, rng);
  const bpm = int(BPM_MIN, BPM_MAX, rng);
  const upperLow = int(UPPER_LOW_MIN, UPPER_LOW_MAX, rng);
  const cadenceDegrees = (mode === 'major' ? palier.cadence : palier.cadenceMineur).map(parseDegree);
  const cadenceVoicings = voiceChords(key, mode, cadenceDegrees, rng, { upperLow });
  const degrees = labels.map(parseDegree);
  const stimulus = voiceChords(key, mode, degrees, rng, {
    upperLow,
    // plage élargie : la basse la plus proche de la cadence reste à ≤ 6 demi-tons même en bord de plage
    bassRange: STIMULUS_BASS_RANGE,
    prev: cadenceVoicings[cadenceVoicings.length - 1],
  });
  const id = `${palier.id}-${Math.floor(rng() * 0x100000000).toString(36)}`;
  return {
    id,
    palier: palier.id,
    type: palier.type,
    key,
    mode,
    timbre,
    bpm,
    cadence: cadenceVoicings.map(notesOf),
    stimulus,
    degrees,
    expected,
    itemKey,
  };
}

function sameChord(a: string, b: string): boolean {
  const x: Degree = parseDegree(a);
  const y: Degree = parseDegree(b);
  return baseStep(x) === baseStep(y) && x.accidental === y.accidental && !x.secondaryOf === !y.secondaryOf;
}

function safeSame(a: string, b: string): boolean {
  try {
    return sameChord(a, b);
  } catch {
    return false;
  }
}

export function grade(q: Question, a: Answer): { correct: boolean; perChord?: boolean[] } {
  const e = q.expected;
  if (e.kind !== a.kind) return { correct: false };
  if (e.kind === 'degre' && a.kind === 'degre') return { correct: safeSame(e.degree, a.degree) };
  if (e.kind === 'basse' && a.kind === 'basse') return { correct: e.bass === a.bass };
  if (e.kind === 'progression' && a.kind === 'progression') {
    const perChord = e.degrees.map((d, i) => a.degrees[i] !== undefined && safeSame(d, a.degrees[i]));
    return { correct: e.degrees.length === a.degrees.length && perChord.every(Boolean), perChord };
  }
  return { correct: false };
}
