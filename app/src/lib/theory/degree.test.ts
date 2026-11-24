import { describe, expect, test } from 'vitest';
import { DegreeSyntaxError, baseStep, formatDegree, isDiatonicQuality, parseDegree } from './degree';

describe('parseDegree', () => {
  test('triades diatoniques', () => {
    expect(parseDegree('I')).toMatchObject({ step: 1, accidental: 0, quality: 'maj', bass: 1 });
    expect(parseDegree('vi')).toMatchObject({ step: 6, quality: 'min' });
    expect(parseDegree('vii°')).toMatchObject({ step: 7, quality: 'dim' });
    expect(parseDegree('vii')).toMatchObject({ step: 7, quality: 'dim' });
    expect(parseDegree('ii°')).toMatchObject({ step: 2, quality: 'dim' });
  });
  test('septièmes, ø et ° distingués', () => {
    expect(parseDegree('viiø7').quality).toBe('ø7');
    expect(parseDegree('vii°7').quality).toBe('°7');
    expect(parseDegree('V7').quality).toBe('7');
    expect(parseDegree('IVmaj7').quality).toBe('maj7');
    expect(parseDegree('ii7').quality).toBe('m7');
    expect(parseDegree('im7').quality).toBe('m7');
    expect(parseDegree('im7').label).toBe('i7');
  });
  test('altérations, renversements, secondaires', () => {
    expect(parseDegree('bVII')).toMatchObject({ step: 7, accidental: -1, quality: 'maj' });
    expect(parseDegree('#iv°7')).toMatchObject({ step: 4, accidental: 1, quality: '°7' });
    expect(parseDegree('I/3').bass).toBe(3);
    expect(parseDegree('V7/V').secondaryOf).toMatchObject({ step: 5 });
    expect(parseDegree('V+').quality).toBe('aug');
    expect(parseDegree('I6').quality).toBe('6');
    expect(parseDegree('V7/7').bass).toBe(7);
  });
  test('format est l’inverse de parse', () => {
    const all = ['I', 'ii7', 'viiø7', 'bVII', 'V7/V', 'I/3', 'V+', 'vii°', 'ii°', 'vi', 'IVmaj7', 'I6',
      'vii°7', '#iv°7', 'V7/7', 'I/5', 'i7', 'bIII', 'bVImaj7', 'iii7/3', 'v'];
    for (const s of all) expect(formatDegree(parseDegree(s))).toBe(s);
    for (const s of all) expect(parseDegree(s).label).toBe(s);
  });
  test('syntaxe invalide', () => {
    for (const s of ['VIII', 'IIII', 'vii7', 'V°', 'i+', 'i6', 'Im7', 'viim7', 'I/7', 'V+/7', 'vi/7', 'vii°/7', 'I6/7', 'IVmaj7x', 'imaj7', 'Iø7', 'I°7', 'I/2', 'I/4', '', 'x', 'V7/']) {
      expect(() => parseDegree(s), s).toThrow(DegreeSyntaxError);
    }
  });
  test('baseStep', () => {
    expect(baseStep(parseDegree('bVII'))).toBe(7);
    expect(baseStep(parseDegree('V7/V'))).toBe(5);
  });
});

describe('isDiatonicQuality', () => {
  test('majeur', () => {
    expect(isDiatonicQuality(1, 'maj', 'major')).toBe(true);
    expect(isDiatonicQuality(1, 'min', 'major')).toBe(false);
    expect(isDiatonicQuality(5, '7', 'major')).toBe(true);
    expect(isDiatonicQuality(2, 'm7', 'major')).toBe(true);
    expect(isDiatonicQuality(7, 'ø7', 'major')).toBe(true);
    expect(isDiatonicQuality(7, '°7', 'major')).toBe(false);
  });
  test('mineur', () => {
    expect(isDiatonicQuality(1, 'min', 'minor')).toBe(true);
    expect(isDiatonicQuality(5, 'maj', 'minor')).toBe(true);
    expect(isDiatonicQuality(7, '°7', 'minor')).toBe(true);
    expect(isDiatonicQuality(7, 'maj', 'minor')).toBe(true);
    expect(isDiatonicQuality(2, 'dim', 'minor')).toBe(true);
    expect(isDiatonicQuality(3, 'min', 'minor')).toBe(false);
  });
});
