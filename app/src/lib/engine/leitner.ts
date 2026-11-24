export type BoxLevel = 0 | 1 | 2 | 3 | 4;

export interface Box {
  item: string;
  palier: string;
  box: BoxLevel;
  due: number;
}

const JOUR = 24 * 60 * 60 * 1000;
export const INTERVALS_MS: readonly number[] = [0, 1 * JOUR, 3 * JOUR, 7 * JOUR, 21 * JOUR];

export function promote(b: Box, now: number): Box {
  const box = Math.min(4, b.box + 1) as BoxLevel;
  return { ...b, box, due: now + INTERVALS_MS[box] };
}

export function demote(b: Box, now: number): Box {
  return { ...b, box: 0, due: now };
}
