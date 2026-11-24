<script lang="ts">
  import { net } from './state.svelte';

  /** Bannière : hors ligne et un timbre à samples n'a pas pu se charger (R11). */
</script>

{#if !net.online && net.fallback}
  <p class="offline" role="status">
    Hors ligne : connecte-toi une fois pour charger les sons (piano, guitare). En attendant, les questions sont jouées à la nappe.
  </p>
{/if}

<style>
  .offline {
    margin: 0; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.35;
    background: var(--panel); color: var(--fg); border: 1px solid var(--muted); text-align: center;
  }
</style>
