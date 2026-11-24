import { describe, expect, test } from 'vitest';
import { loadPaliers, PALIER_ORDER } from './paliers';
import { PalierSchema } from './schema';
import { parseDegree } from '../theory/degree';

const A = {
  id: 'A',
  titre: 'Ancrage',
  explication: 'x',
  modes: ['major'],
  degres: ['I', 'IV', 'V', 'vi'],
  sevenths: false,
  type: 'degre',
  longueur: [1, 1],
  serie: { questions: 6, rappels: 2, seuil: 0.85, seriesConsecutives: 2, suiteReussites: 6 },
  reecoutes: 3,
  chant: false,
  timbres: ['piano', 'guitare', 'nappe'],
  cadence: ['I', 'IV', 'V', 'I'],
};

describe('paliers', () => {
  test('les quatre paliers chargent et sont ordonnés', () => {
    const p = loadPaliers();
    expect(p.map((x) => x.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(p[0].degres).toEqual(['I', 'IV', 'V', 'vi']);
    expect(PALIER_ORDER.slice(0, 4)).toEqual(['A', 'B', 'C', 'D']);
  });

  test('tous les degrés sont valides pour la grammaire', () => {
    for (const p of loadPaliers()) {
      const all = [...p.degres, ...(p.degresMineur ?? []), ...(p.septiemes ?? []), ...(p.septiemesMineur ?? []), ...p.cadence, ...(p.cadenceMineur ?? [])];
      for (const d of all) expect(() => parseDegree(d)).not.toThrow();
    }
  });

  test('valeurs des paliers B, C, D', () => {
    const [, B, C, D] = loadPaliers();
    expect(B.modes).toEqual(['major', 'minor']);
    expect(B.degresMineur).toEqual(['i', 'ii°', 'bIII', 'iv', 'V', 'bVI', 'bVII']);
    expect(B.septiemesMineur).toEqual(['i7', 'iiø7', 'bIIImaj7', 'iv7', 'V7', 'bVImaj7', 'bVII7']);
    expect(B.cadenceMineur).toEqual(['i', 'iv', 'V', 'i']);
    expect(B.reecoutes).toBe(2);
    expect(C.type).toBe('basse');
    expect(C.sevenths).toBe(true);
    expect(C.septiemes).toEqual(['Imaj7', 'IVmaj7', 'V7', 'vi7', 'ii7']);
    expect(C.chant).toBe(true);
    expect(D.type).toBe('progression');
    expect(D.longueur).toEqual([2, 2]);
    expect(D.cadence).toEqual(['I', 'V7', 'I']);
  });

  test('un fichier invalide est refusé', () => {
    expect(() => PalierSchema.parse({ id: 'Z', serie: { questions: 0 } })).toThrow();
  });

  test('A valide, avec cadenceMineur par défaut', () => {
    expect(PalierSchema.parse(A).id).toBe('A');
  });

  test('un degré invalide ou non canonique est refusé avec son chemin', () => {
    const bad = PalierSchema.safeParse({ ...A, degres: ['I', 'zz'] });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0].path).toEqual(['degres', 1]);
    expect(PalierSchema.safeParse({ ...A, cadence: ['I', 'im7'] }).success).toBe(false);
  });

  test('règles de cohérence', () => {
    const bad = (o: object) => PalierSchema.safeParse({ ...A, ...o }).success;
    expect(bad({ modes: [] })).toBe(false);
    expect(bad({ modes: ['major', 'minor'] })).toBe(false); // degresMineur requis
    expect(bad({ longueur: [2, 1] })).toBe(false);
    expect(bad({ longueur: [0, 1] })).toBe(false);
    expect(bad({ serie: { ...A.serie, seuil: 0 } })).toBe(false);
    expect(bad({ serie: { ...A.serie, seuil: 1.1 } })).toBe(false);
    expect(bad({ reecoutes: -1 })).toBe(false);
    expect(bad({ timbres: [] })).toBe(false);
    expect(bad({ timbres: ['violon'] })).toBe(false);
    expect(bad({ type: 'autre' })).toBe(false);
    expect(bad({ id: 'AB' })).toBe(false);
    expect(bad({ id: 'a' })).toBe(false);
  });
});
