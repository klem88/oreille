import { loadPaliers, PALIER_ORDER, type Palier } from '../content/paliers';
import type { Rng } from '../theory/rng';
import { generate, grade, itemsOf } from './generator';
import type { Answer, Question } from './question';
import { demote, promote, type Box } from './leitner';

export interface PalierProgress {
  unlocked: boolean;
  validated: boolean;
  consecutiveSeries: number;
  streak: number;
  lastScore?: { correct: number; total: number };
}

export interface SeriesState {
  palier: string;
  questions: Question[];
  /** Parallèle à `questions` : true pour les rappels (ne comptent pas). */
  recall: boolean[];
  index: number;
  results: boolean[];
}

export interface Progress {
  paliers: Record<string, PalierProgress>;
  boxes: Box[];
  series?: SeriesState;
}

export function initialProgress(): Progress {
  const paliers: Record<string, PalierProgress> = {};
  for (const p of loadPaliers()) {
    paliers[p.id] = { unlocked: false, validated: false, consecutiveSeries: 0, streak: 0 };
  }
  const first = PALIER_ORDER.find((id) => paliers[id]);
  if (first) paliers[first].unlocked = true;
  return { paliers, boxes: [] };
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findBox(boxes: Box[], palier: string, item: string): Box | undefined {
  return boxes.find((b) => b.palier === palier && b.item === item);
}

function getPalier(id: string): Palier {
  const p = loadPaliers().find((x) => x.id === id);
  if (!p) throw new Error(`Palier inconnu : ${id}`);
  return p;
}

export function startSeries(progress: Progress, palier: Palier, rng: Rng, now: number): SeriesState {
  const { questions: nQ, rappels: nR } = palier.serie;

  // items les moins avancés d'abord (jamais vus = boîte -1), égalités mélangées
  const pickItems = (count: number, exclude: string[] = []): string[] => {
    const all = itemsOf(palier);
    const pool = all.filter((i) => !exclude.includes(i));
    const base = pool.length >= count ? pool : all;
    const ranked = shuffle(base, rng)
      .map((item) => ({ item, box: findBox(progress.boxes, palier.id, item)?.box ?? -1 }))
      .sort((a, b) => a.box - b.box);
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(ranked[i % ranked.length].item);
    return out;
  };

  const main: Question[] = pickItems(nQ).map((itemKey) => generate(palier, rng, { itemKey }));

  const loaded = loadPaliers();
  const due = progress.boxes
    .filter((b) => {
      if (!progress.paliers[b.palier]?.validated || b.due > now) return false;
      const p = loaded.find((x) => x.id === b.palier);
      return !!p && itemsOf(p).includes(b.item);
    })
    .sort((a, b) => a.box - b.box || a.due - b.due)
    .slice(0, nR);
  const recalls: Question[] = due.map((b) =>
    generate(loaded.find((x) => x.id === b.palier)!, rng, { itemKey: b.item }),
  );
  const missing = nR - recalls.length;
  for (const itemKey of missing > 0 ? pickItems(missing, main.map((m) => m.itemKey)) : []) {
    recalls.push(generate(palier, rng, { itemKey }));
  }

  const entries = main.map((q) => ({ q, recall: false }));
  for (const q of recalls) {
    entries.splice(Math.floor(rng() * (entries.length + 1)), 0, { q, recall: true });
  }
  return {
    palier: palier.id,
    questions: entries.map((e) => e.q),
    recall: entries.map((e) => e.recall),
    index: 0,
    results: [],
  };
}

/**
 * Démarre une série ET l'attache à `progress.series` : c'est cette fonction que l'UI doit
 * utiliser, pour qu'une série interrompue avant sa première réponse soit persistée.
 */
export function beginSeries(
  progress: Progress,
  palier: Palier,
  rng: Rng,
  now: number,
): { progress: Progress; series: SeriesState } {
  const series = startSeries(progress, palier, rng, now);
  return { progress: { ...progress, series }, series };
}

export function scoreOf(series: SeriesState): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  series.recall.forEach((isRecall, i) => {
    if (isRecall) return;
    total++;
    if (series.results[i]) correct++;
  });
  return { correct, total };
}

export function answer(
  progress: Progress,
  series: SeriesState,
  a: Answer,
  now: number,
): { correct: boolean; done: boolean; progress: Progress; series: SeriesState } {
  if (series.index >= series.questions.length) throw new Error('Série déjà terminée');
  const ps = progress.series;
  if (
    ps &&
    (ps.palier !== series.palier ||
      ps.index !== series.index ||
      ps.questions.length !== series.questions.length ||
      ps.questions[0]?.id !== series.questions[0]?.id)
  ) {
    throw new Error('Série périmée');
  }
  const q = series.questions[series.index];
  const isRecall = series.recall[series.index];
  const { correct } = grade(q, a);

  const nextSeries: SeriesState = {
    ...series,
    results: [...series.results, correct],
    index: series.index + 1,
  };
  const done = nextSeries.index >= nextSeries.questions.length;

  const boxes = [...progress.boxes];
  const at = boxes.findIndex((b) => b.palier === q.palier && b.item === q.itemKey);
  const base: Box = at >= 0 ? boxes[at] : { item: q.itemKey, palier: q.palier, box: 0, due: now };
  const updated = correct ? promote(base, now) : demote(base, now);
  if (at >= 0) boxes[at] = updated;
  else boxes.push(updated);

  const paliers: Record<string, PalierProgress> = {};
  for (const [id, p] of Object.entries(progress.paliers)) paliers[id] = { ...p };
  const cur = paliers[series.palier];
  if (!cur) throw new Error(`Palier inconnu dans la progression : ${series.palier}`);
  const params = getPalier(series.palier).serie;

  if (!isRecall) {
    cur.streak = correct ? cur.streak + 1 : 0;
    if (cur.streak >= params.suiteReussites) cur.validated = true;
  }
  if (done) {
    const score = scoreOf(nextSeries);
    cur.lastScore = score;
    const passed = score.total > 0 && score.correct / score.total >= params.seuil;
    cur.consecutiveSeries = passed ? cur.consecutiveSeries + 1 : 0;
    if (cur.consecutiveSeries >= params.seriesConsecutives) cur.validated = true;
  }
  if (cur.validated) {
    const next = PALIER_ORDER[PALIER_ORDER.indexOf(series.palier) + 1];
    if (next && paliers[next]) paliers[next] = { ...paliers[next], unlocked: true };
  }

  const newProgress: Progress = { paliers, boxes };
  if (!done) newProgress.series = nextSeries;
  return { correct, done, progress: newProgress, series: nextSeries };
}
