import { describe, expect, test } from 'vitest';
import { Note } from 'tonal';
import { parseDegree } from './degree';
import { seededRng } from './rng';
import { notesOf, voiceChords } from './voicing';

const P = (xs: string[]) => xs.map(parseDegree);

describe('voiceChords', () => {
  const rng = seededRng(42);
  test('basse dans la tessiture et mouvement proche', () => {
    const v = voiceChords('C', 'major', P(['I', 'V', 'vi', 'IV']), rng);
    for (const x of v) { const m = Note.midi(x.bass)!; expect(m).toBeGreaterThanOrEqual(40); expect(m).toBeLessThanOrEqual(57); }
    for (let i = 1; i < v.length; i++) expect(Math.abs(Note.midi(v[i].bass)! - Note.midi(v[i - 1].bass)!)).toBeLessThanOrEqual(7);
  });
  test('renversement : la basse est la tierce', () => {
    const v = voiceChords('C', 'major', [parseDegree('I/3')], rng);
    expect(Note.pitchClass(v[0].bass)).toBe('E');
  });
  test('voix supérieures au-dessus de la basse, mouvement minimal', () => {
    const v = voiceChords('A', 'major', P(['I', 'V']), rng);
    expect(Note.midi(v[0].upper[0])!).toBeGreaterThan(Note.midi(v[0].bass)! + 4);
    const move = v[1].upper.reduce((s, n, k) => s + Math.abs(Note.midi(n)! - Note.midi(v[0].upper[k])!), 0);
    expect(move).toBeLessThanOrEqual(6);
  });
  test('déterministe avec la même graine', () => {
    const a = voiceChords('D', 'major', P(['I', 'IV']), seededRng(7));
    const b = voiceChords('D', 'major', P(['I', 'IV']), seededRng(7));
    expect(a).toEqual(b);
  });
  test('accord de septième : 4 voix supérieures', () => {
    const v = voiceChords('C', 'major', P(['I', 'V7']), seededRng(1));
    expect(v[0].upper).toHaveLength(3);
    expect(v[1].upper).toHaveLength(4);
    expect(notesOf(v[1])).toHaveLength(5);
  });
  test('voix supérieures croissantes et au-dessus de la basse', () => {
    for (let s = 0; s < 30; s++) {
      for (const x of voiceChords('Eb', 'major', P(['I', 'vi', 'ii7', 'V7']), seededRng(s))) {
        const m = x.upper.map((n) => Note.midi(n)!);
        for (let k = 1; k < m.length; k++) expect(m[k]).toBeGreaterThan(m[k - 1]);
        expect(m[0]).toBeGreaterThan(Note.midi(x.bass)!);
      }
    }
  });
  test('prev : la première basse reste proche de prev.bass', () => {
    for (let s = 0; s < 30; s++) {
      const prev = voiceChords('C', 'major', P(['I', 'V']), seededRng(s))[1];
      const v = voiceChords('C', 'major', P(['vi', 'IV']), seededRng(s + 100), { prev });
      expect(Math.abs(Note.midi(v[0].bass)! - Note.midi(prev.bass)!)).toBeLessThanOrEqual(7);
    }
  });
  test('la direction du premier mouvement varie avec la graine', () => {
    let up = false, down = false;
    for (let s = 0; s < 60; s++) {
      const [a, b] = voiceChords('C', 'major', P(['I', 'V']), seededRng(s));
      const d = Note.midi(b.bass)! - Note.midi(a.bass)!;
      if (d > 0) up = true;
      if (d < 0) down = true;
    }
    expect(up && down).toBe(true);
  });
});
