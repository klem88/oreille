<script lang="ts">
  import DevAudio from './routes/dev-audio.svelte';
  import Exercise from './lib/ui/Exercise.svelte';
  import Home from './lib/ui/Home.svelte';
  import PalierIntro from './lib/ui/PalierIntro.svelte';
  import { router } from './lib/ui/router.svelte';
  import { app } from './lib/ui/state.svelte';

  void app.refresh();
  const route = $derived(router.route);
</script>

{#if route.name === 'dev-audio'}
  <DevAudio />
{:else if !app.progress}
  <main class="boot">{app.error || 'Chargement…'}</main>
{:else if route.name === 'palier'}
  {#key route.id}<PalierIntro id={route.id} />{/key}
{:else if route.name === 'serie'}
  <Exercise />
{:else}
  <Home />
{/if}

<style>
  .boot { padding: 24px; text-align: center; color: var(--muted); }
</style>
