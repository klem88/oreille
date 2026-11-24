<script lang="ts">
  import type { Fonction, Mode } from '../theory/chord';
  import { functionOf } from '../theory/chord';
  import { baseStep, parseDegree, type Degree, type Step } from '../theory/degree';
  import { DEGREE_COLORS } from '../theory/colors';
  import { FUNCTION_COLORS, FUNCTION_HINTS, WHEEL_LABELS, textColorOfStep } from './reveal';

  /** Roue de gravité (spec 6.3) : tonique au centre, fil de la progression, halos et légende de fonction. */
  let {
    degrees,
    mode,
    currentIndex = -1,
    onTap,
  }: { degrees: Degree[]; mode: Mode; currentIndex?: number; onTap?: (step: Step) => void } = $props();

  const CX = 150, CY = 150, R = 110;
  // 0 = droite, sens horaire (y vers le bas) : V à droite, IV à gauche, ii et vi en haut, iii et vii en bas.
  const ANGLES: Record<Step, number | null> = { 1: null, 5: 0, 4: 180, 2: 300, 6: 240, 3: 60, 7: 120 };
  const STEPS: Step[] = [1, 2, 3, 4, 5, 6, 7];
  const FONCTIONS: Fonction[] = ['tonique', 'sous-dominante', 'dominante'];

  function pos(s: Step): { x: number; y: number } {
    const a = ANGLES[s];
    if (a === null) return { x: CX, y: CY };
    const rad = (a * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  }

  /** Libellé du nœud : celui de la progression s'il y figure, sinon la triade diatonique. */
  const labelOf = (s: Step) => degrees.find((d) => baseStep(d) === s)?.label ?? WHEEL_LABELS[mode][s];
  const fnOf = (s: Step) => functionOf(parseDegree(WHEEL_LABELS.major[s]));
  const steps = $derived(degrees.map(baseStep));
  const points = $derived(steps.map(pos));
  const played = $derived(new Set(steps.slice(0, currentIndex + 1)));
  const current = $derived(currentIndex >= 0 ? steps[currentIndex] : null);
  const members = (f: Fonction) => STEPS.filter((s) => fnOf(s) === f).map((s) => WHEEL_LABELS[mode][s]).join(', ');
</script>

<svg viewBox="0 0 300 300" class="wheel" role="img" aria-label="roue de gravité tonale">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#8a8a96" />
    </marker>
  </defs>

  {#each STEPS as s (s)}
    {@const p = pos(s)}
    <circle cx={p.x} cy={p.y} r={s === 1 ? 46 : 36} fill={FUNCTION_COLORS[fnOf(s)]} opacity="0.12" />
  {/each}

  <line x1={pos(5).x - 24} y1={pos(5).y} x2={CX + 34} y2={CY} stroke="#8a8a96" stroke-width="1.5" stroke-dasharray="3 3" marker-end="url(#arrow)" />

  {#each points as p, i (i)}
    {#if i > 0}
      {@const prev = points[i - 1]}
      {@const active = i === currentIndex}
      <line x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={active ? DEGREE_COLORS[steps[i]] : '#6a6a76'} stroke-width={active ? 7 : 3} stroke-linecap="round" marker-end="url(#arrow)" />
    {/if}
  {/each}

  {#each STEPS as s (s)}
    {@const p = pos(s)}
    {@const r = s === 1 ? 30 : 22}
    <g class="node" role="button" tabindex="0" data-step={s} onclick={() => onTap?.(s)} onkeydown={(e) => { if (e.key === 'Enter') onTap?.(s); }}>
      <!-- zone de tap ≥ 48 px à la largeur affichée (240 px pour 300 unités) -->
      <circle cx={p.x} cy={p.y} r={s === 1 ? 36 : 31} fill="transparent" />
      {#if played.has(s)}
        <circle cx={p.x} cy={p.y} r={r + 8} fill={DEGREE_COLORS[s]} opacity="0.3" />
      {/if}
      <circle cx={p.x} cy={p.y} r={current === s ? r + 4 : r} fill={DEGREE_COLORS[s]} stroke={current === s ? '#fff' : 'none'} stroke-width="3" opacity={steps.includes(s) ? 1 : 0.55} />
      <text x={p.x} y={p.y} text-anchor="middle" dominant-baseline="central" fill={textColorOfStep(s)} font-weight="700" font-size={s === 1 ? 20 : 15}>{labelOf(s)}</text>
    </g>
  {/each}
</svg>

<ul class="legend">
  {#each FONCTIONS as f (f)}
    <li><span class="dot" style:background={FUNCTION_COLORS[f]}></span><strong>{f}</strong> : {FUNCTION_HINTS[f]} <span class="who">({members(f)})</span></li>
  {/each}
</ul>

<style>
  .wheel { width: 100%; max-width: 240px; display: block; margin: 0 auto; }
  .node { cursor: pointer; }
  .node:focus { outline: none; }
  .legend { list-style: none; margin: 0; padding: 0; font-size: 12px; color: var(--muted); display: grid; gap: 2px; }
  .legend strong { color: var(--fg); font-weight: 600; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
  .who { opacity: 0.8; }
</style>
