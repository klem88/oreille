import { z } from 'zod';
import { formatDegree, parseDegree } from '../theory/degree';
import type { Mode } from '../theory/chord';
import type { Timbre } from '../audio/engine';

/** Degré valide pour la grammaire ET déjà sous forme canonique (R13). */
const DegreeString = z.string().refine(
  (s) => {
    try {
      return formatDegree(parseDegree(s)) === s;
    } catch {
      return false;
    }
  },
  { message: 'degré invalide ou non canonique' },
);

const Degres = z.array(DegreeString);
const ModeSchema = z.enum(['major', 'minor']) satisfies z.ZodType<Mode>;
const TimbreSchema = z.enum(['piano', 'guitare', 'nappe']) satisfies z.ZodType<Timbre>;

export const PalierSchema = z
  .object({
    id: z.string().regex(/^[A-I]$/, 'une lettre majuscule A–I'),
    titre: z.string().min(1),
    explication: z.string().min(1),
    modes: z.array(ModeSchema).min(1),
    degres: Degres,
    degresMineur: Degres.optional(),
    sevenths: z.boolean(),
    septiemes: Degres.optional(),
    septiemesMineur: Degres.optional(),
    type: z.enum(['degre', 'basse', 'progression']),
    longueur: z
      .tuple([z.number().int().min(1), z.number().int().min(1)])
      .refine(([min, max]) => min <= max, { message: 'longueur : min ≤ max' }),
    serie: z.object({
      questions: z.number().int().min(1),
      rappels: z.number().int().min(0),
      seuil: z.number().gt(0).max(1),
      seriesConsecutives: z.number().int().min(1),
      suiteReussites: z.number().int().min(1),
    }),
    reecoutes: z.number().int().min(0),
    chant: z.boolean(),
    timbres: z.array(TimbreSchema).min(1),
    cadence: Degres,
    cadenceMineur: Degres.default(['i', 'iv', 'V7', 'i']),
  })
  .refine((p) => !p.modes.includes('minor') || (p.degresMineur?.length ?? 0) > 0, {
    path: ['degresMineur'],
    message: 'degresMineur requis quand modes contient minor',
  });

export type Palier = z.infer<typeof PalierSchema>;
