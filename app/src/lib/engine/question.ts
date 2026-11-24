import type { Mode } from '../theory/chord';
import type { Degree } from '../theory/degree';
import type { Voicing } from '../theory/voicing';
import type { Palier } from '../content/schema';
import type { Timbre } from '../audio/engine';

export type Answer =
  | { kind: 'degre'; degree: string }
  | { kind: 'basse'; bass: 1 | 3 | 5 | 7 }
  | { kind: 'progression'; degrees: string[] };

export interface Question {
  id: string;
  palier: string;
  type: Palier['type'];
  key: string;
  mode: Mode;
  timbre: Timbre;
  bpm: number;
  cadence: string[][];
  stimulus: Voicing[];
  degrees: Degree[];
  expected: Answer;
  itemKey: string;
}
