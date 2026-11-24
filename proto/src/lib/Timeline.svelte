<script lang="ts">
  import { DEGREE_COLORS, type Degree } from './theory';

  let {
    progression,
    currentIndex = -1,
    label = '',
    onTap,
  }: {
    progression: Degree[];
    currentIndex?: number;
    label?: string;
    onTap?: (index: number) => void;
  } = $props();
</script>

{#if label}<p class="label">{label}</p>{/if}
<div class="timeline">
  {#each progression as d, i}
    <button class="block" class:current={i === currentIndex} class:tappable={!!onTap}
            style:background={DEGREE_COLORS[d]} style:color={d === 'iii' ? '#111' : '#fff'}
            disabled={!onTap} onclick={() => onTap?.(i)}>{d}</button>
  {/each}
</div>

<style>
  .label { margin: 0 0 4px; text-align: center; color: var(--muted); font-size: 13px; }
  .timeline { display: flex; gap: 6px; height: 48px; padding-top: 4px; }
  .block {
    flex: 1; display: grid; place-items: center;
    border-radius: 8px; font-weight: 700; font-size: 18px;
    border: 2px solid transparent; opacity: 1;
    transition: transform 100ms ease, border-color 100ms ease;
  }
  .block:disabled { opacity: 1; cursor: default; }
  .block.current { transform: translateY(-4px); border-color: #fff; }
</style>
