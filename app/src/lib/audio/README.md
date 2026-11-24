# Moteur audio (Tone.js)

- `instruments.ts` : trois timbres (`piano` Salamander, `guitare` tonejs-instruments guitar-acoustic : D2 A2 D3 A3 D4 A4, `nappe` PolySynth fatsawtooth + passe-bas, sans réseau). Chargement idempotent, échec réessayable.
- `engine.ts` : `unlock`, `playSequence(chords, bpm, timbre, onChord?, beatsPerChord = 4)`, `playChord`, `playNote`, `stop`.
- `stop()` et toute nouvelle `playSequence` RÉSOLVENT la promesse de la séquence annulée : l'appelant doit ignorer la résolution s'il a lancé autre chose entre-temps (voir `runId` dans `routes/dev-audio.svelte`).

## Checklist navigateur (`/#dev-audio`)

- [ ] Les trois timbres se chargent (état « prêt »), erreur réseau -> « Réessayer ».
- [ ] « cadence » joue I-IV-V-I dans chaque timbre.
- [ ] « stop » coupe net, y compris la queue de release.
- [ ] Deux taps rapides sur « accord » ne superposent rien.
- [ ] Relancer « cadence » pendant une cadence remplace l'ancienne, sans accord fantôme.
- [ ] Aucune erreur console.
- [ ] iOS : son audible avec le commutateur silencieux ; verrouiller l'écran en pleine lecture puis revenir : l'UI ne reste pas bloquée.

## Résultats (navigateur intégré, 375x812, Chrome)

- Les trois timbres chargés (états « prêt »), 0 erreur console.
- Cadence lancée dans chaque timbre, `stop` : l'état repasse à « inactif » ; fin naturelle de séquence résolue ; relance en cours de séquence : une seule séquence active, promesse annulée ignorée.
- Non vérifiable sans oreille : qualité sonore, absence de superposition audible, iOS réel (à faire sur appareil).
- Le callback `onChord` (Tone.Draw, rAF) est peu fiable quand le panneau navigateur est masqué ; il ne sert qu'à l'animation.
