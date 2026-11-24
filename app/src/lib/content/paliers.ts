import { PalierSchema, type Palier } from './schema';

export type { Palier };
export const PALIER_ORDER: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const files = import.meta.glob('../../content/paliers/*.yaml', { eager: true, import: 'default' }) as Record<string, unknown>;

let cache: Palier[] | null = null;

export function loadPaliers(): Palier[] {
  if (cache) return cache;
  const out: Palier[] = [];
  for (const [path, raw] of Object.entries(files)) {
    const name = path.split('/').pop() ?? path;
    const res = PalierSchema.safeParse(raw);
    if (!res.success) {
      const issues = res.error.issues.map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`).join(' ; ');
      throw new Error(`Palier invalide ${name} — ${issues}`);
    }
    out.push(res.data);
  }
  out.sort((a, b) => PALIER_ORDER.indexOf(a.id) - PALIER_ORDER.indexOf(b.id));
  cache = out;
  return out;
}
