<script lang="ts">
  import { Note } from 'tonal';

  /** Clavier SVG : touches du voicing surlignées, basse (note la plus grave) dans la couleur du degré. */
  let {
    notes = [],
    bassColor = '#e4383a',
    range = [48, 83],
    onTap,
  }: { notes?: string[]; bassColor?: string; range?: [number, number]; onTap?: (note: string) => void } = $props();

  const WHITE_W = 14, WHITE_H = 54, BLACK_W = 9, BLACK_H = 32;
  const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

  const keys = $derived(Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i));
  const whites = $derived(keys.filter((m) => !isBlack(m)));
  const whiteIndex = (m: number) => whites.filter((w) => w < m).length;
  const W = $derived(whites.length * WHITE_W);

  const midis = $derived(notes.map((n) => Note.midi(n) ?? -1));
  const bassMidi = $derived(midis.length ? Math.min(...midis) : -1);
  /** Nom de la note jouée pour une touche : celui du voicing s'il y est, sinon en dièses. */
  const noteName = (m: number) => notes.find((n) => Note.midi(n) === m) ?? Note.fromMidiSharps(m);
  const tap = (m: number) => onTap?.(noteName(m));
  const onKey = (m: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap(m);
    }
  };
  const fillFor = (m: number, base: string) => (m === bassMidi ? bassColor : midis.includes(m) ? '#f2f2f5' : base);
</script>

<p class="label">Le voicing joué (basse en couleur)</p>
<svg viewBox="0 0 {W} {WHITE_H}" class="kbd" role="img" aria-label="clavier" data-notes={notes.join(' ')}>
  {#each whites as m (m)}
    <rect x={whiteIndex(m) * WHITE_W} y="0" width={WHITE_W - 1} height={WHITE_H} rx="2" fill={fillFor(m, '#2a2a33')} stroke="#121216" class="key" class:hl={midis.includes(m)} role="button" tabindex={midis.includes(m) ? 0 : -1} aria-label={noteName(m)} data-midi={m} onclick={() => tap(m)} onkeydown={onKey(m)} />
    {#if m % 12 === 0}
      <text x={whiteIndex(m) * WHITE_W + WHITE_W / 2} y={WHITE_H - 4} text-anchor="middle" fill="#8a8a96" font-size="7">C{Math.floor(m / 12) - 1}</text>
    {/if}
  {/each}
  {#each keys.filter(isBlack) as m (m)}
    <rect x={whiteIndex(m) * WHITE_W - BLACK_W / 2} y="0" width={BLACK_W} height={BLACK_H} rx="1.5" fill={fillFor(m, '#0b0b0e')} stroke="#121216" class="key" class:hl={midis.includes(m)} role="button" tabindex={midis.includes(m) ? 0 : -1} aria-label={noteName(m)} data-midi={m} onclick={() => tap(m)} onkeydown={onKey(m)} />
  {/each}
</svg>

<style>
  .label { margin: 0 0 2px; text-align: center; color: var(--muted); font-size: 13px; }
  .kbd { width: 100%; display: block; }
  .key { cursor: pointer; }
  .key:focus-visible { outline: 2px solid #fff; }
</style>
