import { beforeEach, describe, expect, it } from 'vitest';
import { exportJson, importJson, loadProgress, resetAll, saveProgress } from './store';
import { initialProgress, type Progress } from './session';

beforeEach(async () => {
  await resetAll();
});

function sample(): Progress {
  const p = initialProgress();
  p.paliers.A.validated = true;
  p.paliers.A.streak = 3;
  p.paliers.A.lastScore = { correct: 8, total: 10 };
  p.paliers.B.unlocked = true;
  p.boxes.push({ item: 'I/1', palier: 'A', box: 2, due: 1234 });
  return p;
}

describe('store', () => {
  it('état initial : A débloqué, B verrouillé', async () => {
    const p = await loadProgress();
    expect(p.paliers.A.unlocked).toBe(true);
    expect(p.paliers.B.unlocked).toBe(false);
    expect(p.boxes).toEqual([]);
  });

  it('sauvegarde puis rechargement égal', async () => {
    const p = sample();
    await saveProgress(p);
    expect(await loadProgress()).toEqual(p);
  });

  it('une série en cours survit au rechargement', async () => {
    const p = sample();
    p.series = {
      palier: 'A',
      questions: [{ id: 'q' } as never],
      recall: [false],
      index: 0,
      results: [],
    };
    await saveProgress(p);
    const l = await loadProgress();
    expect(l.series).toEqual(p.series);
  });

  it('fusionne : un palier ajouté au contenu reçoit un enregistrement', async () => {
    const p = sample();
    delete p.paliers.D;
    await saveProgress(p);
    const l = await loadProgress();
    expect(l.paliers.D).toEqual(initialProgress().paliers.D);
    expect(l.paliers.A.validated).toBe(true);
  });

  it('export puis import restitue paliers et boxes', async () => {
    const p = sample();
    await saveProgress(p);
    const json = await exportJson();
    expect(JSON.parse(json).version).toBe(1);
    await resetAll();
    await importJson(json);
    const l = await loadProgress();
    expect(l.paliers).toEqual(p.paliers);
    expect(l.boxes).toEqual(p.boxes);
  });

  it("l'import abandonne la série", async () => {
    const p = sample();
    p.series = { palier: 'A', questions: [], recall: [], index: 0, results: [] };
    await saveProgress(p);
    const json = await exportJson();
    await resetAll();
    await importJson(json);
    expect((await loadProgress()).series).toBeUndefined();
  });

  it.each([
    ['json invalide', '{pas du json'],
    ['version 2', JSON.stringify({ version: 2, progress: { paliers: {}, boxes: [] } })],
    ['box hors plage', JSON.stringify({ version: 1, progress: { paliers: {}, boxes: [{ item: 'x', palier: 'A', box: 9, due: 0 }] } })],
    ['paliers absents', JSON.stringify({ version: 1, progress: { boxes: [] } })],
  ])('import invalide (%s) lance et ne modifie rien', async (_n, s) => {
    const p = sample();
    await saveProgress(p);
    await expect(importJson(s)).rejects.toThrow(/import|invalide|JSON/i);
    expect(await loadProgress()).toEqual(p);
  });

  it('resetAll ramène à l’état initial', async () => {
    await saveProgress(sample());
    await resetAll();
    expect(await loadProgress()).toEqual(initialProgress());
  });
});
