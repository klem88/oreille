<script lang="ts">
  import type { Palier } from '../content/paliers';
  import type { Answer, Question } from '../engine/question';
  import { parseDegree, type Degree } from '../theory/degree';
  import { BASS_NAMES, degreeStyle, isSeventh } from './reveal';

  /**
   * Pad de réponse selon le type du palier de la question :
   * `degre` → un degré (triades du mode, R7) ; `basse` → quelle note à la basse ;
   * `progression` → saisie séquentielle des degrés avec « Effacer » puis « Valider ».
   */
  let {
    question,
    palier,
    disabled = false,
    onAnswer,
  }: { question: Question; palier: Palier; disabled?: boolean; onAnswer: (a: Answer) => void } = $props();

  const degrees = $derived<Degree[]>(
    (question.mode === 'minor' ? (palier.degresMineur ?? []) : palier.degres).map(parseDegree),
  );
  const expectedCount = $derived(question.stimulus.length);
  const seventh = $derived(isSeventh(question.degrees[0]));
  const BASSES = [1, 3, 5, 7] as const;
  let entry = $state<Degree[]>([]);

  function pick(d: Degree) {
    if (disabled) return;
    if (question.type === 'degre') onAnswer({ kind: 'degre', degree: d.label });
    else if (entry.length < expectedCount) entry = [...entry, d];
  }

  function submit() {
    if (disabled || entry.length !== expectedCount) return;
    onAnswer({ kind: 'progression', degrees: entry.map((d) => d.label) });
  }
</script>

{#if question.type === 'basse'}
  <div class="grid two">
    {#each BASSES as b (b)}
      {#if b !== 7 || seventh}
        <button class="pad neutral" {disabled} onclick={() => onAnswer({ kind: 'basse', bass: b })}>{BASS_NAMES[b]}</button>
      {/if}
    {/each}
  </div>
{:else}
  {#if question.type === 'progression'}
    <p class="count">{expectedCount} accords, dans l'ordre</p>
    <div class="slots">
      {#each Array.from({ length: expectedCount }) as _, i (i)}
        {@const d = entry[i]}
        <div class="slot" style={d ? degreeStyle(d) : ''}>{d?.label ?? '·'}</div>
      {/each}
    </div>
  {/if}
  <div class="grid" class:three={degrees.length > 4} class:four={degrees.length === 4}>
    {#each degrees as d (d.label)}
      <button
        class="pad"
        style={degreeStyle(d)}
        disabled={disabled || (question.type === 'progression' && entry.length >= expectedCount)}
        onclick={() => pick(d)}>{d.label}</button>
    {/each}
  </div>
  {#if question.type === 'progression'}
    <div class="grid two">
      <button class="pad neutral" disabled={disabled || entry.length === 0} onclick={() => (entry = entry.slice(0, -1))}>Effacer</button>
      <button class="pad primary" disabled={disabled || entry.length !== expectedCount} onclick={submit}>Valider</button>
    </div>
  {/if}
{/if}

<style>
  .grid { display: grid; gap: 10px; grid-template-columns: repeat(2, 1fr); }
  .grid.three { grid-template-columns: repeat(3, 1fr); }
  .grid.four { grid-template-columns: repeat(2, 1fr); }
  .pad { min-height: 56px; font-size: 22px; font-weight: 700; }
  .pad.neutral { background: var(--panel); color: var(--fg); font-size: 17px; font-weight: 600; }
  .pad.primary { background: var(--fg); color: var(--bg); font-size: 17px; font-weight: 600; }
  .count { margin: 0; text-align: center; color: var(--muted); font-size: 14px; }
  .slots { display: flex; gap: 8px; justify-content: center; }
  .slot {
    width: 80px; height: 48px; border-radius: 10px; display: grid; place-items: center;
    background: var(--panel); color: var(--muted); font-size: 20px; font-weight: 700;
  }
</style>
