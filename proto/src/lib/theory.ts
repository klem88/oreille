import { Scale, Note, Chord } from 'tonal';

export type Degree = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii';

export const DEGREES: Degree[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];

/** Les six degrés proposés comme boutons de réponse (palier E). */
export const ANSWER_DEGREES: Degree[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi'];

export const PROGRESSIONS: Degree[][] = [
  ['I', 'V', 'vi', 'IV'],
  ['vi', 'IV', 'I', 'V'],
  ['IV', 'I', 'V', 'vi'],
  ['I', 'vi', 'IV', 'V'],
  ['I', 'IV', 'V', 'I'],
  ['I', 'iii', 'IV', 'V'],
  ['ii', 'V', 'I', 'vi'],
  ['I', 'vi', 'ii', 'V'],
];

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const CADENCE: Degree[] = ['I', 'IV', 'V', 'I'];

export const DEGREE_COLORS: Record<Degree, string> = {
  I: '#e4383a',
  ii: '#f08a2b',
  iii: '#f2d13d',
  IV: '#4caf50',
  V: '#2f80ed',
  vi: '#8e5bd6',
  vii: '#4b3fa8',
};

export function randomKey(): string {
  return KEYS[Math.floor(Math.random() * KEYS.length)];
}

export function randomProgression(): Degree[] {
  return PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
}

/** Notes (sans octave) de la triade diatonique du degré, par empilement de tierces dans la gamme. */
function triadPitchClasses(key: string, degree: Degree): string[] {
  const scale = Scale.get(`${key} major`).notes;
  const i = DEGREES.indexOf(degree);
  return [scale[i], scale[(i + 2) % 7], scale[(i + 4) % 7]];
}

/**
 * Voicing fermé dans l'octave 4, basse doublée à l'octave 3.
 * chordNotes('C','V') → ['G3','G4','B4','D5']
 */
export function chordNotes(key: string, degree: Degree): string[] {
  const pcs = triadPitchClasses(key, degree);
  const root = Note.get(`${pcs[0]}4`);
  const upper: string[] = [`${pcs[0]}4`];
  let prevMidi = root.midi!;
  for (const pc of pcs.slice(1)) {
    // première octave où la note est au-dessus de la précédente
    let n = Note.get(`${pc}4`);
    while (n.midi! <= prevMidi) n = Note.get(Note.transpose(n.name, '8P'));
    upper.push(n.name);
    prevMidi = n.midi!;
  }
  return [`${pcs[0]}3`, ...upper];
}

/** chordName('C','vi') → 'Am' ; chordName('C','vii') → 'Bdim' */
export function chordName(key: string, degree: Degree): string {
  const pcs = triadPitchClasses(key, degree);
  const detected = Chord.detect(pcs)[0] ?? pcs[0];
  // tonal renvoie 'CM' pour un accord majeur : on affiche 'C'
  return detected.replace(/M$/, '');
}
