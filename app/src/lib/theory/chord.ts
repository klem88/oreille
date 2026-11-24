import { Note } from 'tonal';
import { baseStep, type Degree, type Quality, type Step } from './degree';

export type Mode = 'major' | 'minor';
export type Fonction = 'tonique' | 'sous-dominante' | 'dominante';

export const KEYS: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const MAJOR_STEPS = ['1P', '2M', '3M', '4P', '5P', '6M', '7M'];

const INTERVALS: Record<Quality, string[]> = {
  maj: ['1P', '3M', '5P'],
  min: ['1P', '3m', '5P'],
  dim: ['1P', '3m', '5d'],
  aug: ['1P', '3M', '5A'],
  '7': ['1P', '3M', '5P', '7m'],
  maj7: ['1P', '3M', '5P', '7M'],
  m7: ['1P', '3m', '5P', '7m'],
  'ø7': ['1P', '3m', '5d', '7m'],
  '°7': ['1P', '3m', '5d', '7d'],
  '6': ['1P', '3M', '5P', '6M'],
};

const SUFFIX: Record<Quality, string> = {
  maj: '', min: 'm', dim: 'dim', aug: 'aug', '7': '7', maj7: 'maj7', m7: 'm7', 'ø7': 'm7b5', '°7': 'dim7', '6': '6',
};

// `mode` est conservé dans les signatures (la fondamentale suit toujours la gamme majeure, R3).
function rootOf(key: string, mode: Mode, d: Degree): string {
  if (d.secondaryOf) {
    return Note.transpose(rootOf(key, mode, d.secondaryOf), '5P');
  }
  const base = Note.transpose(key, MAJOR_STEPS[d.step - 1]);
  return d.accidental === 0 ? base : Note.transpose(base, d.accidental === 1 ? '1A' : '-1A');
}

export function chordPitchClasses(key: string, mode: Mode, d: Degree): string[] {
  const root = rootOf(key, mode, d);
  return INTERVALS[d.quality].map((iv) => Note.simplify(Note.transpose(root, iv)));
}

const BASS_INDEX: Record<1 | 3 | 5 | 7, number> = { 1: 0, 3: 1, 5: 2, 7: 3 };

export function bassPitchClass(key: string, mode: Mode, d: Degree): string {
  return chordPitchClasses(key, mode, d)[BASS_INDEX[d.bass]];
}

export function chordName(key: string, mode: Mode, d: Degree): string {
  const root = chordPitchClasses(key, mode, d)[0];
  const slash = d.bass !== 1 ? `/${bassPitchClass(key, mode, d)}` : '';
  return `${root}${SUFFIX[d.quality]}${slash}`;
}

export function functionOf(d: Degree): Fonction {
  if (d.secondaryOf) return 'dominante';
  const s = baseStep(d);
  if (s === 1 || s === 3 || s === 6) return 'tonique';
  if (s === 2 || s === 4) return 'sous-dominante';
  return 'dominante';
}

export const ROLE: Record<Step, string> = {
  1: 'la maison',
  2: 'prépare le V',
  3: 'substitut discret du I',
  4: "on s'éloigne de la maison",
  5: 'tension vers le I',
  6: 'substitut mineur du I',
  7: 'tension, comme le V',
};
