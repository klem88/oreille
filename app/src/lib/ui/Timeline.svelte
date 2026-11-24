<script lang="ts">
  import type { Degree } from '../theory/degree';
  import { degreeStyle } from './reveal';

  /** Une case colorée par accord ; la case en cours se soulève. Tapable si onTap est fourni. */
  let {
    degrees,
    currentIndex = -1,
    label = '',
    names = [],
    onTap,
  }: {
    degrees: Degree[];
    currentIndex?: number;
    label?: string;
    names?: string[];
    onTap?: (index: number) => void;
  } = $props();
</script>

{#if label}<p class="label">{label}</p>{/if}
<div class="timeline">
  {#each degrees as d, i (i)}
    <button
      class="block"
      class:current={i === currentIndex}
      style={degreeStyle(d)}
      disabled={!onTap}
      onclick={() => onTap?.(i)}
    >
      <span class="deg">{d.label}</span>
      {#if names[i]}<span class="name">{names[i]}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .label { margin: 0 0 4px; text-align: center; color: var(--muted); font-size: 13px; }
  .timeline { display: flex; gap: 6px; padding-top: 4px; }
  .block {
    flex: 1; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    border-radius: 8px; font-weight: 700; font-size: 18px; padding: 2px;
    border: 2px solid transparent;
    transition: transform 100ms ease, border-color 100ms ease;
  }
  .block:disabled { opacity: 1; cursor: default; }
  .block.current { transform: translateY(-4px); border-color: #fff; }
  .name { font-size: 11px; font-weight: 600; opacity: 0.9; }
</style>
