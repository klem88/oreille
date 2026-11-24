<script lang="ts">
  import { isLoaded, loadInstrument, playChord, playSequence, stop, unlock, type Timbre } from '../lib/audio/engine';

  const TIMBRES: Timbre[] = ['piano', 'guitare', 'nappe'];
  const CADENCE = [
    ['C3', 'E3', 'G3', 'C4'],
    ['F3', 'A3', 'C4', 'F4'],
    ['G3', 'B3', 'D4', 'G4'],
    ['C3', 'E3', 'G3', 'C4'],
  ];

  let timbre = $state<Timbre>('piano');
  let status = $state<Record<Timbre, 'idle' | 'loading' | 'ok' | 'error'>>({
    piano: 'idle', guitare: 'idle', nappe: 'idle',
  });
  let playing = $state(false);
  let current = $state(-1);
  let runId = 0;

  function load(t: Timbre) {
    void unlock();
    status[t] = 'loading';
    loadInstrument(t).then(
      () => { status[t] = 'ok'; },
      () => { status[t] = 'error'; },
    );
  }

  function choose(t: Timbre) {
    void unlock();
    timbre = t;
    if (!isLoaded(t) && status[t] !== 'loading') load(t);
  }

  function cadence() {
    void unlock();
    if (!isLoaded(timbre)) return;
    playing = true;
    const run = ++runId; // une séquence annulée résout sa promesse : ignorer si remplacée
    playSequence(CADENCE, 90, timbre, (i) => { current = i; }).then(() => {
      if (run !== runId) return;
      playing = false;
      current = -1;
    });
  }

  function accord() {
    void unlock();
    playChord(['C3', 'E3', 'G3', 'C4'], timbre);
  }

  function arret() {
    void unlock();
    stop();
    runId += 1;
    playing = false;
    current = -1;
  }
</script>

<main class="dev">
  <h2>Dev audio</h2>
  <div class="row">
    {#each TIMBRES as t}
      <button class:sel={t === timbre} onclick={() => choose(t)}>{t}</button>
    {/each}
  </div>
  <p data-testid="status">
    {timbre} :
    {#if status[timbre] === 'loading'}chargement…
    {:else if status[timbre] === 'ok'}prêt
    {:else if status[timbre] === 'error'}erreur <button onclick={() => load(timbre)}>Réessayer</button>
    {:else}non chargé{/if}
  </p>
  <div class="row">
    <button onclick={cadence} disabled={status[timbre] !== 'ok'}>cadence</button>
    <button onclick={accord} disabled={status[timbre] !== 'ok'}>accord</button>
    <button onclick={arret}>stop</button>
  </div>
  <p data-testid="seq">{playing ? `Écoute… accord ${current + 1}` : 'inactif'}</p>
</main>

<style>
  .dev { padding: 16px; }
  .row { display: flex; gap: 8px; margin: 8px 0; }
  button { padding: 12px 16px; font-size: 1rem; }
  .sel { outline: 2px solid currentColor; }
</style>
