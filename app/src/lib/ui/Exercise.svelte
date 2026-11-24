<script lang="ts">
  import { isLoaded, loadInstrument, preloadSamples, type Timbre } from '../audio/engine';
  import { loadPaliers, PALIER_ORDER } from '../content/paliers';
  import type { Answer } from '../engine/question';
  import { answer, beginSeries, type SeriesState } from '../engine/session';
  import { notesOf } from '../theory/voicing';
  import { parseDegree } from '../theory/degree';
  import Bilan from './Bilan.svelte';
  import DegreePad from './DegreePad.svelte';
  import Reveal from './Reveal.svelte';
  import Timeline from './Timeline.svelte';
  import { Player, tapUnlock } from './playback.svelte';
  import { go } from './router.svelte';
  import Offline from './Offline.svelte';
  import { app, net } from './state.svelte';

  type Phase = 'ready' | 'loading' | 'loadError' | 'cadence' | 'gap' | 'stimulus' | 'chant' | 'answer' | 'reveal' | 'bilan';

  const GAP_MS = 700;
  /** Au-delà, le timbre à samples est abandonné (réseau muet) ; le chargement continue en arrière-plan. */
  const LOAD_TIMEOUT_MS = 8000;

  function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('délai dépassé')), ms);
      p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
    });
  }
  const paliers = loadPaliers();
  const player = new Player();

  let series = $state.raw<SeriesState | null>(app.progress?.series ?? null);
  // svelte-ignore state_referenced_locally
  let qIndex = $state(series?.index ?? 0);
  let phase = $state<Phase>('ready');
  let interrupted = $state(false);
  let cadIdx = $state(-1);
  let stimIdx = $state(-1);
  let replaysUsed = $state(0);
  let given = $state.raw<Answer | null>(null);
  let correct = $state(false);
  let done = $state(false);
  let error = $state('');
  /** Information neutre (pas une erreur) : repli à la nappe. */
  let notice = $state('');
  /** Timbre réellement joué : celui de la question, ou « nappe » en repli (hors ligne / échec de chargement). */
  let tb = $state<Timbre | null>(null);
  /** Jeton de question : un chargement ou une lecture d'une question quittée est ignoré. */
  let qToken = 0;

  const q = $derived(series ? series.questions[qIndex] : null);
  const qp = $derived(q && tb && tb !== q.timbre ? { ...q, timbre: tb } : q);
  const qPalier = $derived(q ? paliers.find((p) => p.id === q.palier)! : null);
  const seriesPalier = $derived(series ? paliers.find((p) => p.id === series!.palier)! : null);
  const isRecall = $derived(series ? series.recall[qIndex] : false);
  const cadenceDegrees = $derived(
    q && qPalier ? (q.mode === 'major' ? qPalier.cadence : qPalier.cadenceMineur).map(parseDegree) : [],
  );
  const stimulus = $derived(q ? q.stimulus.map(notesOf) : []);
  const replaysLeft = $derived(qPalier ? qPalier.reecoutes - replaysUsed : 0);
  const target = $derived(
    !qPalier ? '' : qPalier.type === 'basse' ? 'la note de basse à identifier'
      : q && q.stimulus.length > 1 ? `les ${q.stimulus.length} accords à identifier` : "l'accord à identifier",
  );
  const listening = $derived(phase === 'cadence' || phase === 'gap' || phase === 'stimulus');

  $effect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return;
      if (listening) {
        player.cancel();
        interrupted = true;
      } else if (player.active) {
        player.cancel();
        stimIdx = -1;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      qToken += 1; // un chargement en cours ne doit plus lancer la lecture après la sortie
      player.cancel();
    };
  });

  /** Le palier suivant était-il déjà débloqué avant cette série ? (le bilan n'annonce que les nouveaux déblocages) */
  const nextOf = (id: string) => PALIER_ORDER[PALIER_ORDER.indexOf(id) + 1];
  // svelte-ignore state_referenced_locally
  let nextWasUnlocked = $state(!!(series && app.progress?.paliers[nextOf(series.palier)]?.unlocked));

  function reset() {
    qToken += 1;
    player.cancel();
    interrupted = false;
    cadIdx = -1;
    stimIdx = -1;
    replaysUsed = 0;
    given = null;
    error = '';
    notice = '';
    tb = null;
  }

  /** Premier tap (ou « Suivante ») : charge le timbre si besoin, puis ancrage → écoute. */
  async function startQuestion() {
    reset();
    if (!q) return;
    const token = qToken;
    tb = q.timbre;
    net.fallback = false;
    if (!isLoaded(q.timbre)) {
      phase = 'loading';
      let failure = '';
      // toujours tenter le chargement : hors ligne, le service worker sert les samples du cache
      try {
        await withTimeout(loadInstrument(q.timbre), LOAD_TIMEOUT_MS);
      } catch (e) {
        failure = (e as Error)?.message ?? String(e);
      }
      if (token !== qToken) return;
      if (failure) {
        // repli : la nappe (synthèse locale) est toujours disponible, jamais de chargement sans fin
        try {
          await loadInstrument('nappe');
        } catch (e) {
          if (token !== qToken) return;
          error = `Chargement du son (${q.timbre}) impossible : ${(e as Error)?.message ?? String(e)}`;
          phase = 'loadError';
          return;
        }
        if (token !== qToken) return;
        tb = 'nappe';
        net.fallback = true;
        if (navigator.onLine !== false) notice = `Son ${q.timbre} encore en chargement : cette question est jouée à la nappe.`;
      } else {
        net.fallback = false;
      }
      if (document.visibilityState === 'hidden') {
        // page masquée pendant le chargement : ne pas jouer, proposer la reprise
        phase = 'cadence';
        interrupted = true;
        return;
      }
    }
    preloadSamples();
    await runCadence();
  }

  async function guarded(run: () => Promise<boolean>): Promise<boolean> {
    const token = qToken;
    try {
      return await run();
    } catch (e) {
      if (token !== qToken) return false; // rejet d'une question déjà quittée
      error = `Lecture impossible : ${(e as Error).message}`;
      phase = 'loadError';
      return false;
    }
  }

  async function runCadence() {
    if (!q) return;
    phase = 'cadence';
    const ok = await guarded(() => player.sequence(q.cadence, q.bpm, tb ?? q.timbre, (i) => (cadIdx = i), 2));
    cadIdx = -1;
    if (!ok) return;
    phase = 'gap';
    if (!(await player.wait(GAP_MS))) return;
    await runStimulus();
  }

  async function runStimulus() {
    if (!q) return;
    phase = 'stimulus';
    const ok = await guarded(() => player.sequence(stimulus, q.bpm, tb ?? q.timbre, (i) => (stimIdx = i), 4));
    stimIdx = -1;
    if (ok) afterListen();
  }

  function afterListen() {
    phase = qPalier?.chant ? 'chant' : 'answer';
  }

  function start() {
    tapUnlock();
    void startQuestion();
  }

  /** « Passer » : coupe la lecture et passe à l'étape suivante. */
  function skip() {
    tapUnlock();
    interrupted = false;
    if (phase === 'cadence' || phase === 'gap') {
      player.cancel();
      cadIdx = -1;
      void runStimulus();
    } else if (phase === 'stimulus') {
      player.cancel();
      stimIdx = -1;
      afterListen();
    } else {
      player.cancel();
      stimIdx = -1;
    }
  }

  function resume() {
    tapUnlock();
    interrupted = false;
    if (phase === 'stimulus') void runStimulus();
    else void runCadence();
  }

  async function replay() {
    if (!q || replaysLeft <= 0 || player.active) return;
    tapUnlock();
    replaysUsed += 1;
    await guarded(() => player.sequence(stimulus, q.bpm, tb ?? q.timbre, (i) => (stimIdx = i), 4));
    stimIdx = -1;
  }

  async function replayBass() {
    if (!q || player.active) return;
    tapUnlock();
    await guarded(() => player.sequence(q.stimulus.map((v) => [v.bass]), q.bpm, tb ?? q.timbre, (i) => (stimIdx = i), 4));
    stimIdx = -1;
  }

  async function onAnswer(a: Answer) {
    if (phase !== 'answer' || !series || !app.progress) return;
    player.cancel();
    stimIdx = -1;
    try {
      const r = answer(app.progress, series, a, Date.now());
      given = a;
      correct = r.correct;
      done = r.done;
      series = r.series;
      phase = 'reveal';
      await app.commit(r.progress);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function next() {
    tapUnlock();
    player.cancel();
    if (!series) return;
    if (done) {
      phase = 'bilan';
      return;
    }
    qIndex = series.index;
    window.scrollTo(0, 0);
    void startQuestion();
  }

  let starting = $state(false);

  async function again() {
    if (starting || !seriesPalier || !app.progress) return;
    starting = true;
    tapUnlock();
    try {
      const r = beginSeries(app.progress, seriesPalier, Math.random, Date.now());
      nextWasUnlocked = !!r.progress.paliers[nextOf(seriesPalier.id)]?.unlocked;
      await app.commit(r.progress);
      series = r.series;
      qIndex = 0;
      done = false;
      void startQuestion();
    } finally {
      starting = false;
    }
  }
</script>

{#if !series || !q || !qPalier || !seriesPalier}
  <main class="screen">
    <p class="hint">Aucune série en cours.</p>
    <button class="ctl primary" onclick={() => go('#/')}>Accueil</button>
  </main>
{:else if phase === 'bilan'}
  <Bilan series={series} palier={seriesPalier} busy={starting} {nextWasUnlocked} onAgain={again} onHome={() => go('#/')} />
{:else}
  <main class="screen" class:revealed={phase === 'reveal'}>
    <header>
      <button class="back" aria-label="Accueil" onclick={() => go('#/')}>←</button>
      <span class="title">Palier {seriesPalier.id} · {seriesPalier.titre}</span>
      <span class="counter">
        {#if isRecall}<span class="tag">rappel</span>{/if}
        question {qIndex + 1} / {series.questions.length}
      </span>
    </header>
    {#if app.error}<p class="error">{app.error}</p>{/if}
    <Offline />

    {#if phase === 'reveal' && given}
      <Reveal question={qp ?? q} {cadenceDegrees} gapMs={GAP_MS} {given} {correct} {player} nextLabel={done ? 'Bilan' : 'Suivante'} onNext={next} />
    {:else}
      <section class="step">
        {#if phase === 'ready'}
          <h2>Prêt ?</h2>
          <p class="hint">Casque conseillé. Une cadence installe la tonalité (l'ancrage), puis {target}.</p>
        {:else if phase === 'loading'}
          <h2>Chargement du son…</h2>
          <p class="hint">{q.timbre}</p>
        {:else if phase === 'loadError'}
          <h2>Problème de son</h2>
          <p class="error">{error}</p>
        {:else if phase === 'cadence' || phase === 'gap'}
          <h2>1. Ancrage</h2>
          <p class="hint">La cadence installe la tonalité ; le dernier accord est la maison. Ce n'est pas la réponse.</p>
        {:else if phase === 'stimulus'}
          <h2>2. Écoute</h2>
          <p class="hint">{q.stimulus.length > 1 ? 'Les accords à identifier, un par mesure.' : "L'accord à identifier."} Situe-le par rapport à la maison.</p>
        {:else if phase === 'chant'}
          <h2>Chante la basse</h2>
          <p class="hint">Chante la note la plus grave, puis vérifie-toi avec la basse seule. Rien n'est noté.</p>
        {:else}
          <h2>3. Réponds</h2>
          <p class="hint">
            {#if q.type === 'basse'}Quelle note est à la basse ?{:else if q.type === 'progression'}Quels degrés, dans l'ordre ? Suis la basse.{:else}Quel degré as-tu entendu ?{/if}
          </p>
        {/if}
      </section>

      <section class="viz">
        {#if phase === 'cadence' || phase === 'gap'}
          <Timeline degrees={cadenceDegrees} currentIndex={cadIdx} label="Cadence d'ancrage" />
        {:else if phase === 'stimulus' || phase === 'chant' || phase === 'answer'}
          <div class="unknown">
            {#each q.stimulus as _, i (i)}
              <div class="block" class:current={i === stimIdx}>?</div>
            {/each}
          </div>
        {/if}
        {#if interrupted}
          <button class="ctl primary" onclick={resume}>Reprendre l'écoute</button>
        {/if}
        {#if notice && phase !== 'loadError'}<p class="notice">{notice}</p>{/if}
        {#if error && phase !== 'loadError'}<p class="error">{error}</p>{/if}
      </section>

      {#if phase === 'chant'}
        <section class="chant">
          <button class="ctl" disabled={player.active} onclick={replayBass}>Rejouer la basse seule</button>
          <button class="ctl primary" onclick={() => { player.cancel(); stimIdx = -1; phase = 'answer'; }}>J'ai chanté</button>
        </section>
      {:else if phase !== 'ready' && phase !== 'loading' && phase !== 'loadError'}
        {#key q.id}
          <DegreePad question={q} palier={qPalier} disabled={phase !== 'answer'} onAnswer={onAnswer} />
        {/key}
      {/if}

      <section class="controls">
        {#if phase === 'ready'}
          <button class="ctl primary" onclick={start}>Écouter</button>
        {:else if phase === 'loading'}
          <button class="ctl" disabled>Chargement…</button>
        {:else if phase === 'loadError'}
          <button class="ctl primary" onclick={start}>Réessayer</button>
        {:else if listening || player.active}
          <button class="ctl" onclick={skip}>Passer</button>
        {:else}
          <button class="ctl" disabled={replaysLeft <= 0} onclick={replay}>Réécouter ({replaysLeft})</button>
        {/if}
      </section>
    {/if}
  </main>
{/if}

<style>
  .screen {
    max-width: 480px; margin: 0 auto; padding: 8px 16px 0; min-height: 100dvh;
    display: flex; flex-direction: column; gap: 12px;
  }
  header { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
  .back { width: 48px; height: 48px; background: var(--panel); color: var(--fg); font-size: 20px; flex: none; }
  .title { flex: 1; color: var(--fg); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .counter { white-space: nowrap; }
  .tag { font-size: 11px; border: 1px solid var(--muted); border-radius: 8px; padding: 0 6px; margin-right: 4px; }
  .step h2 { margin: 0 0 4px; font-size: 22px; text-align: center; }
  .hint { margin: 0; text-align: center; color: var(--muted); font-size: 15px; line-height: 1.35; }
  .notice { color: var(--muted); text-align: center; font-size: 14px; margin: 0; }
  .error { color: #ff6b6b; text-align: center; font-size: 14px; margin: 0; }
  .viz { flex: 1; min-height: 64px; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
  .unknown { display: flex; gap: 8px; justify-content: center; }
  .unknown .block {
    width: 72px; height: 52px; display: grid; place-items: center; border-radius: 8px;
    background: var(--panel); color: var(--muted); font-weight: 700; font-size: 20px;
    border: 2px solid transparent; transition: transform 100ms ease, border-color 100ms ease;
  }
  .unknown .block.current { transform: translateY(-4px); border-color: #fff; color: var(--fg); }
  .chant { display: grid; gap: 10px; }
  .controls { position: sticky; bottom: 0; display: grid; padding: 8px 0 12px; background: var(--bg); }
  .ctl { min-height: 52px; background: var(--panel); color: var(--fg); font-size: 17px; }
  .ctl.primary { background: var(--fg); color: var(--bg); font-weight: 600; }
</style>
