<script lang="ts">
  import { DEGREE_COLORS, type Degree } from './theory';

  let {
    progression,
    currentIndex = -1,
    onTap,
  }: { progression: Degree[]; currentIndex?: number; onTap?: (degree: Degree) => void } = $props();

  const CX = 150, CY = 150, R = 110;
  // angles en degrés, 0 = droite, sens horaire en SVG (y vers le bas).
  // spec 6.3 : V à droite, IV à gauche ; ii et vi en haut, iii et vii en bas.
  const ANGLES: Record<Degree, number | null> = {
    I: null, V: 0, IV: 180, ii: 300, vi: 240, iii: 60, vii: 120,
  };

  function pos(d: Degree): { x: number; y: number } {
    const a = ANGLES[d];
    if (a === null) return { x: CX, y: CY };
    const rad = (a * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  }

  const points = $derived(progression.map(pos));
  const played = $derived(new Set(progression.slice(0, currentIndex + 1)));
</script>

<svg viewBox="0 0 300 300" class="wheel" role="img" aria-label="roue de gravité tonale">
  <!-- élastique V → I -->
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#8a8a96" />
    </marker>
  </defs>
  <line x1={pos('V').x - 24} y1={pos('V').y} x2={CX + 34} y2={CY}
        stroke="#8a8a96" stroke-width="1.5" stroke-dasharray="3 3" marker-end="url(#arrow)" />

  <!-- fil de la progression -->
  {#each points as p, i}
    {#if i > 0}
      {@const prev = points[i - 1]}
      {@const active = i === currentIndex}
      <line x1={prev.x} y1={prev.y} x2={p.x} y2={p.y}
            stroke={active ? DEGREE_COLORS[progression[i]] : '#5a5a66'}
            stroke-width={active ? 7 : 3}
            stroke-linecap="round"
            class:active />
    {/if}
  {/each}

  <!-- degrés -->
  {#each Object.keys(ANGLES) as d}
    {@const deg = d as Degree}
    {@const p = pos(deg)}
    {@const r = deg === 'I' ? 30 : 22}
    {@const isCurrent = currentIndex >= 0 && progression[currentIndex] === deg}
    {@const wasPlayed = played.has(deg)}
    <g class="node-group" class:tappable={!!onTap} role="button" tabindex="0"
       onclick={() => onTap?.(deg)} onkeydown={(e) => { if (e.key === 'Enter') onTap?.(deg); }}>
      {#if wasPlayed}
        <circle cx={p.x} cy={p.y} r={r + 8} fill={DEGREE_COLORS[deg]} opacity="0.25" />
      {/if}
      <circle cx={p.x} cy={p.y} r={isCurrent ? r + 4 : r} fill={DEGREE_COLORS[deg]}
              stroke={isCurrent ? '#fff' : 'none'} stroke-width="3" class="node" />
      <text x={p.x} y={p.y} text-anchor="middle" dominant-baseline="central"
            fill={deg === 'iii' ? '#111' : '#fff'} font-weight="700" font-size={deg === 'I' ? 22 : 16}>{deg}</text>
    </g>
  {/each}
</svg>

<style>
  .wheel { width: 100%; max-width: 240px; display: block; margin: 0 auto; }
  .node { transition: r 120ms ease; }
  .node-group.tappable { cursor: pointer; }
  .node-group:focus { outline: none; }
  line.active { filter: drop-shadow(0 0 4px rgba(255,255,255,0.5)); }
</style>
