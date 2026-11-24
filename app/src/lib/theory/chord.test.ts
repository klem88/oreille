import { describe, expect, test } from 'vitest';
import { parseDegree } from './degree';
import { KEYS, bassPitchClass, chordName, chordPitchClasses, functionOf, ROLE } from './chord';
import { DEGREE_COLORS, colorOf } from './colors';

describe('chord', () => {
  test('triades et septièmes en majeur', () => {
    expect(chordPitchClasses('C', 'major', parseDegree('V7'))).toEqual(['G', 'B', 'D', 'F']);
    expect(chordName('C', 'major', parseDegree('viiø7'))).toBe('Bm7b5');
    expect(chordName('C', 'major', parseDegree('vii°7'))).toBe('Bdim7');
  });
  test('mineur : V7 et bVII', () => {
    expect(chordName('A', 'minor', parseDegree('V7'))).toBe('E7');
    expect(chordName('A', 'minor', parseDegree('bVII'))).toBe('G');
    expect(chordName('A', 'minor', parseDegree('iiø7'))).toBe('Bm7b5');
  });
  test('enharmonies simplifiées', () => {
    expect(chordPitchClasses('Gb', 'major', parseDegree('IV'))).toEqual(['B', 'Eb', 'Gb']);
    expect(chordName('Gb', 'major', parseDegree('IV'))).toBe('B');
  });
  test('renversement et secondaire', () => {
    expect(bassPitchClass('C', 'major', parseDegree('I/3'))).toBe('E');
    expect(chordName('C', 'major', parseDegree('I/3'))).toBe('C/E');
    expect(chordPitchClasses('C', 'major', parseDegree('V7/V'))).toEqual(['D', 'F#', 'A', 'C']);
  });
  test('fonction', () => {
    expect(functionOf(parseDegree('vi'))).toBe('tonique');
    expect(functionOf(parseDegree('bVII'))).toBe('dominante');
    expect(functionOf(parseDegree('V7/V'))).toBe('dominante');
  });
  test('cas supplémentaires', () => {
    expect(chordPitchClasses('C', 'major', parseDegree('vii°'))).toEqual(['B', 'D', 'F']);
    expect(chordPitchClasses('C', 'major', parseDegree('I6'))).toEqual(['C', 'E', 'G', 'A']);
    expect(chordPitchClasses('C', 'major', parseDegree('V+'))).toEqual(['G', 'B', 'D#']);
    expect(chordPitchClasses('C', 'major', parseDegree('bVI'))).toEqual(['Ab', 'C', 'Eb']);
    expect(bassPitchClass('C', 'major', parseDegree('V7/7'))).toBe('F');
    expect(KEYS).toHaveLength(12);
    expect(ROLE[1]).toBe('la maison');
  });
  test('couleurs', () => {
    expect(colorOf(parseDegree('bVII'))).toBe('#4b3fa8');
    expect(colorOf(parseDegree('V7/V'))).toBe(DEGREE_COLORS[5]);
    expect(colorOf(parseDegree('I'))).toBe('#e4383a');
  });
});
