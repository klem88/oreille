<script lang="ts">
  import type { Answer, Question } from '../engine/question';
  import { colorOf } from '../theory/colors';
  import { parseDegree, type Degree, type Step } from '../theory/degree';
  import { chordName } from '../theory/chord';
  import { DEGREE_COLORS } from '../theory/colors';
  import { notesOf, voiceChords } from '../theory/voicing';
  import BassLine from './BassLine.svelte';
  import Keyboard from './Keyboard.svelte';
  import Pile from './Pile.svelte';
  import Timeline from './Timeline.svelte';
  import Wheel from './Wheel.svelte';
  import { tapUnlock, type Player } from './playback.svelte';
  import {
    WHEEL_LABELS, announce, answerText, bricksOf, chordInfo, degreeStyle, displayNote, expectedText, guideTones,
    keyboardRange, scaleDegreeOfNote,
  } from './reveal';

  /** Révélation, après la réponse seulement : résultat, annonce, vues ; tout est tapable et joue (spec 6.6). */
  let {
    question,
    cadenceDegrees,
    gapMs,
    given,
    correct,
    player,
    nextLabel,
    onNext,
  }: {
    question: Question;
    /** Degrés de la cadence d'ancrage jouée avant la question (q.cadence en est le voicing). */
    cadenceDegrees: Degree[];
    /** Silence entre l'ancrage et la question, le même qu'à l'écoute. */
    gapMs: number;
    given: Answer;
    correct: boolean;
    player: Player;
    nextLabel: string;
    onNext: () => void;
  } = $props();

  const q = $derived(question);
  const infos = $derived(q.degrees.map((d) => chordInfo(q.key, q.mode, d)));
  const chords = $derived(q.stimulus.map(notesOf));
  // svelte-ignore state_referenced_locally
  let shown = $state<string[]>(notesOf(question.stimulus[0]));
  // svelte-ignore state_referenced_locally
  let shownColor = $state(colorOf(question.degrees[0]));
  let current = $state(-1);
  /** Accord de la cadence en cours de lecture ou tapé (-1 : aucun). */
  let cadCurrent = $state(-1);
  let playError = $state('');
  const cadNames = $derived(cadenceDegrees.map((d) => chordName(q.key, q.mode, d)));
  const range = $derived(keyboardRange([...chords.flat(), ...shown]));

  function show(i: number) {
    shown = chords[i];
    shownColor = colorOf(q.degrees[i]);
  }

  function hearChord(i: number) {
    tapUnlock();
    show(i);
    current = i;
    cadCurrent = -1;
    player.chord(chords[i], q.timbre);
  }

  function hearBass(i: number) {
    tapUnlock();
    shown = [q.stimulus[i].bass];
    shownColor = colorOf(q.degrees[i]);
    current = i;
    player.note(q.stimulus[i].bass, q.timbre);
  }

  function hearNote(note: string) {
    tapUnlock();
    shown = [note];
    shownColor = colorOf(q.degrees[0]);
    player.note(note, q.timbre);
  }

  /** Touche du clavier : rejoue la note sans changer ce qui est surligné. */
  function hearKey(note: string) {
    tapUnlock();
    player.note(note, q.timbre);
  }

  /** Nœud de la roue : l'accord de la progression s'il y est, sinon le degré diatonique voicé simplement. */
  function hearStep(s: Step) {
    const i = q.degrees.findIndex((d) => d.step === s && !d.secondaryOf);
    if (i >= 0) return hearChord(i);
    tapUnlock();
    const d = parseDegree(WHEEL_LABELS[q.mode][s]);
    const v = voiceChords(q.key, q.mode, [d], () => 0.5)[0];
    shown = notesOf(v);
    shownColor = DEGREE_COLORS[s];
    current = -1;
    player.chord(shown, q.timbre);
  }

  /** Accord de la cadence tapé : on le réentend, en contexte de la tonalité. */
  function hearCadence(i: number) {
    tapUnlock();
    current = -1;
    cadCurrent = i;
    shown = q.cadence[i];
    shownColor = colorOf(cadenceDegrees[i]);
    player.chord(q.cadence[i], q.timbre);
  }

  /** Basse d'un accord de la cadence (la première note du voicing), seule. */
  function hearCadenceBass(i: number) {
    tapUnlock();
    current = -1;
    cadCurrent = i;
    shown = [q.cadence[i][0]];
    shownColor = colorOf(cadenceDegrees[i]);
    player.note(q.cadence[i][0], q.timbre);
  }

  /** Toute la basse de la cadence, au tempo de l'écoute. */
  async function replayCadenceBass() {
    tapUnlock();
    current = -1;
    const seq = q.cadence.map((c) => [c[0]]);
    try {
      const ok = await player.sequence(seq, q.bpm, q.timbre, (i) => {
        cadCurrent = i;
        shown = seq[i];
        shownColor = colorOf(cadenceDegrees[i]);
      }, 2);
      if (ok) cadCurrent = -1;
    } catch (e) {
      playError = `Lecture impossible : ${(e as Error).message}`;
    }
  }

  /** Réécoute en contexte : la cadence d'ancrage (2 temps par accord), le même silence, puis la question. */
  async function replayInContext() {
    tapUnlock();
    current = -1;
    try {
      const cadOk = await player.sequence(q.cadence, q.bpm, q.timbre, (i) => {
        cadCurrent = i;
        shown = q.cadence[i];
        shownColor = colorOf(cadenceDegrees[i]);
      }, 2);
      cadCurrent = -1;
      if (!cadOk || !(await player.wait(gapMs))) return;
      const ok = await player.sequence(chords, q.bpm, q.timbre, (i) => {
        current = i;
        show(i);
      });
      if (ok) current = -1;
    } catch (e) {
      playError = `Lecture impossible : ${(e as Error).message}`;
    }
  }

  /** Guide-tones (tierce, septième) de la question, accord par accord (spec 5.4). */
  async function replayGuides() {
    tapUnlock();
    cadCurrent = -1;
    const seq = q.stimulus.map((v, i) => guideTones(q.key, q.mode, q.degrees[i], v));
    try {
      const ok = await player.sequence(seq, q.bpm, q.timbre, (i) => {
        current = i;
        shown = seq[i];
        shownColor = colorOf(q.degrees[i]);
      });
      if (ok) current = -1; // résolution périmée : un tap plus récent a pris la main
    } catch (e) {
      playError = `Lecture impossible : ${(e as Error).message}`;
    }
  }
</script>

<section class="reveal">
  <div class="result" class:ok={correct} class:ko={!correct}>
    <strong>{correct ? 'Juste !' : 'Raté'}</strong>
    <span>Réponse : {expectedText(q)}</span>
    {#if !correct}<span class="given">Ta réponse : {answerText(given)}</span>{/if}
  </div>

  <ul class="announce">
    {#each infos as info, i (i)}
      <li>
        <button class="chip" class:current={i === current} aria-label={announce(info)} onclick={() => hearChord(i)}>
          <span class="deg" style={degreeStyle(q.degrees[i])}>{info.label}</span>
          <span class="txt"><strong>{info.name}</strong> · {info.fonction} · {info.role}</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="hint">Tape un accord, une brique, un point ou une touche de la roue pour le réentendre.</p>
  <div class="links">
    <button onclick={replayInContext}>Ancrage puis question ▸</button>
    <button onclick={replayGuides}>Guide-tones ▸</button>
  </div>

  <Timeline degrees={cadenceDegrees} names={cadNames} currentIndex={cadCurrent} label="Cadence d'ancrage (le contexte)" onTap={hearCadence} />
  <div class="cadbass" aria-label="Basse de l'ancrage">
    <button class="cadbass-all" onclick={replayCadenceBass}>Basse de l'ancrage ▸</button>
    {#each q.cadence as c, i (i)}
      <button class="cadbass-note" class:current={i === cadCurrent} aria-label="Basse {displayNote(c[0])}" onclick={() => hearCadenceBass(i)}>
        {scaleDegreeOfNote(q.key, c[0])}<small>{displayNote(c[0])}</small>
      </button>
    {/each}
  </div>

  {#if q.type === 'progression'}
    <Wheel degrees={q.degrees} mode={q.mode} currentIndex={current} onTap={hearStep} />
    <Timeline degrees={q.degrees} names={infos.map((x) => x.name)} currentIndex={current} label="La progression, en {q.key} {q.mode === 'major' ? 'majeur' : 'mineur'}" onTap={hearChord} />
  {:else}
    <Pile degree={q.degrees[0]} name={infos[0].name} bricks={bricksOf(q.key, q.mode, q.degrees[0], q.stimulus[0])} onTap={hearNote} />
  {/if}

  <BassLine basses={q.stimulus.map((v) => v.bass)} degrees={q.degrees} tonic={q.key} currentIndex={current} onTap={hearBass} />
  <Keyboard notes={shown} bassColor={shownColor} {range} onTap={hearKey} />
  {#if playError}<p class="error">{playError}</p>{/if}
  <p class="meta">Tonalité : {q.key} {q.mode === 'major' ? 'majeur' : 'mineur'} · {q.bpm} bpm · {q.timbre}</p>

  <div class="actions">
    <button class="ctl primary" onclick={onNext}>{nextLabel}</button>
  </div>
</section>

<style>
  .reveal { display: flex; flex-direction: column; gap: 12px; }
  .result { border-radius: 12px; padding: 10px 12px; display: grid; gap: 2px; text-align: center; background: var(--panel); }
  .result strong { font-size: 20px; }
  .result.ok { box-shadow: inset 0 0 0 2px #4caf50; }
  .result.ko { box-shadow: inset 0 0 0 2px #ff5a5a; }
  .given { color: var(--muted); font-size: 14px; }
  .announce { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .chip {
    width: 100%; min-height: 48px; display: flex; align-items: center; gap: 10px; padding: 4px 8px 4px 4px;
    background: var(--panel); color: var(--fg); text-align: left; border: 2px solid transparent;
  }
  .chip.current { border-color: #fff; }
  .chip .deg { min-width: 56px; height: 40px; border-radius: 8px; display: grid; place-items: center; font-weight: 700; font-size: 17px; padding: 0 6px; }
  .chip .txt { font-size: 14px; line-height: 1.3; }
  .cadbass { display: flex; align-items: center; gap: 6px; margin-top: -6px; }
  .cadbass button { min-height: 48px; background: transparent; color: var(--muted); border: 1px solid #2c2c34; }
  .cadbass-all { font-size: 12px; padding: 0 8px; }
  .cadbass-note { flex: 1; font-size: 14px; font-weight: 700; display: grid; place-items: center; line-height: 1.1; }
  .cadbass-note small { font-size: 10px; font-weight: 400; }
  .cadbass-note.current { border-color: #fff; color: var(--fg); }
  .error { margin: 0; text-align: center; color: #ff6b6b; font-size: 14px; }
  .hint, .meta { margin: 0; text-align: center; color: var(--muted); font-size: 12px; }
  .actions {
    position: sticky; bottom: 0; display: grid;
    padding: 8px 0 12px; background: var(--bg); margin-top: auto;
  }
  .ctl { min-height: 48px; background: var(--panel); color: var(--fg); font-size: 16px; }
  .ctl.primary { background: var(--fg); color: var(--bg); font-weight: 600; }
  .links { display: flex; gap: 6px; margin-top: -4px; }
  .links button {
    flex: 1; min-height: 48px; background: transparent; color: var(--muted);
    border: 1px solid #2c2c34; font-size: 13px;
  }
</style>
