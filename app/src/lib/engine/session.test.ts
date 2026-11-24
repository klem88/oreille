import { describe, expect, test } from 'vitest';
import { loadPaliers } from '../content/paliers';
import { seededRng } from '../theory/rng';
import { INTERVALS_MS, demote, promote, type Box } from './leitner';
import { answer, initialProgress, scoreOf, startSeries, type Progress, type SeriesState } from './session';
import type { Answer } from './question';

const [A, B] = loadPaliers();
const fresh = initialProgress;

function wrong(a: Answer): Answer {
  if (a.kind === 'degre') return { kind: 'degre', degree: a.degree === 'I' ? 'V' : 'I' };
  if (a.kind === 'basse') return { kind: 'basse', bass: a.bass === 1 ? 3 : 1 };
  return { kind: 'progression', degrees: ['__x__'] };
}

/** Joue une série entière ; `ok(i)` dit si la question i est réussie. */
function play(p: Progress, s: SeriesState, ok: (i: number) => boolean, now = 0) {
  for (;;) {
    const q = s.questions[s.index];
    const r = answer(p, s, ok(s.index) ? q.expected : wrong(q.expected), now);
    p = r.progress;
    s = r.series;
    if (r.done) return { p, s };
  }
}

describe('Leitner / séries / déblocage', () => {
  test('état initial : seul A débloqué', () => {
    const p = fresh();
    expect(p.paliers.A.unlocked).toBe(true);
    expect(p.paliers.B.unlocked).toBe(false);
    expect(p.boxes).toEqual([]);
  });

  test('série = 6 + 2 rappels, seuls les 6 comptent', () => {
    const s = startSeries(fresh(), A, seededRng(1), 0);
    expect(s.questions.length).toBe(8);
    expect(s.questions.filter((q) => q.palier === 'A').length).toBe(8);
    expect(s.recall.filter(Boolean).length).toBe(2);
    expect(scoreOf(s)).toEqual({ correct: 0, total: 6 });
  });

  test('deux séries consécutives à 85 % débloquent B', () => {
    let p = fresh();
    for (let k = 0; k < 2; k++) {
      ({ p } = play(p, startSeries(p, A, seededRng(k), 0), () => true));
    }
    expect(p.paliers.A.validated).toBe(true);
    expect(p.paliers.B.unlocked).toBe(true);
    expect(p.series).toBeUndefined();
  });

  test('6 réussites d’affilée valident aussi, avant la fin de la série', () => {
    let early = 0;
    for (let seed = 0; seed < 20; seed++) {
      let p = fresh();
      let s = startSeries(p, A, seededRng(seed), 0);
      let nonRecall = 0;
      for (;;) {
        const isRecall = s.recall[s.index];
        const r = answer(p, s, s.questions[s.index].expected, 0);
        p = r.progress;
        s = r.series;
        if (!isRecall) nonRecall++;
        if (nonRecall < 6) expect(p.paliers.A.validated).toBe(false);
        else {
          expect(p.paliers.A.validated).toBe(true);
          expect(p.paliers.B.unlocked).toBe(true);
          if (!r.done) early++;
          break;
        }
      }
    }
    expect(early).toBeGreaterThan(0);
  });

  test('une série ratée remet le compteur à zéro', () => {
    let p = fresh();
    ({ p } = play(p, startSeries(p, A, seededRng(1), 0), () => true));
    expect(p.paliers.A.consecutiveSeries).toBe(1);
    // une réponse sur deux fausse : jamais 6 d'affilée, score ~50 %
    ({ p } = play(p, startSeries(p, A, seededRng(2), 0), (i) => i % 2 === 0));
    expect(p.paliers.A.consecutiveSeries).toBe(0);
    const { correct, total } = p.paliers.A.lastScore!;
    expect(correct / total).toBeLessThan(0.85);
  });

  test('une erreur rétrograde l’item en boîte 0', () => {
    let b: Box = { item: 'major:I', palier: 'A', box: 0, due: 0 };
    b = promote(b, 1000);
    b = promote(b, 2000);
    expect(b.box).toBe(2);
    expect(b.due).toBe(2000 + INTERVALS_MS[2]);
    b = demote(b, 3000);
    expect(b.box).toBe(0);
    expect(b.due).toBe(3000);
    const top = promote({ item: 'x', palier: 'A', box: 4, due: 0 }, 0);
    expect(top.box).toBe(4);
  });

  test('série interrompue : reprise cohérente', () => {
    let p = fresh();
    let s = startSeries(p, A, seededRng(5), 0);
    ({ progress: p, series: s } = answer(p, s, s.questions[0].expected, 0));
    const saved = JSON.parse(JSON.stringify({ p, s }));
    expect(saved.s.index).toBe(1);
    expect(saved.s.results).toEqual([true]);
    expect(saved.p.series.index).toBe(1);
  });

  test('rappels pris dans les boîtes dues des paliers validés', () => {
    const p = fresh();
    p.paliers.A.validated = true;
    p.paliers.B.unlocked = true;
    p.boxes = [
      { item: 'major:I', palier: 'A', box: 1, due: 100 },
      { item: 'major:V', palier: 'A', box: 0, due: 50 },
      { item: 'major:IV', palier: 'A', box: 2, due: 10 },
      { item: 'major:vi', palier: 'A', box: 0, due: 9999 }, // pas due
      { item: 'major:ii', palier: 'A', box: 0, due: 0 }, // item périmé
    ];
    const s = startSeries(p, B, seededRng(3), 1000);
    expect(s.questions.length).toBe(8);
    const rec = s.questions.filter((_, i) => s.recall[i]);
    expect(rec.length).toBe(2);
    expect(rec.every((q) => q.palier === 'A')).toBe(true);
    expect(rec.map((q) => q.itemKey).sort()).toEqual(['major:I', 'major:V']);
    expect(s.questions.filter((_, i) => !s.recall[i]).every((q) => q.palier === 'B')).toBe(true);
  });

  test('answer ne mute pas ses entrées', () => {
    const p = fresh();
    const s = startSeries(p, A, seededRng(7), 0);
    const before = JSON.stringify({ p, s });
    const r = answer(p, s, s.questions[0].expected, 0);
    expect(JSON.stringify({ p, s })).toBe(before);
    expect(r.series).not.toBe(s);
    expect(r.progress).not.toBe(p);
  });

  test('les réponses aux rappels ne changent pas le streak', () => {
    const p = fresh();
    const s = startSeries(p, A, seededRng(1), 0);
    const i = s.recall.findIndex(Boolean);
    const s2: SeriesState = { ...s, index: i };
    const r = answer(p, s2, s2.questions[i].expected, 0);
    expect(r.progress.paliers.A.streak).toBe(0);
    const w = answer(p, s2, wrong(s2.questions[i].expected), 0);
    expect(w.progress.paliers.A.streak).toBe(0);
  });

  test('répondre à une série terminée lève une erreur', () => {
    const p = fresh();
    const { s } = play(p, startSeries(p, A, seededRng(1), 0), () => true);
    expect(() => answer(p, s, s.questions[0].expected, 0)).toThrow();
  });
});
