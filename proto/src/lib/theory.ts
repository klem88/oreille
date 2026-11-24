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

export type Fonction = 'tonique' | 'sous-dominante' | 'dominante';

export const DEGREE_FUNCTION: Record<Degree, Fonction> = {
  I: 'tonique', iii: 'tonique', vi: 'tonique',
  ii: 'sous-dominante', IV: 'sous-dominante',
  V: 'dominante', vii: 'dominante',
};

export const FUNCTION_HINT: Record<Fonction, string> = {
  tonique: 'repos, la maison',
  'sous-dominante': 'on s\'éloigne, ça prépare',
  dominante: 'tension, ça veut rentrer',
};

export const DEGREE_ROLE: Record<Degree, string> = {
  I: 'la maison',
  ii: 'prépare le V',
  iii: 'substitut discret du I',
  IV: 'on s\'éloigne de la maison',
  V: 'tension vers le I',
  vi: 'substitut mineur du I',
  vii: 'tension, comme le V',
};

const midi = (n: string) => Note.get(n).midi!;

/** Degré (1-7) d'une note dans la gamme majeure de key, ou 0 si hors gamme. */
export function scaleDegreeOf(key: string, note: string): number {
  const pc = Note.pitchClass(note);
  const scale = Scale.get(`${key} major`).notes;
  const i = scale.findIndex((s) => Note.chroma(s) === Note.chroma(pc));
  return i < 0 ? 0 : i + 1;
}

/** Octave de pc la plus proche de target (midi), bornée à [lo, hi]. */
function nearestOctave(pc: string, target: number, lo: number, hi: number): string {
  let best = `${pc}1`;
  let bestDist = Infinity;
  for (let oct = 0; oct <= 7; oct++) {
    const n = `${pc}${oct}`;
    const m = midi(n);
    if (m < lo || m > hi) continue;
    const d = Math.abs(m - target);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

/** Voicing fermé des pitch classes (dans l'ordre donné) dont la note la plus basse est l'octave la plus proche de lowTarget. */
function closedFrom(pcs: string[], lowTarget: number): string[] {
  const out = [nearestOctave(pcs[0], lowTarget, 57, 84)];
  let prev = midi(out[0]);
  for (const pc of pcs.slice(1)) {
    let n = Note.get(`${pc}${Note.get(out[0]).oct}`);
    while (n.midi! <= prev) n = Note.get(Note.transpose(n.name, '8P'));
    out.push(n.name);
    prev = n.midi!;
  }
  return out;
}

/**
 * Voicings d'une progression avec conduite de voix :
 * basse vers la fondamentale la plus proche (Sol1..Sol3, direction initiale tirée au sort),
 * voix supérieures : renversement fermé qui bouge le moins.
 */
export function voiceProgression(key: string, degrees: Degree[]): string[][] {
  const out: string[][] = [];
  let bassMidi = -1;
  let upper: string[] = [];
  degrees.forEach((d, i) => {
    const pcs = triadPitchClasses(key, d);
    let bass: string;
    if (i === 0) {
      bass = nearestOctave(pcs[0], 48, 43, 54); // autour de Do3
    } else {
      // deux candidats : au-dessus ou en dessous de la basse précédente
      const up = nearestOctave(pcs[0], bassMidi + 7, 40, 57);
      const down = nearestOctave(pcs[0], bassMidi - 7, 40, 57);
      const pickUp = i === 1 ? Math.random() < 0.5
        : Math.abs(midi(up) - bassMidi) <= Math.abs(midi(down) - bassMidi);
      bass = pickUp ? up : down;
    }
    bassMidi = midi(bass);
    if (i === 0) {
      upper = closedFrom(pcs, 62);
    } else {
      const prevMidis = upper.map(midi);
      let best: string[] = [];
      let bestCost = Infinity;
      for (let inv = 0; inv < 3; inv++) {
        const rot = [...pcs.slice(inv), ...pcs.slice(0, inv)];
        for (const target of [prevMidis[0] - 12, prevMidis[0], prevMidis[0] + 12]) {
          const cand = closedFrom(rot, target);
          const cm = cand.map(midi);
          if (cm[0] < 57 || cm[2] > 84) continue;
          const cost = cm.reduce((s, m, k) => s + Math.abs(m - prevMidis[k]), 0);
          if (cost < bestCost) { bestCost = cost; best = cand; }
        }
      }
      upper = best;
    }
    out.push([bass, ...upper]);
  });
  return out;
}
