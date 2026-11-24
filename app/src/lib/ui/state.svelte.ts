import { loadProgress, saveProgress } from '../engine/store';
import type { Progress } from '../engine/session';

/** Progression courante, partagée par les écrans ; persistée à chaque changement. */
class AppState {
  progress = $state.raw<Progress | null>(null);
  error = $state('');

  async refresh(): Promise<void> {
    try {
      this.progress = await loadProgress();
      this.error = '';
    } catch (e) {
      this.error = `Lecture de la progression impossible : ${(e as Error).message}`;
    }
  }

  /** Remplace la progression et l'enregistre (appelé après beginSeries et après chaque réponse). */
  async commit(p: Progress): Promise<void> {
    this.progress = p;
    try {
      await saveProgress(p);
    } catch (e) {
      this.error = `Enregistrement impossible : ${(e as Error).message}`;
    }
  }
}

export const app = new AppState();
