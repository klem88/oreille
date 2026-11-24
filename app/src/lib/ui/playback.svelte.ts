import { playChord, playNote, playSequence, stop, unlock, type Timbre } from '../audio/engine';

/** Déblocage audio : à appeler de façon synchrone au début de tout tap qui joue (iOS). */
export function tapUnlock(): void {
  unlock().catch(() => { /* le jeu suivant échouera silencieusement ; rien à afficher */ });
}

/**
 * Lecteur avec jeton (R17) : playSequence résout aussi sa promesse quand elle est annulée
 * (stop() ou séquence plus récente) ; une résolution périmée renvoie false et doit être ignorée.
 */
export class Player {
  /** Une séquence (ou la pause qui la suit) est en cours. */
  active = $state(false);
  #token = 0;

  async sequence(
    chords: string[][],
    bpm: number,
    timbre: Timbre,
    onChord?: (i: number) => void,
    beatsPerChord = 4,
  ): Promise<boolean> {
    const t = ++this.#token;
    this.active = true;
    try {
      await playSequence(chords, bpm, timbre, (i) => { if (t === this.#token) onChord?.(i); }, beatsPerChord);
    } catch (e) {
      if (t === this.#token) this.active = false;
      throw e;
    }
    if (t !== this.#token) return false;
    this.active = false;
    return true;
  }

  /** Pause entre deux séquences ; false si annulée entre-temps. */
  wait(ms: number): Promise<boolean> {
    const t = ++this.#token;
    this.active = true;
    return new Promise((resolve) =>
      setTimeout(() => {
        const ok = t === this.#token;
        if (ok) this.active = false;
        resolve(ok);
      }, ms),
    );
  }

  cancel(): void {
    this.#token += 1;
    this.active = false;
    stop();
  }

  /** Réécoute d'un accord au tap : coupe toute séquence en cours. */
  chord(notes: string[], timbre: Timbre): void {
    this.cancel();
    playChord(notes, timbre, '1n');
  }

  note(note: string, timbre: Timbre): void {
    this.cancel();
    playNote(note, timbre, '1n');
  }
}
