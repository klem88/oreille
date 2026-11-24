import { Note } from 'tonal';
import { ROLE, chordName, chordPitchClasses, functionOf, type Fonction, type Mode } from '../theory/chord';
import { baseStep, parseDegree, type Degree, type Step } from '../theory/degree';
import { colorOf, isAltered, DEGREE_COLORS } from '../theory/colors';
import { notesOf, type Voicing } from '../theory/voicing';
import type { Answer, Question } from '../engine/question';

export const BASS_NAMES: Record<1 | 3 | 5 | 7, string> = {
  1: 'fondamentale',
  3: 'tierce',
  5: 'quinte',
  7: 'septième',
};

export const FUNCTION_COLORS: Record<Fonction, string> = {
  tonique: DEGREE_COLORS[1],
  'sous-dominante': DEGREE_COLORS[4],
  dominante: DEGREE_COLORS[5],
};

export const FUNCTION_HINTS: Record<Fonction, string> = {
  tonique: 'repos, la maison',
  'sous-dominante': "on s'éloigne, ça prépare",
  dominante: 'tension, ça veut rentrer',
};

const SEVENTH_QUALITIES = ['7', 'maj7', 'm7', 'ø7', '°7'];

export function isSeventh(d: Degree): boolean {
  return SEVENTH_QUALITIES.includes(d.quality);
}

/** Texte foncé sur le jaune du iii, clair ailleurs. */
export function textColorOfStep(step: Step): string {
  return step === 3 ? '#111' : '#fff';
}

/** Style inline d'une case colorée de degré (hachures pour les degrés altérés, spec 6.1). */
export function degreeStyle(d: Degree): string {
  const base = `background-color:${colorOf(d)};color:${textColorOfStep(baseStep(d))};`;
  return isAltered(d)
    ? `${base}background-image:repeating-linear-gradient(135deg,rgba(0,0,0,.32) 0 5px,transparent 5px 10px);`
    : base;
}

export interface ChordInfo {
  label: string;
  name: string;
  fonction: Fonction;
  role: string;
}

export function chordInfo(key: string, mode: Mode, d: Degree): ChordInfo {
  return { label: d.label, name: chordName(key, mode, d), fonction: functionOf(d), role: ROLE[baseStep(d)] };
}

/** « vi · F#m · tonique · substitut mineur du I » */
export function announce(info: ChordInfo): string {
  return `${info.label} · ${info.name} · ${info.fonction} · ${info.role}`;
}

const MAJOR_DEGREE: Record<number, string> = {
  0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7',
};

/** Degré (dans la gamme majeure de la tonique) d'une note : « 1 », « 5 », « b7 »… */
export function scaleDegreeOfNote(key: string, note: string): string {
  const k = Note.chroma(key) ?? 0;
  const n = Note.chroma(note) ?? 0;
  return MAJOR_DEGREE[(((n - k) % 12) + 12) % 12];
}

export type ToneRole = '1' | '3' | '5' | '7' | '6';

export interface Brick {
  note: string;
  midi: number;
  tone: ToneRole;
  guide: boolean;
  bass: boolean;
}

/** Fonction d'une note dans l'accord : index dans chordPitchClasses (6 pour la sixte ajoutée). */
function toneOf(pcs: string[], d: Degree, note: string): ToneRole {
  const c = Note.chroma(note);
  const i = pcs.findIndex((pc) => Note.chroma(pc) === c);
  if (i === 3) return d.quality === '6' ? '6' : '7';
  return (['1', '3', '5'] as const)[Math.max(0, i)];
}

/** Briques de la pile (spec 6.2), de bas en haut dans l'ordre réel du voicing. */
export function bricksOf(key: string, mode: Mode, d: Degree, v: Voicing): Brick[] {
  const pcs = chordPitchClasses(key, mode, d);
  return notesOf(v)
    .map((note, i) => {
      const tone = toneOf(pcs, d, note);
      return { note, midi: Note.midi(note) ?? 0, tone, guide: tone === '3' || tone === '7', bass: i === 0 };
    })
    .sort((a, b) => a.midi - b.midi);
}

/** Guide-tones (tierce et septième) du voicing réel, du grave à l'aigu. */
export function guideTones(key: string, mode: Mode, d: Degree, v: Voicing): string[] {
  return bricksOf(key, mode, d, v).filter((b) => b.guide).map((b) => b.note);
}

export function displayNote(note: string): string {
  return Note.simplify(note) || note;
}

/** Réponse attendue, en clair. */
export function expectedText(q: Question): string {
  const e = q.expected;
  if (e.kind === 'basse') return `basse = ${BASS_NAMES[e.bass]} (${q.degrees[0].label})`;
  return q.degrees.map((d) => `${d.label} (${chordName(q.key, q.mode, d)})`).join(' – ');
}

/** Réponse donnée, en clair. */
export function answerText(a: Answer): string {
  if (a.kind === 'basse') return `basse = ${BASS_NAMES[a.bass]}`;
  if (a.kind === 'degre') return a.degree;
  return a.degrees.join(' – ');
}

/** Degrés proposés par le pad d'un palier `degre`/`progression` : les triades du mode (R7). */
export function padDegrees(degres: string[]): Degree[] {
  return degres.map(parseDegree);
}

/** Libellés des sept nœuds de la roue (triades diatoniques du mode). */
export const WHEEL_LABELS: Record<Mode, Record<Step, string>> = {
  major: { 1: 'I', 2: 'ii', 3: 'iii', 4: 'IV', 5: 'V', 6: 'vi', 7: 'vii°' },
  minor: { 1: 'i', 2: 'ii°', 3: 'bIII', 4: 'iv', 5: 'V', 6: 'bVI', 7: 'bVII' },
};

/** Plage du clavier : de l'ut sous la note la plus grave au si au-dessus de la plus aiguë, 3 octaves au moins. */
export function keyboardRange(notes: string[]): [number, number] {
  const midis = notes.map((n) => Note.midi(n)).filter((m): m is number => m !== null && m !== undefined);
  if (!midis.length) return [48, 83];
  const low = Math.floor(Math.min(...midis) / 12) * 12;
  const high = Math.max(low + 35, Math.ceil((Math.max(...midis) + 1) / 12) * 12 - 1);
  return [low, high];
}
