import { openDB, type IDBPDatabase } from 'idb';
import { z } from 'zod';
import type { Box } from './leitner';
import { initialProgress, type Progress } from './session';

const DB_NAME = 'oreille';
const STORE = 'progress';
const KEY = 'main';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

const palierProgressSchema = z.object({
  unlocked: z.boolean(),
  validated: z.boolean(),
  consecutiveSeries: z.number(),
  streak: z.number(),
  lastScore: z.object({ correct: z.number(), total: z.number() }).optional(),
});

const boxSchema = z.object({
  item: z.string(),
  palier: z.string(),
  box: z.number().int().min(0).max(4),
  due: z.number(),
});

const importSchema = z.object({
  version: z.literal(1),
  progress: z.object({
    paliers: z.record(z.string(), palierProgressSchema),
    boxes: z.array(boxSchema),
    series: z.unknown().optional(), // acceptée mais abandonnée (R10)
  }),
});

export async function loadProgress(): Promise<Progress> {
  const stored = (await (await db()).get(STORE, KEY)) as Progress | undefined;
  const base = initialProgress();
  if (!stored) return base;
  // Les paliers ajoutés au contenu après coup reçoivent un enregistrement ; l'existant gagne.
  return { ...stored, paliers: { ...base.paliers, ...stored.paliers } };
}

export async function saveProgress(p: Progress): Promise<void> {
  // Copie JSON simple : les proxies `$state` de Svelte 5 ne sont pas clonables par IndexedDB.
  const plain = JSON.parse(JSON.stringify(p)) as Progress;
  await (await db()).put(STORE, plain, KEY);
}

export async function exportJson(): Promise<string> {
  const progress = await loadProgress();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), progress }, null, 2);
}

export async function importJson(s: string): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(s);
  } catch {
    throw new Error("Import impossible : le fichier n'est pas du JSON valide.");
  }
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Import impossible : fichier de progression invalide (version ou structure).");
  }
  const { paliers, boxes } = parsed.data.progress;
  await saveProgress({ paliers, boxes: boxes as Box[] });
}

export async function resetAll(): Promise<void> {
  await (await db()).delete(STORE, KEY);
}
