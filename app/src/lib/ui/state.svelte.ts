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

/** Connexion et repli sonore : alimente la bannière hors ligne (R11, R22). */
class NetState {
  online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);
  /** Un timbre à samples n'a pas pu être chargé : la question est jouée à la nappe. */
  fallback = $state(false);

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => { this.online = true; });
    window.addEventListener('offline', () => { this.online = false; });
  }
}

export const net = new NetState();
