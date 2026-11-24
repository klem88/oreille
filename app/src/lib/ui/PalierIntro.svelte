<script lang="ts">
  import { loadPaliers } from '../content/paliers';
  import { beginSeries } from '../engine/session';
  import { go } from './router.svelte';
  import { app } from './state.svelte';

  /** Page d'un palier : titre, explication d'une phrase, « Commencer » ou « Reprendre la série » (R20). */
  let { id }: { id: string } = $props();

  const palier = $derived(loadPaliers().find((p) => p.id === id));
  const rec = $derived(app.progress?.paliers[id]);
  const current = $derived(app.progress?.series);
  const resumable = $derived(current?.palier === id);

  async function begin() {
    if (!palier || !app.progress) return;
    if (resumable) return go('#/serie');
    const r = beginSeries(app.progress, palier, Math.random, Date.now());
    await app.commit(r.progress);
    go('#/serie');
  }
</script>

<main class="screen">
  <button class="back" aria-label="Accueil" onclick={() => go('#/')}>← Accueil</button>
  {#if !palier || !rec?.unlocked && !rec?.validated}
    <p class="hint">Ce palier n'est pas encore débloqué.</p>
  {:else}
    <h1>Palier {palier.id} · {palier.titre}</h1>
    <p class="expl">{palier.explication}</p>
    <ul class="hint list">
      <li>{palier.serie.questions + palier.serie.rappels} questions : {palier.serie.questions} du palier et {palier.serie.rappels} rappels.</li>
      <li>Chaque question : 1. Ancrage (cadence), 2. Écoute{palier.chant ? ', chant de la basse' : ''}, 3. Réponse.</li>
      <li>{palier.reecoutes} réécoutes avant de répondre.</li>
    </ul>
    {#if current && !resumable}
      <p class="warn">La série en cours du palier {current.palier} sera abandonnée.</p>
    {/if}
    <button class="ctl primary" onclick={begin}>{resumable ? 'Reprendre la série' : 'Commencer'}</button>
  {/if}
</main>

<style>
  .screen { max-width: 480px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  .back { align-self: flex-start; min-height: 44px; padding: 0 12px; background: var(--panel); color: var(--fg); }
  h1 { margin: 0; font-size: 24px; }
  .expl { margin: 0; font-size: 18px; line-height: 1.4; }
  .hint { color: var(--muted); font-size: 14px; margin: 0; }
  .list { padding-left: 18px; display: grid; gap: 4px; }
  .warn { margin: 0; color: #f2d13d; font-size: 14px; }
  .ctl { min-height: 56px; background: var(--panel); color: var(--fg); font-size: 18px; }
  .ctl.primary { background: var(--fg); color: var(--bg); font-weight: 600; }
</style>
