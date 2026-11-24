<script lang="ts">
  import { loadPaliers, PALIER_ORDER, type Palier } from '../content/paliers';
  import { scoreOf, type SeriesState } from '../engine/session';
  import { app } from './state.svelte';

  /** Bilan de fin de série : score sur les questions qui comptent (hors rappels), validation, déblocage. */
  let { series, palier, onAgain, onHome }: { series: SeriesState; palier: Palier; onAgain: () => void; onHome: () => void } = $props();

  const score = $derived(scoreOf(series));
  const pct = $derived(score.total ? Math.round((score.correct / score.total) * 100) : 0);
  const rec = $derived(app.progress?.paliers[palier.id]);
  const nextId = $derived(PALIER_ORDER[PALIER_ORDER.indexOf(palier.id) + 1]);
  const next = $derived(loadPaliers().find((p) => p.id === nextId));
  const nextUnlocked = $derived(!!(nextId && app.progress?.paliers[nextId]?.unlocked));
  const recalls = $derived(series.recall.filter(Boolean).length);
</script>

<main class="screen">
  <h1>Bilan · palier {palier.id}</h1>
  <p class="score" data-score="{score.correct}/{score.total}">{score.correct} / {score.total}</p>
  <p class="hint">{pct} % sur les questions du palier (seuil {Math.round(palier.serie.seuil * 100)} %){recalls ? ` ; ${recalls} rappels non comptés` : ''}.</p>

  {#if rec?.validated}
    <p class="ok">Palier {palier.id} validé.</p>
  {:else}
    <p class="hint">
      Palier non validé : {rec?.consecutiveSeries ?? 0} / {palier.serie.seriesConsecutives} séries consécutives au seuil,
      ou {palier.serie.suiteReussites} réussites d'affilée (actuellement {rec?.streak ?? 0}).
    </p>
  {/if}
  {#if next && nextUnlocked}
    <p class="ok">Palier {next.id} · {next.titre} débloqué.</p>
  {/if}

  <div class="actions">
    <button class="ctl primary" onclick={onAgain}>Encore une série</button>
    <button class="ctl" onclick={onHome}>Accueil</button>
  </div>
</main>

<style>
  .screen { max-width: 480px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 14px; text-align: center; }
  h1 { margin: 0; font-size: 22px; }
  .score { margin: 0; font-size: 56px; font-weight: 700; }
  .hint { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.4; }
  .ok { margin: 0; color: #6fdc8c; font-weight: 600; font-size: 17px; }
  .actions { display: grid; gap: 10px; margin-top: 12px; }
  .ctl { min-height: 52px; background: var(--panel); color: var(--fg); font-size: 17px; }
  .ctl.primary { background: var(--fg); color: var(--bg); font-weight: 600; }
</style>
