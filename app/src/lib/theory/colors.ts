import { baseStep, type Degree, type Step } from './degree';

export const DEGREE_COLORS: Record<Step, string> = {
  1: '#e4383a',
  2: '#f08a2b',
  3: '#f2d13d',
  4: '#4caf50',
  5: '#2f80ed',
  6: '#8e5bd6',
  7: '#4b3fa8',
};

/** Couleur du degré de base (le hachurage des degrés altérés relève de l'UI). */
export function colorOf(d: Degree): string {
  return DEGREE_COLORS[baseStep(d)];
}

export function isAltered(d: Degree): boolean {
  return d.accidental !== 0 || d.secondaryOf !== undefined;
}
