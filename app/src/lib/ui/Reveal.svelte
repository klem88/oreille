<script lang="ts">
  import type { Answer, Question } from '../engine/question';
  import { colorOf } from '../theory/colors';
  import { parseDegree, type Step } from '../theory/degree';
  import { DEGREE_COLORS } from '../theory/colors';
  import { notesOf, voiceChords } from '../theory/voicing';
  import BassLine from './BassLine.svelte';
  import Keyboard from './Keyboard.svelte';
  import Pile from './Pile.svelte';
  import Timeline from './Timeline.svelte';
  import Wheel from './Wheel.svelte';
  import { tapUnlock, type Player } from './playback.svelte';
  import {
    WHEEL_LABELS, announce, answerText, bricksOf, chordInfo, degreeStyle, expectedText, guideTones, keyboardRange,
  } from './reveal';

  /** Révélation, après la réponse seulement : résultat, annonce, vues ; tout est tapable et joue (spec 6.6). */
  let {
    question,
    given,
    correct,
    player,
    nextLabel,
    onNext,
  }: {
    question: Question;
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
  const range = $derived(keyboardRange([...chords.flat(), ...shown]));

  function show(i: number) {
    shown = chords[i];
    shownColor = colorOf(q.degrees[i]);
  }

  function hearChord(i: number) {
    tapUnlock();
    show(i);
    current = i;
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

  async function replay(kind: 'stimulus' | 'basse' | 'guides') {
    tapUnlock();
    const seq =
      kind === 'stimulus' ? chords
        : kind === 'basse' ? q.stimulus.map((v) => [v.bass])
        : q.stimulus.map((v, i) => guideTones(q.key, q.mode, q.degrees[i], v));
    await player.sequence(seq, q.bpm, q.timbre, (i) => {
      current = i;
      shown = seq[i];
      shownColor = colorOf(q.degrees[i]);
    });
    current = -1;
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

  {#if q.type === 'progression'}
    <Wheel degrees={q.degrees} mode={q.mode} currentIndex={current} onTap={hearStep} />
    <Timeline degrees={q.degrees} names={infos.map((x) => x.name)} currentIndex={current} label="La progression, en {q.key} {q.mode === 'major' ? 'majeur' : 'mineur'}" onTap={hearChord} />
  {:else}
    <Pile degree={q.degrees[0]} name={infos[0].name} bricks={bricksOf(q.key, q.mode, q.degrees[0], q.stimulus[0])} onTap={hearNote} />
  {/if}

  <BassLine basses={q.stimulus.map((v) => v.bass)} degrees={q.degrees} tonic={q.key} currentIndex={current} onTap={hearBass} />
  <Keyboard notes={shown} bassColor={shownColor} {range} />
  <p class="meta">Tonalité : {q.key} {q.mode === 'major' ? 'majeur' : 'mineur'} · {q.bpm} bpm · {q.timbre}</p>

  <div class="actions">
    <button class="ctl small" onclick={() => replay('basse')}>Réécouter la basse</button>
    <button class="ctl small" onclick={() => replay('guides')}>Réécouter les guide-tones</button>
    <button class="ctl" onclick={() => replay('stimulus')}>Réécouter</button>
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
  .hint, .meta { margin: 0; text-align: center; color: var(--muted); font-size: 12px; }
  .actions {
    position: sticky; bottom: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    padding: 8px 0 12px; background: var(--bg); margin-top: auto;
  }
  .ctl { min-height: 48px; background: var(--panel); color: var(--fg); font-size: 16px; }
  .ctl.small { font-size: 14px; }
  .ctl.primary { background: var(--fg); color: var(--bg); font-weight: 600; }
</style>
