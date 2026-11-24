import { describe, expect, it } from 'vitest';
import { parseDegree } from '../theory/degree';
import { announce, bricksOf, chordInfo, guideTones, keyboardRange, scaleDegreeOfNote } from './reveal';

describe('reveal', () => {
  it('annonce degré · nom · fonction · rôle', () => {
    expect(announce(chordInfo('A', 'major', parseDegree('vi')))).toBe('vi · F#m · tonique · substitut mineur du I');
  });

  it('degré de la note de basse', () => {
    expect(scaleDegreeOfNote('C', 'G2')).toBe('5');
    expect(scaleDegreeOfNote('Eb', 'Db3')).toBe('b7');
  });

  it('pile : ordre réel, basse marquée, guide-tones pointés', () => {
    const d = parseDegree('V7/3');
    const bricks = bricksOf('C', 'major', d, { bass: 'B2', upper: ['F3', 'G3', 'B3', 'D4'] });
    expect(bricks.map((b) => b.note)).toEqual(['B2', 'F3', 'G3', 'B3', 'D4']);
    expect(bricks.map((b) => b.tone)).toEqual(['3', '7', '1', '3', '5']);
    expect(bricks[0].bass).toBe(true);
    expect(guideTones('C', 'major', d, { bass: 'B2', upper: ['F3', 'G3', 'B3', 'D4'] })).toEqual(['B2', 'F3', 'B3']);
  });

  it('plage du clavier : au moins trois octaves, alignée sur des ut', () => {
    expect(keyboardRange(['E2', 'G4'])).toEqual([36, 71]);
    expect(keyboardRange(['C3', 'E6'])).toEqual([48, 95]);
  });
});

describe('reveal : note étrangère', () => {
  it('une note hors accord lève une erreur au lieu de passer pour la fondamentale', () => {
    expect(() => bricksOf('C', 'major', parseDegree('I'), { bass: 'C3', upper: ['D4', 'E4', 'G4'] })).toThrow(/absente/);
  });
});
