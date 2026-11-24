import { describe, expect, test } from 'vitest';
import { colorOf, DEGREE_COLORS, isAltered } from './colors';
import { parseDegree } from './degree';

describe('colors', () => {
  test('isAltered : accident ou dominante secondaire', () => {
    expect(isAltered(parseDegree('V'))).toBe(false);
    expect(isAltered(parseDegree('ii7'))).toBe(false);
    expect(isAltered(parseDegree('bIII'))).toBe(true);
    expect(isAltered(parseDegree('bVII'))).toBe(true);
    expect(isAltered(parseDegree('V7/V'))).toBe(true);
  });

  test('un degré altéré garde la couleur de son degré de base', () => {
    expect(colorOf(parseDegree('bVII'))).toBe(DEGREE_COLORS[7]);
    expect(colorOf(parseDegree('V7/V'))).toBe(DEGREE_COLORS[5]);
  });
});
