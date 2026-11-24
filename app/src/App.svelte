<script lang="ts">
  import DevAudio from './routes/dev-audio.svelte';

  let hash = $state(location.hash);
  $effect(() => {
    const on = () => { hash = location.hash; };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  });
</script>

{#if hash === '#dev-audio'}
  <DevAudio />
{:else}
  <main>
    <h1>Oreille</h1>
  </main>
{/if}
