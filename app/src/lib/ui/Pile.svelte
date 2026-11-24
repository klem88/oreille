<script lang="ts">
  import type { Degree } from '../theory/degree';
  import type { Brick } from './reveal';
  import { degreeStyle, displayNote } from './reveal';

  /**
   * Pile (spec 6.2) : briques empilées de bas en haut dans l'ordre réel du voicing, basse surlignée,
   * guide-tones (tierce, septième) pointés. Qualité → largeur et luminosité (spec 6.1). Chaque brique joue sa note.
   */
  let {
    degree,
    bricks,
    name,
    onTap,
  }: { degree: Degree; bricks: Brick[]; name: string; onTap?: (note: string) => void } = $props();

  const TONE_TEXT: Record<Brick['tone'], string> = { '1': 'fond.', '3': 'tierce', '5': 'quinte', '7': 'septième', '6': 'sixte' };
  const width = $derived(
    degree.quality === 'min' || degree.quality === 'm7' ? 86
      : degree.quality === 'dim' || degree.quality === 'ø7' || degree.quality === '°7' ? 74
      : 100,
  );
  const dark = $derived(['min', 'm7', 'dim', 'ø7', '°7'].includes(degree.quality));
  const reversed = $derived([...bricks].reverse());
</script>

<p class="label">La pile de {degree.label} · {name} (du grave en bas à l'aigu en haut)</p>
<div class="pile" class:dark class:angular={width === 74} class:blur={degree.quality === 'aug'} style:width="{width}%">
  {#each reversed as b, i (i)}
    <button class="brick" class:bass={b.bass} style={degreeStyle(degree)} data-note={b.note} onclick={() => onTap?.(b.note)}>
      <span class="note">{displayNote(b.note)}</span>
      <span class="tone">{TONE_TEXT[b.tone]}{#if b.guide}<span class="guide" title="guide-tone">●</span>{/if}</span>
      {#if b.bass}<span class="tag">basse</span>{/if}
    </button>
  {/each}
</div>

<style>
  .label { margin: 0 0 4px; text-align: center; color: var(--muted); font-size: 13px; }
  .pile { margin: 0 auto; display: flex; flex-direction: column; gap: 3px; max-width: 280px; }
  .brick {
    height: 30px; border-radius: 6px; padding: 0 10px; display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 700; border: 2px solid transparent;
  }
  .pile.dark .brick { filter: brightness(0.78); }
  .pile.angular .brick { border-radius: 0; }
  .pile.blur .brick { box-shadow: 0 0 8px currentColor; }
  .brick.bass { height: 38px; border-color: #fff; filter: none; }
  .note { min-width: 34px; text-align: left; }
  .tone { flex: 1; text-align: left; font-weight: 500; font-size: 13px; }
  .guide { margin-left: 6px; font-size: 12px; }
  .tag { font-size: 11px; font-weight: 600; background: rgba(0, 0, 0, 0.35); padding: 1px 6px; border-radius: 8px; color: #fff; }
</style>
