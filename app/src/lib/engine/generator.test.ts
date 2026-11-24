import { describe, expect, test } from 'vitest';
import { Note } from 'tonal';
import { loadPaliers } from '../content/paliers';
import { seededRng } from '../theory/rng';
import { bassPitchClass } from '../theory/chord';
import { parseDegree } from '../theory/degree';
import { generate, grade, itemsOf } from './generator';

const [A, B, C, D] = loadPaliers();

describe('generate / itemsOf / grade', () => {
  test('A : degré attendu dans la liste, tonalité et timbre variés', () => {
    const keys = new Set<string>();
    const timbres = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const q = generate(A, seededRng(i));
      expect(A.degres).toContain(q.expected.kind === 'degre' && q.expected.degree);
      keys.add(q.key);
      timbres.add(q.timbre);
    }
    expect(keys.size).toBeGreaterThan(6);
    expect(timbres.size).toBe(3);
  });

  test('C : basse = septième possible avec sevenths', () => {
    const items = itemsOf(C);
    expect(items).toContain('V7/7');
    const q = generate(C, seededRng(1), { itemKey: 'V7/7' });
    expect(q.expected).toEqual({ kind: 'basse', bass: 7 });
    expect(Note.pitchClass(q.stimulus[0].bass)).toBe(bassPitchClass(q.key, q.mode, parseDegree('V7/7')));
  });

  test('C : 35 items', () => {
    expect(itemsOf(C)).toHaveLength(5 * 3 + 5 * 4);
  });

  test('D : paires conformes aux règles fonctionnelles', () => {
    const items = itemsOf(D);
    expect(items).toContain('I-V');
    expect(items).toContain('V-vi');
    expect(items).toContain('ii-V');
    expect(items).not.toContain('V-IV');
    expect(items).not.toContain('V-ii');
    expect(items).toHaveLength(16);
    const q = generate(D, seededRng(2), { itemKey: 'ii-V' });
    expect(q.expected).toEqual({ kind: 'progression', degrees: ['ii', 'V'] });
    expect(q.stimulus).toHaveLength(2);
  });

  test('B : items des deux modes, triades et septièmes', () => {
    const items = itemsOf(B);
    expect(items).toContain('minor:bVII');
    expect(items).toContain('major:viiø7');
    expect(items).toContain('minor:i7');
  });

  test('grade degré', () => {
    const q = generate(A, seededRng(3), { itemKey: 'major:IV' });
    expect(grade(q, { kind: 'degre', degree: 'IV' }).correct).toBe(true);
    expect(grade(q, { kind: 'degre', degree: 'V' }).correct).toBe(false);
    expect(grade(q, { kind: 'basse', bass: 1 }).correct).toBe(false);
  });

  test('grade : V7 attendu, V répondu = correct', () => {
    const q = generate(B, seededRng(4), { itemKey: 'major:V7' });
    expect(q.expected).toEqual({ kind: 'degre', degree: 'V7' });
    expect(grade(q, { kind: 'degre', degree: 'V' }).correct).toBe(true);
    expect(grade(q, { kind: 'degre', degree: 'bV' }).correct).toBe(false);
  });

  test('grade basse et progression', () => {
    const qc = generate(C, seededRng(5), { itemKey: 'I/3' });
    expect(grade(qc, { kind: 'basse', bass: 3 }).correct).toBe(true);
    expect(grade(qc, { kind: 'basse', bass: 5 }).correct).toBe(false);
    const qd = generate(D, seededRng(6), { itemKey: 'I-V' });
    expect(grade(qd, { kind: 'progression', degrees: ['I', 'V'] })).toEqual({ correct: true, perChord: [true, true] });
    expect(grade(qd, { kind: 'progression', degrees: ['I', 'IV'] })).toEqual({ correct: false, perChord: [true, false] });
    expect(grade(qd, { kind: 'progression', degrees: ['I'] }).correct).toBe(false);
  });

  test('déterministe pour une graine', () => {
    expect(generate(B, seededRng(42))).toEqual(generate(B, seededRng(42)));
  });

  test('bpm dans [84, 112], entier ; basse du stimulus proche de la cadence', () => {
    for (let i = 0; i < 200; i++) {
      const p = [A, B, C, D][i % 4];
      const q = generate(p, seededRng(i));
      expect(Number.isInteger(q.bpm)).toBe(true);
      expect(q.bpm).toBeGreaterThanOrEqual(84);
      expect(q.bpm).toBeLessThanOrEqual(112);
      const lastCad = q.cadence[q.cadence.length - 1][0];
      const sb = Note.midi(q.stimulus[0].bass)!;
      expect(sb).toBeGreaterThanOrEqual(40);
      expect(sb).toBeLessThanOrEqual(57);
      expect(Math.abs(sb - Note.midi(lastCad)!)).toBeLessThanOrEqual(11);
    }
  });

  test('mineur : cadenceMineur utilisée', () => {
    expect(B.cadenceMineur).not.toEqual(B.cadence);
    for (let seed = 0; seed < 12; seed++) {
      const q = generate(B, seededRng(seed), { itemKey: 'minor:bIII' });
      expect(q.mode).toBe('minor');
      expect(q.cadence).toHaveLength(B.cadenceMineur.length);
      const pcs = q.cadence[0].map((n) => Note.chroma(n));
      const third = (Note.chroma(q.key)! + 3) % 12;
      const major3 = (Note.chroma(q.key)! + 4) % 12;
      expect(pcs).toContain(third); // i : tierce mineure
      expect(pcs).not.toContain(major3);
      const qM = generate(B, seededRng(seed), { itemKey: 'major:IV' });
      expect(qM.cadence[0].map((n) => Note.chroma(n))).toContain((Note.chroma(qM.key)! + 4) % 12);
    }
  });

  test('item invalide : erreur claire', () => {
    expect(() => generate(A, seededRng(1), { itemKey: 'dorian:IV' })).toThrow(/Item invalide/);
    expect(() => generate(A, seededRng(1), { itemKey: 'major:XX' })).toThrow(/Item invalide/);
    expect(() => generate(D, seededRng(1), { itemKey: 'I' })).toThrow(/Item invalide/);
    expect(() => generate(C, seededRng(1), { itemKey: 'zz/1' })).toThrow(/Item invalide/);
  });

  test('item périmé (syntaxe valide mais hors palier) : erreur', () => {
    expect(() => generate(A, seededRng(1), { itemKey: 'major:V7' })).toThrow(/Item invalide/);
    expect(() => generate(A, seededRng(1), { itemKey: 'minor:I' })).toThrow(/Item invalide/);
    expect(() => generate(D, seededRng(1), { itemKey: 'V-IV' })).toThrow(/Item invalide/);
    expect(() => generate(C, seededRng(1), { itemKey: 'I' })).toThrow(/Item invalide/);
  });
});
