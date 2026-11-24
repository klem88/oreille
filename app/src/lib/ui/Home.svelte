<script lang="ts">
  import { loadPaliers } from '../content/paliers';
  import { exportJson, importJson, resetAll } from '../engine/store';
  import { go } from './router.svelte';
  import { app } from './state.svelte';

  /** Accueil : paliers avec état et dernier score, reprise de série, export / import / réinitialisation. */
  const paliers = loadPaliers();
  let message = $state('');
  let failure = $state('');
  let fileInput: HTMLInputElement | undefined = $state();

  const series = $derived(app.progress?.series);

  function stateOf(id: string): 'verrouillé' | 'en cours' | 'validé' {
    const p = app.progress?.paliers[id];
    if (!p?.unlocked && !p?.validated) return 'verrouillé';
    return p.validated ? 'validé' : 'en cours';
  }

  async function doExport() {
    failure = '';
    try {
      const json = await exportJson();
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `oreille-progression-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message = 'Progression exportée.';
    } catch (e) {
      failure = `Export impossible : ${(e as Error).message}`;
    }
  }

  async function doImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    message = '';
    failure = '';
    try {
      await importJson(await file.text());
      await app.refresh();
      message = 'Progression importée.';
    } catch (err) {
      failure = (err as Error).message;
    }
  }

  async function doReset() {
    if (!confirm('Effacer toute la progression ? Cette action est définitive.')) return;
    failure = '';
    try {
      await resetAll();
      await app.refresh();
      message = 'Progression réinitialisée.';
    } catch (e) {
      failure = `Réinitialisation impossible : ${(e as Error).message}`;
    }
  }
</script>

<main class="screen">
  <header>
    <h1>Oreille</h1>
    <p class="hint">Entraîner l'oreille harmonique, degré par degré. Casque conseillé.</p>
  </header>

  {#if series}
    <button class="resume" onclick={() => go('#/serie')}>
      Reprendre la série du palier {series.palier} (question {series.index + 1} / {series.questions.length})
    </button>
  {/if}

  <ul class="paliers">
    {#each paliers as p (p.id)}
      {@const st = stateOf(p.id)}
      {@const last = app.progress?.paliers[p.id]?.lastScore}
      <li class="palier" class:locked={st === 'verrouillé'} data-palier={p.id} data-state={st}>
        <div class="head">
          <span class="id">{p.id}</span>
          <span class="titre">{p.titre}</span>
          <span class="state {st === 'validé' ? 'done' : st === 'en cours' ? 'cur' : ''}">{st}</span>
        </div>
        <p class="expl">{p.explication}</p>
        <div class="foot">
          <span class="last">{last ? `Dernière série : ${last.correct} / ${last.total}` : 'Pas encore de série'}</span>
          {#if st !== 'verrouillé'}
            <button class="go" onclick={() => go(`#/palier/${p.id}`)}>Commencer</button>
          {/if}
        </div>
      </li>
    {/each}
  </ul>

  <section class="data">
    <button class="small" onclick={doExport}>Exporter</button>
    <button class="small" onclick={() => fileInput?.click()}>Importer</button>
    <button class="small" onclick={doReset}>Réinitialiser</button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={doImport} />
  </section>
  {#if message}<p class="msg">{message}</p>{/if}
  {#if failure}<p class="error">{failure}</p>{/if}
  {#if app.error}<p class="error">{app.error}</p>{/if}
</main>

<style>
  .screen { max-width: 480px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  h1 { margin: 0; font-size: 28px; }
  .hint { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
  .resume { min-height: 52px; background: var(--fg); color: var(--bg); font-weight: 600; padding: 8px 12px; }
  .paliers { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .palier { background: var(--panel); border-radius: 12px; padding: 10px 12px; display: grid; gap: 6px; }
  .palier.locked { opacity: 0.55; }
  .head { display: flex; align-items: center; gap: 10px; }
  .id { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: var(--bg); font-weight: 700; }
  .titre { flex: 1; font-weight: 600; font-size: 17px; }
  .state { font-size: 12px; color: var(--muted); border: 1px solid currentColor; border-radius: 10px; padding: 1px 8px; }
  .state.cur { color: #f2d13d; }
  .state.done { color: #6fdc8c; }
  .expl { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.35; }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .last { font-size: 13px; color: var(--muted); }
  .go { min-height: 48px; padding: 0 18px; background: var(--fg); color: var(--bg); font-weight: 600; }
  .data { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .small { min-height: 48px; background: var(--panel); color: var(--fg); font-size: 14px; }
  .msg { margin: 0; color: #6fdc8c; text-align: center; font-size: 14px; }
  .error { margin: 0; color: #ff6b6b; text-align: center; font-size: 14px; }
</style>
