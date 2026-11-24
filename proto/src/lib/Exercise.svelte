<script lang="ts">
  import {
    ANSWER_DEGREES, CADENCE, DEGREE_COLORS,
    chordNotes, chordName, randomKey, randomProgression, type Degree,
  } from './theory';
  import { loadPiano, unlock, playSequence, playChord, stop } from './audio';
  import Wheel from './Wheel.svelte';
  import Timeline from './Timeline.svelte';

  type Phase = 'idle' | 'loading' | 'playing' | 'answering' | 'revealed';

  const MAX_REPLAYS = 2;
  const CADENCE_BPM = 90;

  let phase = $state<Phase>('idle');
  let key = $state('C');
  let progression = $state<Degree[]>([]);
  let bpm = $state(80);
  let answer = $state<Degree[]>([]);
  let replays = $state(0);
  let currentIndex = $state(-1);
  let cadenceIndex = $state(-1);
  let stage = $state<'cadence' | 'gap' | 'progression'>('cadence');
  let error = $state('');
  let questionId = 0;

  const canReveal = $derived(phase === 'answering' && answer.length === 4);
  const score = $derived(progression.filter((d, i) => answer[i] === d).length);

  function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  async function newQuestion() {
    const id = ++questionId;
    stop();
    error = '';
    try {
      await unlock();
      if (phase === 'idle') phase = 'loading';
      await loadPiano();
    } catch (e) {
      error = `Chargement du piano impossible : ${String(e)}`;
      phase = 'idle';
      return;
    }
    if (id !== questionId) return;
    key = randomKey();
    progression = randomProgression();
    bpm = 70 + Math.floor(Math.random() * 31);
    answer = [];
    replays = 0;
    currentIndex = -1;
    phase = 'playing';
    stage = 'cadence';
    await playSequence(CADENCE.map((d) => chordNotes(key, d)), CADENCE_BPM, (i) => { cadenceIndex = i; });
    cadenceIndex = -1;
    if (id !== questionId) return;
    stage = 'gap';
    await sleep(1000);
    if (id !== questionId) return;
    stage = 'progression';
    await playProgression();
    if (id !== questionId) return;
    phase = 'answering';
  }

  async function playProgression() {
    await playSequence(
      progression.map((d) => chordNotes(key, d)),
      bpm,
      (i) => { currentIndex = i; },
    );
    currentIndex = -1;
  }

  // préchargement : le premier tap n'attend que le déblocage audio
  loadPiano().catch(() => { /* l'erreur sera affichée au premier tap */ });

  async function replay() {
    await unlock();
    if (phase === 'answering') {
      if (replays >= MAX_REPLAYS) return;
      replays += 1;
      const prev = phase;
      phase = 'playing';
      stage = 'progression';
      await playProgression();
      phase = prev;
    } else if (phase === 'revealed') {
      await playProgression();
    }
  }

  function pick(d: Degree) {
    if (phase !== 'answering' || answer.length >= 4) return;
    answer = [...answer, d];
  }

  function erase() {
    if (phase !== 'answering') return;
    answer = answer.slice(0, -1);
  }

  function reveal() {
    if (!canReveal) return;
    phase = 'revealed';
  }

  function textColor(d: Degree) { return d === 'iii' ? '#111' : '#fff'; }

  /** Réécoute d'un seul accord (après révélation), pour l'ancrer. */
  async function hear(d: Degree) {
    if (phase !== 'revealed') return;
    await unlock();
    playChord(chordNotes(key, d));
  }
</script>

<main>
  <header>
    <span class="title">Oreille · palier E</span>
    {#if phase === 'revealed'}<span class="key">{key} majeur · {bpm} bpm</span>{/if}
  </header>

  <section class="viz">
    {#if phase === 'revealed'}
      <p class="hint small">Tape un accord (case, bloc ou roue) pour le réentendre.</p>
      <Wheel {progression} {currentIndex} onTap={hear} />
      <Timeline {progression} {currentIndex} label="La progression, en {key} majeur" onTap={(i) => hear(progression[i])} />
    {:else if phase === 'playing' && stage === 'cadence'}
      <p class="hint"><strong>1. Ancrage.</strong> Cadence I – IV – V – I : elle installe la tonalité. Le dernier accord est la « maison » (le I).</p>
      <Timeline progression={CADENCE} currentIndex={cadenceIndex} />
    {:else if phase === 'playing' && stage === 'gap'}
      <p class="hint">Tonalité posée. Voici maintenant la progression à identifier…</p>
    {:else if phase === 'playing'}
      <p class="hint"><strong>2. Écoute.</strong> Quatre accords, un par mesure. Situe chacun par rapport à la maison.</p>
      <div class="unknown">
        {#each [0, 1, 2, 3] as i}
          <div class="block" class:current={i === currentIndex}>?</div>
        {/each}
      </div>
    {:else if phase === 'loading'}
      <p class="hint">Chargement du piano…</p>
    {:else if phase === 'answering'}
      <p class="hint"><strong>3. Réponds.</strong> Quels degrés as-tu entendus, dans l'ordre ? Astuce : suis la basse.</p>
    {:else}
      <p class="hint">Casque conseillé.</p>
      <p class="hint small">Chaque question se déroule en trois temps : une cadence I – IV – V – I qui installe la tonalité (l'ancrage), puis quatre accords à identifier par leur degré, puis ta réponse. À la révélation, tu pourras réentendre chaque accord.</p>
    {/if}
    {#if error}<p class="error">{error}</p>{/if}
  </section>

  <section class="slots">
    {#each [0, 1, 2, 3] as i}
      {@const a = answer[i]}
      {@const ok = phase === 'revealed' ? a === progression[i] : null}
      <button class="slot" class:ok={ok === true} class:ko={ok === false}
           style:background={a ? DEGREE_COLORS[a] : 'var(--panel)'}
           style:color={a ? textColor(a) : 'var(--muted)'}
           disabled={phase !== 'revealed'} onclick={() => hear(progression[i])}>
        <span class="deg">{a ?? '·'}</span>
        {#if phase === 'revealed'}
          <span class="truth">{ok ? '✓' : '✗ ' + progression[i]} · {chordName(key, progression[i])}</span>
        {/if}
      </button>
    {/each}
  </section>

  {#if phase === 'revealed'}
    <p class="score">{score} / 4</p>
  {/if}

  {#if phase !== 'revealed'}
    <section class="degrees">
      {#each ANSWER_DEGREES as d}
        <button class="degree" style:background={DEGREE_COLORS[d]} style:color={textColor(d)}
                disabled={phase !== 'answering' || answer.length >= 4} onclick={() => pick(d)}>{d}</button>
      {/each}
    </section>
  {/if}

  <section class="controls" class:two={phase === 'revealed'} class:one={phase === 'idle' || phase === 'loading' || phase === 'playing'}>
    {#if phase === 'revealed'}
      <button class="ctl" onclick={replay}>Réécouter</button>
      <button class="ctl primary" onclick={newQuestion}>Nouvelle question</button>
    {:else if phase === 'idle' || phase === 'loading'}
      <button class="ctl primary wide" disabled={phase === 'loading'} onclick={newQuestion}>Nouvelle question</button>
    {:else if phase === 'playing'}
      <button class="ctl wide" onclick={newQuestion}>Passer (nouvelle question)</button>
    {:else}
      <button class="ctl" disabled={phase !== 'answering' || answer.length === 0} onclick={erase}>Effacer</button>
      <button class="ctl" disabled={phase !== 'answering' || replays >= MAX_REPLAYS} onclick={replay}>
        Réécouter ({MAX_REPLAYS - replays})
      </button>
      <button class="ctl primary" disabled={!canReveal} onclick={reveal}>Révéler</button>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 480px; margin: 0 auto; padding: 12px 16px 24px;
    min-height: 100dvh; display: flex; flex-direction: column; gap: 10px;
  }
  header { display: flex; justify-content: space-between; align-items: baseline; color: var(--muted); font-size: 14px; }
  .title { font-weight: 600; color: var(--fg); }
  .viz { flex: 1; min-height: 110px; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
  .hint { text-align: center; color: var(--muted); font-size: 16px; margin: 0; line-height: 1.35; }
  .hint strong { color: var(--fg); }
  .hint.small { font-size: 13px; }
  .error { color: #ff6b6b; text-align: center; font-size: 14px; }
  .unknown { display: flex; gap: 6px; height: 48px; padding-top: 4px; }
  .unknown .block {
    flex: 1; display: grid; place-items: center; border-radius: 8px;
    background: var(--panel); color: var(--muted); font-weight: 700; font-size: 18px;
    border: 2px solid transparent; transition: transform 100ms ease, border-color 100ms ease;
  }
  .unknown .block.current { transform: translateY(-4px); border-color: #fff; color: var(--fg); }
  .slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .slot {
    height: 56px; border-radius: 12px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; border: 2px solid transparent;
    padding: 0;
  }
  .slot:disabled { opacity: 1; cursor: default; }
  .slot .deg { font-size: 22px; font-weight: 700; }
  .slot .truth { font-size: 11px; opacity: 0.9; white-space: nowrap; }
  .slot.ok { border-color: #fff; }
  .slot.ko { border-color: #ff3b3b; opacity: 0.75; }
  .score { text-align: center; margin: 0; font-size: 20px; font-weight: 600; }
  .degrees { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .degree { height: 54px; font-size: 24px; font-weight: 700; }
  .controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .controls.one { grid-template-columns: 1fr; }
  .controls.two { grid-template-columns: 1fr 1fr; }
  .ctl { height: 52px; background: var(--panel); color: var(--fg); font-size: 16px; }
  .ctl.primary { background: var(--fg); color: var(--bg); font-weight: 600; }
  .ctl.wide { grid-column: 1 / -1; }
</style>
