<script lang="ts">
  import { Note } from 'tonal';
  import type { Degree } from '../theory/degree';
  import { colorOf } from '../theory/colors';
  import { displayNote, scaleDegreeOfNote } from './reveal';

  /** Ligne de basse (spec 6.4) : un point par note réelle, degré de la basse dessous ; chaque point rejoue la basse. */
  let {
    basses,
    degrees,
    tonic,
    currentIndex = -1,
    onTap,
  }: {
    basses: string[];
    degrees: Degree[];
    tonic: string;
    currentIndex?: number;
    onTap?: (index: number) => void;
  } = $props();

  const W = 300, H = 76, PAD = 16;
  const midis = $derived(basses.map((b) => Note.midi(b) ?? 48));
  const lo = $derived(Math.min(...midis) - 2);
  const hi = $derived(Math.max(...midis) + 2);
  const x = (i: number) =>
    basses.length === 1 ? W / 2 : PAD + 24 + (i * (W - 2 * (PAD + 24))) / (basses.length - 1);
  const y = (m: number) => H - PAD - 4 - ((m - lo) * (H - 2 * PAD - 8)) / Math.max(1, hi - lo);
  const direction = (i: number) =>
    i === 0 ? '' : midis[i] > midis[i - 1] ? '↗' : midis[i] < midis[i - 1] ? '↘' : '→';
</script>

<p class="label">La basse (degré de la note à la basse)</p>
<svg viewBox="0 0 {W} {H}" class="bass" role="img" aria-label="ligne de basse">
  {#each basses as _, i (i)}
    {#if i > 0}
      <line x1={x(i - 1)} y1={y(midis[i - 1])} x2={x(i)} y2={y(midis[i])} stroke="#8a8a96" stroke-width="2" />
    {/if}
  {/each}
  {#each basses as b, i (i)}
    <g
      role="button"
      tabindex="0"
      class="pt"
      data-bass={b}
      onclick={() => onTap?.(i)}
      onkeydown={(e) => { if (e.key === 'Enter') onTap?.(i); }}
    >
      <circle cx={x(i)} cy={y(midis[i])} r="18" fill="transparent" />
      <circle cx={x(i)} cy={y(midis[i])} r={i === currentIndex ? 10 : 8} fill={colorOf(degrees[i])} stroke={i === currentIndex ? '#fff' : 'none'} stroke-width="2" />
      <text x={x(i)} y={H - 2} text-anchor="middle" fill="#f2f2f5" font-size="12" font-weight="700">{scaleDegreeOfNote(tonic, b)}</text>
      <text x={x(i)} y={y(midis[i]) - 13} text-anchor="middle" fill="#8a8a96" font-size="10">{displayNote(b)} {direction(i)}</text>
    </g>
  {/each}
</svg>

<style>
  .label { margin: 0 0 2px; text-align: center; color: var(--muted); font-size: 13px; }
  .bass { width: 100%; max-width: 300px; display: block; margin: 0 auto; }
  .pt { cursor: pointer; }
  .pt:focus { outline: none; }
</style>
