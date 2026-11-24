<script lang="ts">
  import { DEGREE_COLORS, type Degree } from './theory';

  let { progression, currentIndex = -1 }: { progression: Degree[]; currentIndex?: number } = $props();
</script>

<div class="timeline">
  {#each progression as d, i}
    <div class="block" class:current={i === currentIndex}
         style:background={DEGREE_COLORS[d]} style:color={d === 'iii' ? '#111' : '#fff'}>{d}</div>
  {/each}
</div>

<style>
  .timeline { display: flex; gap: 6px; height: 48px; padding-top: 4px; }
  .block {
    flex: 1; display: grid; place-items: center;
    border-radius: 8px; font-weight: 700; font-size: 18px;
    border: 2px solid transparent;
    transition: transform 100ms ease, border-color 100ms ease;
  }
  .block.current { transform: translateY(-4px); border-color: #fff; }
</style>
